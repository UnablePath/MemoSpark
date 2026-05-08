import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { isLikelyAtRestCiphertext } from '@/lib/messaging/atRestEnvelopeShared';
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
  onReaction?: (reaction: MessageReaction, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onMessageUpdate?: (message: Message) => void;
};

const LOG_PREFIX = '[MessagingService]';

function logError(context: string, error: unknown, extra: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`${LOG_PREFIX} ${context} failed:`, {
    message,
    error,
    ...extra,
    timestamp: new Date().toISOString()
  });
}

export class MessagingService {
  private readonly getJwt: () => Promise<string | null>;
  private supabase: Supabase;
  private readonly channels = new Map<string, RealtimeChannel>();
  private readonly typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(getToken?: ClerkGetToken) {
    this.getJwt = getToken ? wrapClerkTokenForSupabase(getToken) : async () => null;
    const client = createAuthenticatedSupabaseClient(this.getJwt);
    if (!client) {
      throw new Error(`${LOG_PREFIX} Supabase is not configured (missing URL or anon key).`);
    }
    this.supabase = client as Supabase;
  }

  private mapRowToMessage(row: MessageRow): Message {
    const storedEncrypted =
      Boolean(row.encrypted) || isLikelyAtRestCiphertext(row.content ?? '');
    let displayContent = row.content ?? '';
    if (typeof window !== 'undefined' && isLikelyAtRestCiphertext(displayContent)) {
      displayContent = 'Open chat to read this message.';
    }
    return {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      conversation_id: row.conversation_id ?? undefined,
      content: displayContent,
      message_type: (row.message_type as Message['message_type']) || 'text',
      thread_id: row.thread_id ?? undefined,
      reply_to_id: row.reply_to_id ?? undefined,
      edited_at: row.edited_at ?? undefined,
      deleted_at: row.deleted_at ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      encrypted: storedEncrypted,
      delivery_status: (row.delivery_status as Message['delivery_status']) || 'sent',
      created_at: row.created_at || new Date().toISOString(),
      read: Boolean(row.read),
    };
  }

  private mapApiRecordToMessageWithDetails(raw: Record<string, unknown>): MessageWithDetails {
    const senderRaw = raw.sender as Record<string, unknown> | undefined;
    const sender: MessageWithDetails['sender'] = senderRaw
      ? {
          id: String(senderRaw.id ?? ''),
          full_name: senderRaw.full_name as string | undefined,
          avatar_url: senderRaw.avatar_url as string | undefined,
        }
      : undefined;
    return {
      id: String(raw.id),
      sender_id: String(raw.sender_id),
      recipient_id: String(raw.recipient_id ?? ''),
      conversation_id: raw.conversation_id ? String(raw.conversation_id) : undefined,
      content: String(raw.content ?? ''),
      message_type: (raw.message_type as Message['message_type']) || 'text',
      thread_id: raw.thread_id ? String(raw.thread_id) : undefined,
      reply_to_id: raw.reply_to_id ? String(raw.reply_to_id) : undefined,
      edited_at: raw.edited_at ? String(raw.edited_at) : undefined,
      deleted_at: raw.deleted_at ? String(raw.deleted_at) : undefined,
      metadata: (raw.metadata as Record<string, unknown>) || {},
      encrypted: Boolean(raw.encrypted),
      delivery_status: (raw.delivery_status as Message['delivery_status']) || 'sent',
      created_at: String(raw.created_at ?? new Date().toISOString()),
      read: Boolean(raw.read),
      sender,
      reactions: Array.isArray(raw.reactions) ? (raw.reactions as MessageReaction[]) : [],
      read_receipts: Array.isArray(raw.read_receipts)
        ? (raw.read_receipts as MessageWithDetails['read_receipts'])
        : [],
      attachments: Array.isArray(raw.attachments)
        ? (raw.attachments as MessageWithDetails['attachments'])
        : [],
    };
  }

