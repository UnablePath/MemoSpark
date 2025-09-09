import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../supabase/client';
import { Database } from '@/types/database';
import * as CryptoJS from 'crypto-js';
import { useAuth } from '@clerk/nextjs';

// Types for messaging
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
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
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

export class MessagingService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private channels: Map<string, RealtimeChannel> = new Map();
  private encryptionKey = process.env.NEXT_PUBLIC_MESSAGING_ENCRYPTION_KEY || 'default-key';
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private getToken?: () => Promise<string | null>;

  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken;
    this.supabase = getAuthenticatedClient(getToken);
  }

  // Encryption utilities
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private logError(context: string, error: any, additionalInfo: Record<string, any> = {}) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(
      `Error in MessagingService/${context}:`, 
      errorMessage, 
      {
        errorObject: error,
        ...additionalInfo
      }
    );
  }

  // Get or create direct conversation between two users
  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('get_or_create_direct_conversation', {
        user1_id: userId1,
        user2_id: userId2
      });

      if (error) throw error;
      return data as string;
    } catch (error) {
      this.logError('getOrCreateDirectConversation', error, { userId1, userId2 });
      throw error;
    }
  }

  // Create a group conversation
  async createGroupConversation(name: string, userId: string, description?: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          name,
          description,
          created_by: userId,
          conversation_type: 'group',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      this.logError('createGroupConversation', error, { name, userId, description });
      throw error;
    }
  }

  // Add a participant to a conversation
  async addConversationParticipant(conversationId: string, userId: string): Promise<void> {
    try {
      // This is a simplified version. You might want to handle roles and other details.
      const { error } = await this.supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
        });
      if (error) throw error;
    } catch (error) {
      this.logError('addConversationParticipant', error, { conversationId, userId });
      throw error;
    }
  }

  // Send a message
  async sendMessage({
    userId,
    recipientId,
    content,
    messageType = 'text',
    conversationId,
    replyToId,
    encrypted = false,
    metadata = {}
  }: {
    userId: string;
    recipientId?: string; // Make recipientId optional
    content: string;
    messageType?: Message['message_type'];
    conversationId?: string;
    replyToId?: string;
    encrypted?: boolean;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    try {
      // Determine conversationId
      let finalConversationId = conversationId;
      if (!finalConversationId) {
        if (!recipientId) {
          throw new Error('Either conversationId or recipientId must be provided.');
        }
        finalConversationId = await this.getOrCreateDirectConversation(userId, recipientId);
      }

      // Encrypt content if requested
      const finalContent = encrypted ? this.encrypt(content) : content;

      const messageToInsert: Database['public']['Tables']['messages']['Insert'] = {
        sender_id: userId,
        conversation_id: finalConversationId,
        content: finalContent,
        message_type: messageType,
        reply_to_id: replyToId,
        encrypted,
        metadata,
        delivery_status: 'sent',
      };

      if (recipientId) {
        messageToInsert.recipient_id = recipientId;
      }

      // Insert message
      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageToInsert)
        .select()
        .single();

      if (error) throw error;

      // Clear typing indicator after sending
      await this.updateTypingIndicator(finalConversationId, userId, false);

      return data as Message;
    } catch (error) {
      this.logError('sendMessage', error, { userId, conversationId, recipientId });
      throw error;
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId: string, requestingUserId?: string, limit = 50, offset = 0): Promise<MessageWithDetails[]> {
    try {
      // If requesting user is provided, verify they have access to this conversation
      if (requestingUserId) {
        const { data: conversationData, error: convError } = await this.supabase
          .from('conversations')
          .select('id, metadata')
          .eq('id', conversationId)
          .single();

        if (convError) throw convError;

        // Check if this is a study group conversation
        const metadata = conversationData?.metadata as Record<string, any> | null;
        if (metadata && metadata.study_group_id) {
          // Verify user is a member of the study group
          const { data: memberData, error: memberError } = await this.supabase
            .from('study_group_members')
            .select('id')
            .eq('group_id', metadata.study_group_id)
            .eq('user_id', requestingUserId)
            .single();

          if (memberError || !memberData) {
            throw new Error('Access denied: You must be a member of this group to view messages');
          }
        } else {
          // For direct conversations, check if user is a participant
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
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url),
          reactions:message_reactions(*),
          read_receipts:message_read_receipts(*),
          attachments:message_attachments(*)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Decrypt encrypted messages and transform to MessageWithDetails
      const decryptedMessages = data?.map(message => ({
        id: message.id,
        sender_id: message.sender_id,
        recipient_id: message.recipient_id,
        conversation_id: message.conversation_id,
        content: message.encrypted ? this.decrypt(message.content) : message.content,
        message_type: message.message_type || 'text',
        thread_id: message.thread_id,
        reply_to_id: message.reply_to_id,
        edited_at: message.edited_at,
        deleted_at: message.deleted_at,
        metadata: message.metadata || {},
        encrypted: message.encrypted || false,
        delivery_status: message.delivery_status || 'sent',
        created_at: message.created_at || new Date().toISOString(),
        read: message.read || false,
        sender: Array.isArray(message.sender) ? message.sender[0] : message.sender,
        reactions: Array.isArray(message.reactions) ? message.reactions : [],
        read_receipts: Array.isArray(message.read_receipts) ? message.read_receipts : [],
        attachments: Array.isArray(message.attachments) ? message.attachments : []
      })) || [];

      return decryptedMessages as MessageWithDetails[];
    } catch (error) {
      this.logError('getMessages', error, { conversationId });
      throw error;
    }
  }

  // Get user's conversations
  async getConversations(userId: string): Promise<(Conversation & { 
    participants: ConversationParticipant[];
    last_message?: Message;
    unread_count: number;
  })[]> {
    try {
      // Step 1: Get all conversation_ids for the user.
      const { data: convParticipants, error: convParticipantsError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (convParticipantsError) throw convParticipantsError;
      
      const conversationIds = convParticipants.map(p => p.conversation_id);
      
      if (conversationIds.length === 0) {
        return [];
      }

      // Step 2: Fetch the conversations using the collected IDs.
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            profile:profiles!conversation_participants_user_id_fkey(
              clerk_user_id,
              full_name,
              avatar_url
            )
          )
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process conversations to add last message and unread count
      const processedConversations = await Promise.all(
        (data || []).map(async (conv: any) => {
          // Get last message - remove .single() to prevent errors on conversations with no messages
          const { data: lastMessageData, error: lastMessageError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lastMessageError) {
            this.logError('getConversations/lastMessage', lastMessageError, { conversationId: conv.id });
          }

          const lastMessage = lastMessageData && lastMessageData.length > 0 ? lastMessageData[0] : null;

          // Get unread count
          const userParticipant = conv.participants.find((p: any) => p.user_id === userId);
          const lastReadAt = userParticipant?.last_read_at;

          const { count: unreadCount } = await this.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .is('deleted_at', null)
            .gt('created_at', lastReadAt || '1970-01-01');

          return {
            ...conv,
            last_message: lastMessage,
            unread_count: unreadCount || 0
          };
        })
      );

      return processedConversations;
    } catch (error) {
      this.logError('getConversations', error, { userId });
      throw error;
    }
  }

  // Update typing indicator
  async updateTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      // Clear existing timeout
      const timeoutKey = `${userId}-${conversationId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      // Update typing indicator
      await this.supabase.rpc('update_typing_indicator', {
        user_uuid: userId,
        conversation_uuid: conversationId,
        typing: isTyping
      });

      // Set auto-cleanup timeout if typing
      if (isTyping) {
        const timeout = setTimeout(() => {
          this.updateTypingIndicator(conversationId, userId, false);
        }, 8000); // Auto-stop typing after 8 seconds
        this.typingTimeouts.set(timeoutKey, timeout);
      }
    } catch (error) {
      this.logError('updateTypingIndicator', error, { conversationId, userId });
    }
  }

  // Add reaction to message
  async addReaction(messageId: string, userId: string, reactionType: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: userId,
          reaction_type: reactionType
        });

      if (error) throw error;
    } catch (error) {
      this.logError('addReaction', error, { messageId, userId });
      throw error;
    }
  }

  // Remove reaction from message
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
      this.logError('removeReaction', error, { messageId, userId });
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await this.supabase.rpc('mark_message_as_read', {
        message_uuid: messageId,
        reader_id: userId
      });
    } catch (error) {
      this.logError('markMessageAsRead', error, { messageId, userId });
    }
  }

  // Edit message
  async editMessage(messageId: string, newContent: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          content: newContent,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      this.logError('editMessage', error, { messageId });
      throw error;
    }
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      this.logError('deleteMessage', error, { messageId });
      throw error;
    }
  }

  // Subscribe to real-time updates for a conversation
  subscribeToConversation(
    conversationId: string,
    callbacks: {
      onMessage?: (message: Message) => void;
      onTyping?: (typing: TypingIndicator[]) => void;
      onReaction?: (reaction: MessageReaction) => void;
      onMessageUpdate?: (message: Message) => void;
    }
  ): () => void {
    const channelName = `conversation-${conversationId}`;
    
    // Unsubscribe from existing channel if it exists
    this.unsubscribeFromConversation(conversationId);

    const channel = this.supabase
      .channel(channelName)
      // Messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const message = payload.new as Message;
          // Decrypt if encrypted
          if (message.encrypted) {
            message.content = this.decrypt(message.content);
          }
          callbacks.onMessage?.(message);
        }
      )
      // Message updates (edits, deletions)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const message = payload.new as Message;
          // Decrypt if encrypted
          if (message.encrypted) {
            message.content = this.decrypt(message.content);
          }
          callbacks.onMessageUpdate?.(message);
        }
      )
      // Typing indicators
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        async () => {
          // Fetch current typing indicators
          const { data } = await this.supabase
            .from('typing_indicators')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .gt('expires_at', new Date().toISOString());
          
          callbacks.onTyping?.(data as TypingIndicator[] || []);
        }
      )
      // Reactions
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          callbacks.onReaction?.(payload.new as MessageReaction);
        }
      )
      .subscribe();

    this.channels.set(conversationId, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromConversation(conversationId);
  }

  // Unsubscribe from conversation updates
  unsubscribeFromConversation(conversationId: string): void {
    const channel = this.channels.get(conversationId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(conversationId);
    }
  }

  // Search messages
  async searchMessages(query: string, conversationId?: string): Promise<MessageWithDetails[]> {
    try {
      let queryBuilder = this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(clerk_user_id, full_name, avatar_url)
        `)
        .textSearch('content', query)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Decrypt encrypted messages and transform to MessageWithDetails
      const decryptedMessages = data?.map(message => ({
        id: message.id,
        sender_id: message.sender_id,
        recipient_id: message.recipient_id,
        conversation_id: message.conversation_id,
        content: message.encrypted ? this.decrypt(message.content) : message.content,
        message_type: message.message_type || 'text',
        thread_id: message.thread_id,
        reply_to_id: message.reply_to_id,
        edited_at: message.edited_at,
        deleted_at: message.deleted_at,
        metadata: message.metadata || {},
        encrypted: message.encrypted || false,
        delivery_status: message.delivery_status || 'sent',
        created_at: message.created_at || new Date().toISOString(),
        read: message.read || false,
        sender: Array.isArray(message.sender) ? message.sender[0] : message.sender
      })) || [];

      return decryptedMessages as MessageWithDetails[];
    } catch (error) {
      this.logError('searchMessages', error, { query, conversationId });
      throw error;
    }
  }

  // Cleanup method
  cleanup(): void {
    // Clear all typing timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Unsubscribe from all channels
    this.channels.forEach((_, conversationId) => {
      this.unsubscribeFromConversation(conversationId);
    });
  }
}

// Hook to create an instance with Clerk authentication
export function useMessagingService() {
  const { getToken } = useAuth();
  return new MessagingService(getToken);
}

// Export singleton instance
export const messagingService = new MessagingService(); 