import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import * as CryptoJS from 'crypto-js';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import type { Database, Json } from '@/types/database';

type Db = Database;
type Supabase = SupabaseClient<Db>;
type MessageRow = Db['public']['Tables']['messages']['Row'];
type MessageInsert = Db['public']['Tables']['messages']['Insert'];

export type ClerkGetToken = (opts?: { template?: string }) => Promise<string | null>;

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  conversation_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  thread_id?: string;
  reply_to_id?: string;
  edited_at?: string;
  deleted_at?: string;
  metadata: Record<string, unknown>;
  encrypted: boolean;
  delivery_status: 'sent' | 'delivered' | 'read';
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  conversation_type: 'direct' | 'group';
  name?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  metadata: Record<string, unknown>;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  role: 'member' | 'admin' | 'owner';
  muted: boolean;
  profile?: {
    clerk_user_id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface TypingIndicator {
  id: string;
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  updated_at: string;
  expires_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface MessageWithDetails extends Message {
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
  read_receipts?: Array<{
    user_id: string;
    read_at: string;
  }>;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size?: number;
  }>;
}

export type ConversationSubscriptionCallbacks = {
  onMessage?: (message: Message) => void;
  onTyping?: (typing: TypingIndicator[]) => void;
  onReaction?: (reaction: MessageReaction) => void;
  onMessageUpdate?: (message: Message) => void;
};

const LOG_PREFIX = '[MessagingService]';

function logError(context: string, error: unknown, extra: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  if (process.env.NODE_ENV === 'development') {
    console.error(`${LOG_PREFIX}/${context}`, message, { error, ...extra });
  }
}

export class MessagingService {
  private readonly getJwt: () => Promise<string | null>;
  private supabase: Supabase;
  private readonly channels = new Map<string, RealtimeChannel>();
  private readonly encryptionKey = process.env.NEXT_PUBLIC_MESSAGING_ENCRYPTION_KEY || '';
  private readonly typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(getToken?: ClerkGetToken) {
    this.getJwt = getToken ? wrapClerkTokenForSupabase(getToken) : async () => null;
    const client = createAuthenticatedSupabaseClient(this.getJwt);
    if (!client) {
      throw new Error(`${LOG_PREFIX} Supabase is not configured (missing URL or anon key).`);
    }
    this.supabase = client as Supabase;
  }

  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      throw new Error(`${LOG_PREFIX} Encryption requested but NEXT_PUBLIC_MESSAGING_ENCRYPTION_KEY is not set.`);
    }
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      return encryptedText;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private mapRowToMessage(row: MessageRow): Message {
    const encrypted = Boolean(row.encrypted);
    const content = encrypted ? this.decrypt(row.content) : row.content;
    return {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      conversation_id: row.conversation_id ?? undefined,
      content,
      message_type: (row.message_type as Message['message_type']) || 'text',
      thread_id: row.thread_id ?? undefined,
      reply_to_id: row.reply_to_id ?? undefined,
      edited_at: row.edited_at ?? undefined,
      deleted_at: row.deleted_at ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      encrypted,
      delivery_status: (row.delivery_status as Message['delivery_status']) || 'sent',
      created_at: row.created_at || new Date().toISOString(),
      read: Boolean(row.read),
    };
  }

  private mapJoinedToMessageWithDetails(raw: Record<string, unknown>): MessageWithDetails {
    const row = raw as MessageRow & {
      sender?: unknown;
      reactions?: unknown;
      read_receipts?: unknown;
      attachments?: unknown;
    };
    const base = this.mapRowToMessage(row);
    return {
      ...base,
      sender: Array.isArray(row.sender)
        ? (row.sender[0] as MessageWithDetails['sender'])
        : (row.sender as MessageWithDetails['sender']),
      reactions: Array.isArray(row.reactions) ? (row.reactions as MessageReaction[]) : [],
      read_receipts: Array.isArray(row.read_receipts)
        ? (row.read_receipts as MessageWithDetails['read_receipts'])
        : [],
      attachments: Array.isArray(row.attachments)
        ? (row.attachments as MessageWithDetails['attachments'])
        : [],
    };
  }

  private async syncRealtimeAuth(): Promise<void> {
    const token = await this.getJwt();
    const rt = this.supabase.realtime as unknown as { setAuth?: (jwt: string) => void };
    if (token && typeof rt.setAuth === 'function') {
      rt.setAuth(token);
    }
  }

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('get_or_create_direct_conversation', {
        user1_id: userId1,
        user2_id: userId2,
      });
      if (error) throw error;
      return data as string;
    } catch (error) {
      logError('getOrCreateDirectConversation', error, { userId1, userId2 });
      throw error;
    }
  }

  async createGroupConversation(
    name: string,
    userId: string,
    description?: string,
    studyGroupId?: string,
  ): Promise<string> {
    try {
      const metadata: Json =
        studyGroupId != null && studyGroupId !== ''
          ? { study_group_id: studyGroupId }
          : {};
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          name,
          description,
          created_by: userId,
          conversation_type: 'group',
          metadata,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } catch (error) {
      logError('createGroupConversation', error, { name, userId, description });
      throw error;
    }
  }

  async addConversationParticipant(conversationId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('conversation_participants').insert({
        conversation_id: conversationId,
        user_id: userId,
      });
      if (error) throw error;
    } catch (error) {
      logError('addConversationParticipant', error, { conversationId, userId });
      throw error;
    }
  }

  async sendMessage(params: {
    userId: string;
    recipientId?: string;
    content: string;
    messageType?: Message['message_type'];
    conversationId?: string;
    replyToId?: string;
    encrypted?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const {
      userId,
      recipientId,
      content,
      messageType = 'text',
      conversationId,
      replyToId,
      encrypted = false,
      metadata = {},
    } = params;

    try {
      let finalConversationId = conversationId;
      if (!finalConversationId) {
        if (!recipientId) {
          throw new Error('Either conversationId or recipientId must be provided.');
        }
        finalConversationId = await this.getOrCreateDirectConversation(userId, recipientId);
      }

      if (encrypted && !this.encryptionKey) {
        throw new Error('Encrypted messages require NEXT_PUBLIC_MESSAGING_ENCRYPTION_KEY.');
      }
      const finalContent = encrypted ? this.encrypt(content) : content;

      const messageToInsert: MessageInsert = {
        sender_id: userId,
        recipient_id: recipientId ?? userId,
        conversation_id: finalConversationId,
        content: finalContent,
        message_type: messageType,
        reply_to_id: replyToId,
        encrypted,
        metadata: metadata as MessageInsert['metadata'],
        delivery_status: 'sent',
      };

      const { data, error } = await this.supabase.from('messages').insert(messageToInsert).select().single();
      if (error) throw error;

      await this.updateTypingIndicator(finalConversationId, userId, false);
      return this.mapRowToMessage(data as MessageRow);
    } catch (error) {
      logError('sendMessage', error, { userId, conversationId, recipientId });
      throw error;
    }
  }

  async getMessages(
    conversationId: string,
    requestingUserId?: string,
    limit = 50,
    offset = 0,
  ): Promise<MessageWithDetails[]> {
    try {
      if (requestingUserId) {
        const { data: conversationData, error: convError } = await this.supabase
          .from('conversations')
          .select('id, metadata')
          .eq('id', conversationId)
          .single();
        if (convError) throw convError;

        const metadata = conversationData?.metadata as Record<string, unknown> | null;
        const studyGroupId = (metadata?.study_group_id ?? metadata?.group_id) as string | undefined;
        if (studyGroupId) {
          const { data: memberData, error: memberError } = await this.supabase
            .from('study_group_members')
            .select('id')
            .eq('group_id', studyGroupId)
            .eq('user_id', requestingUserId)
            .single();
          if (memberError || !memberData) {
            throw new Error('Access denied: You must be a member of this group to view messages');
          }
        } else {
          const { data: participantData, error: participantError } = await this.supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', requestingUserId)
            .single();
          if (participantError || !participantData) {
            throw new Error('Access denied: You are not a participant in this conversation');
          }
        }
      }

      const { data, error } = await this.supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url),
          reactions:message_reactions(*),
          read_receipts:message_read_receipts(*),
          attachments:message_attachments(*)
        `,
        )
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).map((row) => this.mapJoinedToMessageWithDetails(row as Record<string, unknown>));
    } catch (error) {
      logError('getMessages', error, { conversationId });
      throw error;
    }
  }

  async getConversations(userId: string): Promise<
    (Conversation & {
      participants: ConversationParticipant[];
      last_message?: Message;
      unread_count: number;
    })[]
  > {
    try {
      const { data: convParticipants, error: convParticipantsError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);
      if (convParticipantsError) throw convParticipantsError;

      const conversationIds = convParticipants.map((p) => p.conversation_id);
      if (conversationIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from('conversations')
        .select(
          `
          *,
          participants:conversation_participants(
            *,
            profile:profiles!conversation_participants_user_id_fkey(
              clerk_user_id,
              full_name,
              avatar_url
            )
          )
        `,
        )
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return await Promise.all(
        (data || []).map(async (conv: Record<string, unknown>) => {
          const convTyped = conv as unknown as Conversation & {
            participants: ConversationParticipant[];
            id: string;
          };
          const { data: lastMessageData, error: lastMessageError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convTyped.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lastMessageError) {
            logError('getConversations/lastMessage', lastMessageError, { conversationId: convTyped.id });
          }

          const lastRow = lastMessageData?.[0] as MessageRow | undefined;
          const last_message = lastRow ? this.mapRowToMessage(lastRow) : undefined;

          const userParticipant = convTyped.participants.find((p) => p.user_id === userId);
          const lastReadAt = userParticipant?.last_read_at;

          const { count: unreadCount } = await this.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convTyped.id)
            .neq('sender_id', userId)
            .is('deleted_at', null)
            .gt('created_at', lastReadAt || '1970-01-01');

          return {
            ...convTyped,
            last_message,
            unread_count: unreadCount || 0,
          };
        }),
      );
    } catch (error) {
      logError('getConversations', error, { userId });
      throw error;
    }
  }

  async updateTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const timeoutKey = `${userId}-${conversationId}`;
    const existingTimeout = this.typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(timeoutKey);
    }

    try {
      await this.supabase.rpc('update_typing_indicator', {
        user_uuid: userId,
        conversation_uuid: conversationId,
        typing: isTyping,
      });
    } catch (error) {
      logError('updateTypingIndicator', error, { conversationId, userId });
    }

    if (isTyping) {
      const timeout = setTimeout(() => {
        void this.updateTypingIndicator(conversationId, userId, false);
      }, 8000);
      this.typingTimeouts.set(timeoutKey, timeout);
    }
  }

  async addReaction(messageId: string, userId: string, reactionType: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('message_reactions').upsert({
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType,
      });
      if (error) throw error;
    } catch (error) {
      logError('addReaction', error, { messageId, userId });
      throw error;
    }
  }

  async removeReaction(messageId: string, userId: string, reactionType: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType);
      if (error) throw error;
    } catch (error) {
      logError('removeReaction', error, { messageId, userId });
      throw error;
    }
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await this.supabase.rpc('mark_message_as_read', {
        message_uuid: messageId,
        reader_id: userId,
      });
    } catch (error) {
      logError('markMessageAsRead', error, { messageId, userId });
    }
  }

  async editMessage(messageId: string, newContent: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          content: newContent,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', userId);
      if (error) throw error;
    } catch (error) {
      logError('editMessage', error, { messageId });
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId);
      if (error) throw error;
    } catch (error) {
      logError('deleteMessage', error, { messageId });
      throw error;
    }
  }

  subscribeToConversation(conversationId: string, callbacks: ConversationSubscriptionCallbacks): () => void {
    this.unsubscribeFromConversation(conversationId);
    const channelName = `conversation-${conversationId}`;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = this.mapRowToMessage(payload.new as MessageRow);
          callbacks.onMessage?.(message);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = this.mapRowToMessage(payload.new as MessageRow);
          callbacks.onMessageUpdate?.(message);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const { data } = await this.supabase
            .from('typing_indicators')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .gt('expires_at', new Date().toISOString());
          callbacks.onTyping?.((data as TypingIndicator[]) || []);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const row = (payload.new || payload.old) as MessageReaction | null;
          if (!row?.message_id) return;
          const { data: msg, error } = await this.supabase
            .from('messages')
            .select('conversation_id')
            .eq('id', row.message_id)
            .maybeSingle();
          if (error || !msg || msg.conversation_id !== conversationId) return;
          if (payload.new) callbacks.onReaction?.(payload.new as MessageReaction);
        },
      );

    void this.syncRealtimeAuth().then(() => {
      channel.subscribe();
    });

    this.channels.set(conversationId, channel);
    return () => this.unsubscribeFromConversation(conversationId);
  }

  unsubscribeFromConversation(conversationId: string): void {
    const ch = this.channels.get(conversationId);
    if (ch) {
      void this.supabase.removeChannel(ch);
      this.channels.delete(conversationId);
    }
  }

  async searchMessages(query: string, conversationId?: string): Promise<MessageWithDetails[]> {
    try {
      let queryBuilder = this.supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url)
        `,
        )
        .textSearch('content', query)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return (data || []).map((row) => {
        const m = this.mapJoinedToMessageWithDetails(row as Record<string, unknown>);
        return { ...m, reactions: [], read_receipts: [], attachments: [] };
      });
    } catch (error) {
      logError('searchMessages', error, { query, conversationId });
      throw error;
    }
  }

  cleanup(): void {
    for (const t of this.typingTimeouts.values()) {
      clearTimeout(t);
    }
    this.typingTimeouts.clear();
    for (const id of [...this.channels.keys()]) {
      this.unsubscribeFromConversation(id);
    }
  }
}
