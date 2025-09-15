/**
 * StudyGroupChat - Real-time chat functionality for study groups using Supabase Realtime
 * Based on Supabase UI Library realtime chat patterns with database integration
 */

import React from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata?: any;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface ChatParticipant {
  user_id: string;
  name: string;
  avatar?: string;
  is_online: boolean;
  last_seen?: string;
}

export class StudyGroupChat {
  private channel: RealtimeChannel | null = null;
  private conversationId: string;
  private currentUserId: string;
  private onMessageReceived?: (message: ChatMessage) => void;
  private onParticipantStatusChanged?: (participant: ChatParticipant) => void;
  private onTypingChanged?: (userId: string, isTyping: boolean) => void;

  constructor(
    conversationId: string,
    currentUserId: string,
    callbacks?: {
      onMessageReceived?: (message: ChatMessage) => void;
      onParticipantStatusChanged?: (participant: ChatParticipant) => void;
      onTypingChanged?: (userId: string, isTyping: boolean) => void;
    }
  ) {
    this.conversationId = conversationId;
    this.currentUserId = currentUserId;
    this.onMessageReceived = callbacks?.onMessageReceived;
    this.onParticipantStatusChanged = callbacks?.onParticipantStatusChanged;
    this.onTypingChanged = callbacks?.onTypingChanged;
  }

  /**
   * Connect to the real-time chat channel
   */
  async connect(): Promise<void> {
    if (this.channel) {
      console.warn('Chat already connected');
      return;
    }

    if (!supabase) {
      console.error('Supabase client not available for chat connection');
      return;
    }

    try {
      // Create a channel for this conversation
      this.channel = supabase.channel(`chat:${this.conversationId}`, {
        config: {
          presence: {
            key: this.currentUserId,
          },
        },
      });

      // Listen for new messages
      this.channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${this.conversationId}`,
          },
          (payload) => {
            this.handleNewMessage(payload.new as any);
          }
        )
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(key, leftPresences);
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          this.handleTypingEvent(payload);
        });

      // Subscribe to the channel
      const status = await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to chat channel');
          
          // Track presence
          await this.channel?.track({
            user_id: this.currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

      if (status === 'CHANNEL_ERROR') {
        throw new Error('Failed to connect to chat channel');
      }
    } catch (error) {
      console.error('Error connecting to chat:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the chat channel
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
      console.log('Disconnected from chat channel');
    }
  }

  /**
   * Send a message to the chat
   */
  async sendMessage(content: string, messageType: 'text' | 'image' | 'file' = 'text', metadata?: any): Promise<ChatMessage> {
    if (!supabase) {
      throw new Error('Database unavailable');
    }

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: this.conversationId,
          sender_id: this.currentUserId,
          content,
          message_type: messageType,
          metadata
        })
        .select(`
          *,
          profiles!messages_sender_id_fkey(name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      return {
        ...message,
        sender_name: message.profiles?.name,
        sender_avatar: message.profiles?.avatar_url
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Load chat history
   */
  async loadMessages(limit: number = 50, before?: string): Promise<ChatMessage[]> {
    if (!supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey(name, avatar_url)
        `)
        .eq('conversation_id', this.conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('Error loading messages:', error);
        throw new Error('Failed to load messages');
      }

      return (messages || []).map(message => ({
        ...message,
        sender_name: message.profiles?.name,
        sender_avatar: message.profiles?.avatar_url
      })).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error in loadMessages:', error);
      throw error;
    }
  }

  /**
   * Get chat participants
   */
  async getParticipants(): Promise<ChatParticipant[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles!conversation_participants_user_id_fkey(name, avatar_url)
        `)
        .eq('conversation_id', this.conversationId);

      if (error) {
        console.error('Error loading participants:', error);
        throw new Error('Failed to load participants');
      }

      return (participants || []).map(participant => ({
        user_id: participant.user_id,
        name: participant.profiles?.name || 'Unknown',
        avatar: participant.profiles?.avatar_url,
        is_online: false, // Will be updated by presence
      }));
    } catch (error) {
      console.error('Error in getParticipants:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(isTyping: boolean): Promise<void> {
    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: this.currentUserId,
          is_typing: isTyping,
        },
      });
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageId?: string): Promise<void> {
    if (!supabase) {
      return;
    }

    try {
      // Update read status for the user
      const { error } = await supabase
        .from('conversation_participants')
        .update({
          last_read_at: new Date().toISOString()
        })
        .eq('conversation_id', this.conversationId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error marking as read:', error);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }

  private async handleNewMessage(messageData: any): Promise<void> {
    // Don't handle our own messages (they're handled by the send response)
    if (messageData.sender_id === this.currentUserId) {
      return;
    }

    if (!supabase) {
      return;
    }

    try {
      // Fetch sender info
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('clerk_user_id', messageData.sender_id)
        .single();

      const message: ChatMessage = {
        ...messageData,
        sender_name: profile?.name || 'Unknown',
        sender_avatar: profile?.avatar_url
      };

      if (this.onMessageReceived) {
        this.onMessageReceived(message);
      }
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  }

  private handlePresenceSync(): void {
    const state = this.channel?.presenceState();
    // Handle presence sync - update online status of all participants
    if (this.onParticipantStatusChanged) {
      Object.keys(state || {}).forEach(userId => {
        if (userId !== this.currentUserId) {
          this.onParticipantStatusChanged?.({
            user_id: userId,
            name: 'Unknown', // Would need to fetch from profiles
            is_online: true
          });
        }
      });
    }
  }

  private handlePresenceJoin(key: string, newPresences: any[]): void {
    if (key !== this.currentUserId && this.onParticipantStatusChanged) {
      this.onParticipantStatusChanged({
        user_id: key,
        name: 'Unknown', // Would need to fetch from profiles
        is_online: true
      });
    }
  }

  private handlePresenceLeave(key: string, leftPresences: any[]): void {
    if (key !== this.currentUserId && this.onParticipantStatusChanged) {
      this.onParticipantStatusChanged({
        user_id: key,
        name: 'Unknown', // Would need to fetch from profiles
        is_online: false
      });
    }
  }

  private handleTypingEvent(payload: any): void {
    const { user_id, is_typing } = payload.payload;
    if (user_id !== this.currentUserId && this.onTypingChanged) {
      this.onTypingChanged(user_id, is_typing);
    }
  }
}

// Export a hook for easier use in React components
export function useStudyGroupChat(
  conversationId: string | null,
  currentUserId: string,
  callbacks?: {
    onMessageReceived?: (message: ChatMessage) => void;
    onParticipantStatusChanged?: (participant: ChatParticipant) => void;
    onTypingChanged?: (userId: string, isTyping: boolean) => void;
  }
) {
  const [chat, setChat] = React.useState<StudyGroupChat | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId || !currentUserId) {
      return;
    }

    const chatInstance = new StudyGroupChat(conversationId, currentUserId, callbacks);
    setChat(chatInstance);

    const connect = async () => {
      try {
        await chatInstance.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect to chat:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      chatInstance.disconnect();
      setIsConnected(false);
    };
  }, [conversationId, currentUserId]);

  return {
    chat,
    isConnected,
    sendMessage: chat?.sendMessage.bind(chat),
    loadMessages: chat?.loadMessages.bind(chat),
    getParticipants: chat?.getParticipants.bind(chat),
    sendTyping: chat?.sendTyping.bind(chat),
    markAsRead: chat?.markAsRead.bind(chat)
  };
}