  private async sendMessageViaHttp(params: {
    id?: string;
    userId: string;
    recipientId?: string;
    content: string;
    messageType?: Message['message_type'];
    conversationId?: string;
    replyToId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const {
      id,
      userId,
      recipientId,
      content,
      messageType = 'text',
      conversationId,
      replyToId,
      metadata = {},
    } = params;

    let finalConversationId = conversationId;
    if (!finalConversationId) {
      if (!recipientId) {
        throw new Error('Either conversationId or recipientId must be provided.');
      }
      finalConversationId = await this.getOrCreateDirectConversation(userId, recipientId);
    }

    const res = await fetch('/api/messages', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: finalConversationId,
        content,
        messageType,
        metadata,
        id,
        replyToId,
        recipientId: recipientId ?? null,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: Record<string, unknown>;
    };
    if (!res.ok) {
      throw new Error(
        typeof json.error === 'string'
          ? json.error
          : "Couldn't save this message. Try again.",
      );
    }

    await this.updateTypingIndicator(finalConversationId, userId, false);
    if (!json.message) {
      throw new Error("Couldn't save this message. Try again.");
    }
    const withDetails = this.mapApiRecordToMessageWithDetails(json.message);
    return withDetails;
  }

  private async getMessagesViaHttp(
    conversationId: string,
    limit: number,
    offset: number,
    notBefore?: string,
  ): Promise<MessageWithDetails[]> {
    const params = new URLSearchParams({
      conversationId,
      limit: String(limit),
      offset: String(offset),
    });
    if (notBefore) params.set('notBefore', notBefore);

    const res = await fetch(`/api/messages?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      messages?: Record<string, unknown>[];
    };

    if (!res.ok) {
      throw new Error(
        typeof json.error === 'string'
          ? json.error
          : "Couldn't load messages right now. Try again.",
      );
    }

    const rows = Array.isArray(json.messages) ? json.messages : [];
    return rows.map((r) => this.mapApiRecordToMessageWithDetails(r));
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

      // Pass userId as p_user_id and include p_description
      const { data, error } = await this.supabase.rpc('create_group_chat_atomic', {
        p_name: name,
        p_user_id: userId,
        p_description: description || null,
        p_metadata: metadata,
        p_study_group_id: studyGroupId || null,
      });

      if (error) throw error;
      return data as string;
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
    id?: string;
    userId: string;
    recipientId?: string;
    content: string;
    messageType?: Message['message_type'];
    conversationId?: string;
    replyToId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const {
      id,
      userId,
      recipientId,
      content,
      messageType = 'text',
      conversationId,
      replyToId,
      metadata = {},
    } = params;

    try {
      if (typeof window !== 'undefined') {
        return await this.sendMessageViaHttp(params);
      }

      let finalConversationId = conversationId;
      if (!finalConversationId) {
        if (!recipientId) {
          throw new Error('Either conversationId or recipientId must be provided.');
        }
        finalConversationId = await this.getOrCreateDirectConversation(userId, recipientId);
      }

      const messageToInsert: MessageInsert = {
        ...(id ? { id } : {}),
        sender_id: userId,
        recipient_id: recipientId ?? null,
        conversation_id: finalConversationId,
        content,
        message_type: messageType,
        reply_to_id: replyToId,
        encrypted: false,
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

  /**
   * Ensure a study group member is registered in conversation_participants so that
   * the messages RLS policy (which checks conversation_participants) allows reads.
   * Uses a SECURITY DEFINER RPC to bypass RLS on the insert safely.
   */
  async ensureGroupChatParticipant(conversationId: string, clerkUserId: string): Promise<void> {
    try {
      await this.supabase.rpc('ensure_group_chat_participant', {
        _conversation_id: conversationId,
        _clerk_user_id: clerkUserId,
      });
    } catch (err) {
      console.error('[messaging:ensureGroupChatParticipant]', err);
    }
  }

  async getMessages(
    conversationId: string,
    requestingUserId?: string,
    limit = 50,
    offset = 0,
    /** ISO date string: only return messages on or after this timestamp (for history visibility) */
    notBefore?: string,
  ): Promise<MessageWithDetails[]> {
    try {
      if (typeof window !== 'undefined') {
        return await this.getMessagesViaHttp(conversationId, limit, offset, notBefore);
      }

      let query = this.supabase
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
        .order('created_at', { ascending: false });

      if (notBefore) {
        query = query.gte('created_at', notBefore);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row) => this.mapJoinedToMessageWithDetails(row as Record<string, unknown>));
    } catch (error) {
      logError('getMessages', error, { conversationId, requestingUserId });
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
        { 
          event: '*', 
          schema: 'public', 
          table: 'message_reactions',
          filter: `conversation_id=eq.${conversationId}` // Now works thanks to the new column
        },
        (payload) => {
          const eventType = payload.eventType;
          const reaction = (payload.new || payload.old) as MessageReaction;
          
          if (reaction) {
            callbacks.onReaction?.(reaction, eventType as 'INSERT' | 'DELETE');
          }
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
