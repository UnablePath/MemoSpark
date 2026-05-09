export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      achievement_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          hidden: boolean | null
          icon: string | null
          id: string
          name: string
          points: number | null
          rarity: string | null
          repeatable: boolean | null
          requirements: Json
          reward: Json | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          hidden?: boolean | null
          icon?: string | null
          id?: string
          name: string
          points?: number | null
          rarity?: string | null
          repeatable?: boolean | null
          requirements: Json
          reward?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          hidden?: boolean | null
          icon?: string | null
          id?: string
          name?: string
          points?: number | null
          rarity?: string | null
          repeatable?: boolean | null
          requirements?: Json
          reward?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          created_at: string
          criteria: Json
          description: string
          icon: string | null
          id: string
          name: string
          points_reward: number
          type: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          description: string
          icon?: string | null
          id?: string
          name: string
          points_reward?: number
          type: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points_reward?: number
          type?: string
        }
        Relationships: []
      }
      ai_collaborative_insights: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          insight_data: Json
          insight_type: string
          is_active: boolean | null
          relevance_score: number | null
          user_cluster: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data: Json
          insight_type: string
          is_active?: boolean | null
          relevance_score?: number | null
          user_cluster?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          is_active?: boolean | null
          relevance_score?: number | null
          user_cluster?: string | null
        }
        Relationships: []
      }
      ai_embeddings: {
        Row: {
          created_at: string | null
          embedding_type: string
          embedding_vector: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          embedding_type: string
          embedding_vector?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          embedding_type?: string
          embedding_vector?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_pattern_data: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          pattern_data: Json
          pattern_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          pattern_data: Json
          pattern_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          pattern_data?: Json
          pattern_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_suggestion_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          suggestion_context: Json | null
          suggestion_id: string
          suggestion_title: string
          suggestion_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          suggestion_context?: Json | null
          suggestion_id: string
          suggestion_title: string
          suggestion_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          suggestion_context?: Json | null
          suggestion_id?: string
          suggestion_title?: string
          suggestion_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          ai_requests_count: number | null
          clerk_user_id: string
          created_at: string | null
          feature_usage: Json | null
          id: string
          reset_at: string | null
          updated_at: string | null
          usage_date: string
        }
        Insert: {
          ai_requests_count?: number | null
          clerk_user_id: string
          created_at?: string | null
          feature_usage?: Json | null
          id?: string
          reset_at?: string | null
          updated_at?: string | null
          usage_date?: string
        }
        Update: {
          ai_requests_count?: number | null
          clerk_user_id?: string
          created_at?: string | null
          feature_usage?: Json | null
          id?: string
          reset_at?: string | null
          updated_at?: string | null
          usage_date?: string
        }
        Relationships: []
      }
      ai_user_profiles: {
        Row: {
          created_at: string | null
          difficulty_preference: number | null
          id: string
          is_anonymous: boolean | null
          learning_style: string
          preferences_vector: string | null
          subject_interests: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty_preference?: number | null
          id?: string
          is_anonymous?: boolean | null
          learning_style?: string
          preferences_vector?: string | null
          subject_interests?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty_preference?: number | null
          id?: string
          is_anonymous?: boolean | null
          learning_style?: string
          preferences_vector?: string | null
          subject_interests?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coin_balances: {
        Row: {
          current_balance: number
          last_updated: string | null
          lifetime_earned: number
          lifetime_spent: number
          user_id: string
        }
        Insert: {
          current_balance?: number
          last_updated?: string | null
          lifetime_earned?: number
          lifetime_spent?: number
          user_id: string
        }
        Update: {
          current_balance?: number
          last_updated?: string | null
          lifetime_earned?: number
          lifetime_spent?: number
          user_id?: string
        }
        Relationships: []
      }
      coin_bonus_events: {
        Row: {
          bonus_amount: number | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_active: boolean | null
          multiplier: number
          name: string
          start_date: string | null
        }
        Insert: {
          bonus_amount?: number | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          multiplier?: number
          name: string
          start_date?: string | null
        }
        Update: {
          bonus_amount?: number | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          multiplier?: number
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      coin_spending_categories: {
        Row: {
          base_cost: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          unlock_requirements: Json | null
        }
        Insert: {
          base_cost?: number
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          unlock_requirements?: Json | null
        }
        Update: {
          base_cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          unlock_requirements?: Json | null
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source: string
          transaction_type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          muted: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          conversation_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crashout_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          post_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crashout_post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      crashout_post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: []
      }
      crashout_posts: {
        Row: {
          attachment_urls: string[] | null
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          is_anonymous: boolean | null
          is_private: boolean | null
          mood_emoji: string | null
          mood_type: string | null
          reaction_counts: Json | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_private?: boolean | null
          mood_emoji?: string | null
          mood_type?: string | null
          reaction_counts?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_private?: boolean | null
          mood_emoji?: string | null
          mood_type?: string | null
          reaction_counts?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          activity_count: number | null
          completed: boolean | null
          completion_time: string | null
          created_at: string | null
          date: string
          id: string
          points_earned: number | null
          tasks_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_count?: number | null
          completed?: boolean | null
          completion_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          points_earned?: number | null
          tasks_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_count?: number | null
          completed?: boolean | null
          completion_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          points_earned?: number | null
          tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          group_id: string
          id: string
          ip_address: unknown
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          group_id: string
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          group_id?: string
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          invitee_email: string | null
          invitee_id: string
          invitee_name: string | null
          inviter_id: string
          message: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          group_id: string
          id?: string
          invitee_email?: string | null
          invitee_id: string
          invitee_name?: string | null
          inviter_id: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          expires_at?: string | null
          group_id?: string
          id?: string
          invitee_email?: string | null
          invitee_id?: string
          invitee_name?: string | null
          inviter_id?: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_default: boolean | null
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_default?: boolean | null
          name: string
          permissions: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_default?: boolean | null
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      journal_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_entry_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_entry_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_entry_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          delivery_status: string | null
          edited_at: string | null
          encrypted: boolean | null
          id: string
          message_type: string | null
          metadata: Json | null
          read: boolean | null
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_status?: string | null
          edited_at?: string | null
          encrypted?: boolean | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          read?: boolean | null
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_status?: string | null
          edited_at?: string | null
          encrypted?: boolean | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          read?: boolean | null
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          additional_data: Json | null
          category_id: string | null
          category_key: string | null
          event_type: string
          external_user_id: string | null
          id: string
          notification_id: string | null
          onesignal_notification_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          category_id?: string | null
          category_key?: string | null
          event_type: string
          external_user_id?: string | null
          id?: string
          notification_id?: string | null
          onesignal_notification_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          category_id?: string | null
          category_key?: string | null
          event_type?: string
          external_user_id?: string | null
          id?: string
          notification_id?: string | null
          onesignal_notification_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_categories: {
        Row: {
          color: string | null
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          clerk_user_id: string | null
          data: Json | null
          delivery_status: string | null
          id: string
          message: string
          notification_type: string
          player_id: string | null
          sent_at: string
          title: string
          user_id: string | null
        }
        Insert: {
          clerk_user_id?: string | null
          data?: Json | null
          delivery_status?: string | null
          id?: string
          message: string
          notification_type: string
          player_id?: string | null
          sent_at?: string
          title: string
          user_id?: string | null
        }
        Update: {
          clerk_user_id?: string | null
          data?: Json | null
          delivery_status?: string | null
          id?: string
          message?: string
          notification_type?: string
          player_id?: string | null
          sent_at?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievements: boolean | null
          break_reminders: boolean | null
          clerk_user_id: string | null
          created_at: string | null
          daily_summary: boolean | null
          email_enabled: boolean | null
          id: string
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_minutes_before: number | null
          study_sessions: boolean | null
          task_reminders: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: boolean | null
          break_reminders?: boolean | null
          clerk_user_id?: string | null
          created_at?: string | null
          daily_summary?: boolean | null
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_minutes_before?: number | null
          study_sessions?: boolean | null
          task_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: boolean | null
          break_reminders?: boolean | null
          clerk_user_id?: string | null
          created_at?: string | null
          daily_summary?: boolean | null
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_minutes_before?: number | null
          study_sessions?: boolean | null
          task_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          action_url: string | null
          badge_url: string | null
          body: string
          category_id: string | null
          clerk_user_id: string | null
          created_at: string | null
          data: Json | null
          icon_url: string | null
          id: string
          onesignal_notification_id: string | null
          priority: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          badge_url?: string | null
          body: string
          category_id?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          icon_url?: string | null
          id?: string
          onesignal_notification_id?: string | null
          priority?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          badge_url?: string | null
          body?: string
          category_id?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          icon_url?: string | null
          id?: string
          onesignal_notification_id?: string | null
          priority?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_analytics: {
        Row: {
          client_ts: number | null
          created_at: string
          event: string
          id: string
          metadata: Json | null
          step: number | null
          step_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_ts?: number | null
          created_at?: string
          event: string
          id?: string
          metadata?: Json | null
          step?: number | null
          step_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_ts?: number | null
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          step?: number | null
          step_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_authorizations: {
        Row: {
          account_name: string | null
          authorization_code: string
          bank: string | null
          bin: string | null
          card_type: string | null
          channel: string | null
          clerk_user_id: string
          country_code: string | null
          created_at: string | null
          email: string
          exp_month: string | null
          exp_year: string | null
          id: string
          last4: string | null
          reusable: boolean | null
          signature: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          authorization_code: string
          bank?: string | null
          bin?: string | null
          card_type?: string | null
          channel?: string | null
          clerk_user_id: string
          country_code?: string | null
          created_at?: string | null
          email: string
          exp_month?: string | null
          exp_year?: string | null
          id?: string
          last4?: string | null
          reusable?: boolean | null
          signature?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          authorization_code?: string
          bank?: string | null
          bin?: string | null
          card_type?: string | null
          channel?: string | null
          clerk_user_id?: string
          country_code?: string | null
          created_at?: string | null
          email?: string
          exp_month?: string | null
          exp_year?: string | null
          id?: string
          last4?: string | null
          reusable?: boolean | null
          signature?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          billing_period: string
          clerk_user_id: string
          created_at: string | null
          currency: string | null
          gateway_response: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_provider: string | null
          paystack_transaction_id: number | null
          reference: string
          status: Database["public"]["Enums"]["payment_status_enum"] | null
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_period: string
          clerk_user_id: string
          created_at?: string | null
          currency?: string | null
          gateway_response?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_provider?: string | null
          paystack_transaction_id?: number | null
          reference: string
          status?: Database["public"]["Enums"]["payment_status_enum"] | null
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string
          clerk_user_id?: string
          created_at?: string | null
          currency?: string | null
          gateway_response?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_provider?: string | null
          paystack_transaction_id?: number | null
          reference?: string
          status?: Database["public"]["Enums"]["payment_status_enum"] | null
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      private_journal_entries: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_favorite: boolean | null
          mood: string
          mood_intensity: number | null
          prompt_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          mood: string
          mood_intensity?: number | null
          prompt_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          mood?: string
          mood_intensity?: number | null
          prompt_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      private_mood_analytics: {
        Row: {
          average_intensity: number | null
          created_at: string | null
          date: string
          dominant_mood: string | null
          entry_count: number | null
          id: string
          mood_entries: Json
          user_id: string
        }
        Insert: {
          average_intensity?: number | null
          created_at?: string | null
          date?: string
          dominant_mood?: string | null
          entry_count?: number | null
          id?: string
          mood_entries?: Json
          user_id: string
        }
        Update: {
          average_intensity?: number | null
          created_at?: string | null
          date?: string
          dominant_mood?: string | null
          entry_count?: number | null
          id?: string
          mood_entries?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          clerk_user_id: string
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          interests: string[] | null
          learning_style:
            | Database["public"]["Enums"]["learning_style_enum"]
            | null
          onboarding_completed: boolean | null
          streak_visibility: boolean | null
          subjects: string[] | null
          updated_at: string | null
          username: string | null
          year_of_study: string | null
        }
        Insert: {
          ai_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          clerk_user_id: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          learning_style?:
            | Database["public"]["Enums"]["learning_style_enum"]
            | null
          onboarding_completed?: boolean | null
          streak_visibility?: boolean | null
          subjects?: string[] | null
          updated_at?: string | null
          username?: string | null
          year_of_study?: string | null
        }
        Update: {
          ai_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          clerk_user_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          learning_style?:
            | Database["public"]["Enums"]["learning_style_enum"]
            | null
          onboarding_completed?: boolean | null
          streak_visibility?: boolean | null
          subjects?: string[] | null
          updated_at?: string | null
          username?: string | null
          year_of_study?: string | null
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          body: string
          clicked_at: string | null
          data: Json | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          status: string | null
          subscription_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string | null
          clerk_user_id: string | null
          created_at: string | null
          device_type: string | null
          endpoint: string | null
          external_user_id: string | null
          id: string
          is_active: boolean | null
          last_used: string | null
          onesignal_player_id: string | null
          p256dh_key: string | null
          platform: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth_key?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          device_type?: string | null
          endpoint?: string | null
          external_user_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          onesignal_player_id?: string | null
          p256dh_key?: string | null
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth_key?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          device_type?: string | null
          endpoint?: string | null
          external_user_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used?: string | null
          onesignal_player_id?: string | null
          p256dh_key?: string | null
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      questionnaire_analytics: {
        Row: {
          completion_rates: Json | null
          generated_at: string | null
          id: string
          question_effectiveness: Json | null
          response_patterns: Json | null
          template_id: string
          user_demographics: Json | null
        }
        Insert: {
          completion_rates?: Json | null
          generated_at?: string | null
          id?: string
          question_effectiveness?: Json | null
          response_patterns?: Json | null
          template_id: string
          user_demographics?: Json | null
        }
        Update: {
          completion_rates?: Json | null
          generated_at?: string | null
          id?: string
          question_effectiveness?: Json | null
          response_patterns?: Json | null
          template_id?: string
          user_demographics?: Json | null
        }
        Relationships: []
      }
      questionnaire_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          order_priority: number | null
          questions: Json
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_priority?: number | null
          questions: Json
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_priority?: number | null
          questions?: Json
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          clerk_user_id: string
          created_at: string | null
          id: string
          payment_reference: string | null
          processed_at: string | null
          reason: string
          refund_amount: number | null
          refund_currency: string | null
          requested_at: string
          status: string
          subscription_id: string | null
          transaction_reference: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          admin_notes?: string | null
          clerk_user_id: string
          created_at?: string | null
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          reason: string
          refund_amount?: number | null
          refund_currency?: string | null
          requested_at?: string
          status?: string
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          admin_notes?: string | null
          clerk_user_id?: string
          created_at?: string | null
          id?: string
          payment_reference?: string | null
          processed_at?: string | null
          reason?: string
          refund_amount?: number | null
          refund_currency?: string | null
          requested_at?: string
          status?: string
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      reminder_analytics: {
        Row: {
          created_at: string | null
          effectiveness_score: number | null
          id: string
          reminder_type: string
          response_time_minutes: number | null
          scheduled_for: string
          sent_at: string
          task_id: string | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          created_at?: string | null
          effectiveness_score?: number | null
          id?: string
          reminder_type: string
          response_time_minutes?: number | null
          scheduled_for: string
          sent_at: string
          task_id?: string | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          created_at?: string | null
          effectiveness_score?: number | null
          id?: string
          reminder_type?: string
          response_time_minutes?: number | null
          scheduled_for?: string
          sent_at?: string
          task_id?: string | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: []
      }
      reminder_preferences: {
        Row: {
          adaptive_scheduling: boolean | null
          created_at: string | null
          default_reminder_offsets: number[] | null
          enabled: boolean | null
          frequency: string | null
          id: string
          priority_based_timing: boolean | null
          procrastination_compensation: number | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          smart_timing: boolean | null
          snooze_options: number[] | null
          sound_enabled: boolean | null
          stress_level_adjustment: boolean | null
          stu_animations: boolean | null
          updated_at: string | null
          user_id: string
          weekends_enabled: boolean | null
        }
        Insert: {
          adaptive_scheduling?: boolean | null
          created_at?: string | null
          default_reminder_offsets?: number[] | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          priority_based_timing?: boolean | null
          procrastination_compensation?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          smart_timing?: boolean | null
          snooze_options?: number[] | null
          sound_enabled?: boolean | null
          stress_level_adjustment?: boolean | null
          stu_animations?: boolean | null
          updated_at?: string | null
          user_id: string
          weekends_enabled?: boolean | null
        }
        Update: {
          adaptive_scheduling?: boolean | null
          created_at?: string | null
          default_reminder_offsets?: number[] | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          priority_based_timing?: boolean | null
          procrastination_compensation?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          smart_timing?: boolean | null
          snooze_options?: number[] | null
          sound_enabled?: boolean | null
          stress_level_adjustment?: boolean | null
          stu_animations?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekends_enabled?: boolean | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string
          id: string
          points: number | null
          priority: string | null
          reminder_time: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          points?: number | null
          priority?: string | null
          reminder_time?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          points?: number | null
          priority?: string | null
          reminder_time?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reward_shop_items: {
        Row: {
          availability: Json | null
          category: string
          created_at: string | null
          description: string | null
          effect: Json | null
          icon: string | null
          id: string
          metadata: Json | null
          name: string
          price: number
          requirements: Json | null
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          effect?: Json | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name: string
          price: number
          requirements?: Json | null
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          effect?: Json | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          price?: number
          requirements?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_recurring: boolean | null
          notification_type: string
          recurrence_pattern: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_recurring?: boolean | null
          notification_type: string
          recurrence_pattern?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_recurring?: boolean | null
          notification_type?: string
          recurrence_pattern?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          confidence_score: number | null
          created_at: string
          id: string
          reasoning: string | null
          reschedule_reason: string | null
          scheduled_end: string
          scheduled_start: string
          task_id: string
          updated_at: string
          user_id: string
          was_rescheduled: boolean | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          reasoning?: string | null
          reschedule_reason?: string | null
          scheduled_end: string
          scheduled_start: string
          task_id: string
          updated_at?: string
          user_id: string
          was_rescheduled?: boolean | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          reasoning?: string | null
          reschedule_reason?: string | null
          scheduled_end?: string
          scheduled_start?: string
          task_id?: string
          updated_at?: string
          user_id?: string
          was_rescheduled?: boolean | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          accessibility: Json | null
          created_at: string | null
          font_size: string | null
          high_contrast: boolean | null
          id: string
          notifications: Json | null
          privacy: Json | null
          reduced_motion: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accessibility?: Json | null
          created_at?: string | null
          font_size?: string | null
          high_contrast?: boolean | null
          id?: string
          notifications?: Json | null
          privacy?: Json | null
          reduced_motion?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accessibility?: Json | null
          created_at?: string | null
          font_size?: string | null
          high_contrast?: boolean | null
          id?: string
          notifications?: Json | null
          privacy?: Json | null
          reduced_motion?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      smart_reminder_queue: {
        Row: {
          created_at: string | null
          id: string
          is_final_reminder: boolean | null
          message: string
          onesignal_notification_id: string | null
          priority_level: number | null
          processed_at: string | null
          reminder_type: string
          scheduled_for: string
          snooze_options: number[] | null
          status: string | null
          stu_animation: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_final_reminder?: boolean | null
          message: string
          onesignal_notification_id?: string | null
          priority_level?: number | null
          processed_at?: string | null
          reminder_type?: string
          scheduled_for: string
          snooze_options?: number[] | null
          status?: string | null
          stu_animation?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_final_reminder?: boolean | null
          message?: string
          onesignal_notification_id?: string | null
          priority_level?: number | null
          processed_at?: string | null
          reminder_type?: string
          scheduled_for?: string
          snooze_options?: number[] | null
          status?: string | null
          stu_animation?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_suggestion_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          suggestion_context: Json | null
          suggestion_id: string
          suggestion_title: string
          suggestion_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          suggestion_context?: Json | null
          suggestion_id: string
          suggestion_title: string
          suggestion_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          suggestion_context?: Json | null
          suggestion_id?: string
          suggestion_title?: string
          suggestion_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clerk_notification_preferences: {
        Row: {
          categories: Json
          clerk_user_id: string
          updated_at: string
        }
        Insert: {
          categories?: Json
          clerk_user_id: string
          updated_at?: string
        }
        Update: {
          categories?: Json
          clerk_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_activity_events: {
        Row: {
          actor_display_name: string | null
          actor_id: string
          created_at: string
          group_display_name: string | null
          group_id: string | null
          id: string
          metadata: Json
          object_id: string | null
          object_type: string
          verb: string
        }
        Insert: {
          actor_display_name?: string | null
          actor_id: string
          created_at?: string
          group_display_name?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type?: string
          verb: string
        }
        Update: {
          actor_display_name?: string | null
          actor_id?: string
          created_at?: string
          group_display_name?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type?: string
          verb?: string
        }
        Relationships: []
      }
      streak_activities: {
        Row: {
          activity_count: number | null
          activity_date: string
          created_at: string | null
          id: string
          metadata: Json | null
          streak_type: string
          user_id: string
        }
        Insert: {
          activity_count?: number | null
          activity_date?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          streak_type: string
          user_id: string
        }
        Update: {
          activity_count?: number | null
          activity_date?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          streak_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          context: Json
          created_at: string
          id: string
          reason: string | null
          reported_id: string
          reporter_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          reason?: string | null
          reported_id: string
          reporter_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          reason?: string | null
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      streak_milestones: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          milestone_days: number
          reward_coins: number | null
          reward_description: string | null
          reward_title: string | null
          streak_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          milestone_days: number
          reward_coins?: number | null
          reward_description?: string | null
          reward_title?: string | null
          streak_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          milestone_days?: number
          reward_coins?: number | null
          reward_description?: string | null
          reward_title?: string | null
          streak_type?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_streak: number | null
          current_streak: number | null
          id: string
          last_completed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          last_completed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          last_completed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_group_achievements: {
        Row: {
          achieved_at: string
          achievement_id: string | null
          awarded_by: string | null
          group_id: string | null
          id: string
        }
        Insert: {
          achieved_at?: string
          achievement_id?: string | null
          awarded_by?: string | null
          group_id?: string | null
          id?: string
        }
        Update: {
          achieved_at?: string
          achievement_id?: string | null
          awarded_by?: string | null
          group_id?: string | null
          id?: string
        }
        Relationships: []
      }
      study_group_analytics: {
        Row: {
          active_members: number | null
          created_at: string
          date: string
          engagement_score: number | null
          group_id: string
          id: string
          member_count: number | null
          messages_sent: number | null
          metadata: Json | null
          resources_shared: number | null
          sessions_held: number | null
          total_study_time: number | null
          updated_at: string
        }
        Insert: {
          active_members?: number | null
          created_at?: string
          date?: string
          engagement_score?: number | null
          group_id: string
          id?: string
          member_count?: number | null
          messages_sent?: number | null
          metadata?: Json | null
          resources_shared?: number | null
          sessions_held?: number | null
          total_study_time?: number | null
          updated_at?: string
        }
        Update: {
          active_members?: number | null
          created_at?: string
          date?: string
          engagement_score?: number | null
          group_id?: string
          id?: string
          member_count?: number | null
          messages_sent?: number | null
          metadata?: Json | null
          resources_shared?: number | null
          sessions_held?: number | null
          total_study_time?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      study_group_invitations: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          invitee_id: string | null
          inviter_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          group_id: string | null
          id: string
          invite_accepted_at: string | null
          joined_at: string
          joined_via_invite: boolean | null
          permissions: Json | null
          role: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          invite_accepted_at?: string | null
          joined_at?: string
          joined_via_invite?: boolean | null
          permissions?: Json | null
          role?: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          invite_accepted_at?: string | null
          joined_at?: string
          joined_via_invite?: boolean | null
          permissions?: Json | null
          role?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      study_group_resources: {
        Row: {
          content: string | null
          created_at: string
          download_count: number | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          group_id: string | null
          id: string
          is_public: boolean | null
          resource_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          download_count?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          resource_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          download_count?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          resource_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      study_group_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          group_id: string | null
          id: string
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          group_id?: string | null
          id?: string
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          group_id?: string | null
          id?: string
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          category_id: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          last_activity_at: string | null
          max_members: number | null
          metadata: Json | null
          name: string
          privacy_level: string | null
          session_count: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          max_members?: number | null
          metadata?: Json | null
          name: string
          privacy_level?: string | null
          session_count?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          max_members?: number | null
          metadata?: Json | null
          name?: string
          privacy_level?: string | null
          session_count?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      study_session_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          participation_duration: number | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          participation_duration?: number | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          participation_duration?: number | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          created_by: string
          current_participants: number | null
          description: string | null
          end_time: string
          group_id: string
          id: string
          max_participants: number | null
          metadata: Json | null
          session_type: string
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_participants?: number | null
          description?: string | null
          end_time: string
          group_id: string
          id?: string
          max_participants?: number | null
          metadata?: Json | null
          session_type?: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_participants?: number | null
          description?: string | null
          end_time?: string
          group_id?: string
          id?: string
          max_participants?: number | null
          metadata?: Json | null
          session_type?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          ai_requests_per_day: number | null
          ai_requests_per_month: number | null
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        Insert: {
          ai_requests_per_day?: number | null
          ai_requests_per_month?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_requests_per_day?: number | null
          ai_requests_per_month?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          clerk_user_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          original_due_date: string | null
          priority: string | null
          recurrence_rule: string | null
          reminder_settings: Json | null
          subject: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clerk_user_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          original_due_date?: string | null
          priority?: string | null
          recurrence_rule?: string | null
          reminder_settings?: Json | null
          subject?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clerk_user_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          original_due_date?: string | null
          priority?: string | null
          recurrence_rule?: string | null
          reminder_settings?: Json | null
          subject?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_analytics: {
        Row: {
          action: string
          created_at: string | null
          help_requests: number | null
          id: string
          interaction_count: number | null
          metadata: Json | null
          step: Database["public"]["Enums"]["tutorial_step_enum"]
          stu_interactions: number | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          help_requests?: number | null
          id?: string
          interaction_count?: number | null
          metadata?: Json | null
          step: Database["public"]["Enums"]["tutorial_step_enum"]
          stu_interactions?: number | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          help_requests?: number | null
          id?: string
          interaction_count?: number | null
          metadata?: Json | null
          step?: Database["public"]["Enums"]["tutorial_step_enum"]
          stu_interactions?: number | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed_at: string | null
          completed_steps:
            | Database["public"]["Enums"]["tutorial_step_enum"][]
            | null
          created_at: string | null
          current_step: Database["public"]["Enums"]["tutorial_step_enum"]
          id: string
          is_completed: boolean | null
          is_skipped: boolean | null
          last_seen_at: string | null
          started_at: string | null
          step_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?:
            | Database["public"]["Enums"]["tutorial_step_enum"][]
            | null
          created_at?: string | null
          current_step?: Database["public"]["Enums"]["tutorial_step_enum"]
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          last_seen_at?: string | null
          started_at?: string | null
          step_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?:
            | Database["public"]["Enums"]["tutorial_step_enum"][]
            | null
          created_at?: string | null
          current_step?: Database["public"]["Enums"]["tutorial_step_enum"]
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          last_seen_at?: string | null
          started_at?: string | null
          step_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_rewards: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          reward_data: Json | null
          reward_type: string
          reward_value: number
          step: Database["public"]["Enums"]["tutorial_step_enum"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_data?: Json | null
          reward_type: string
          reward_value: number
          step: Database["public"]["Enums"]["tutorial_step_enum"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_data?: Json | null
          reward_type?: string
          reward_value?: number
          step?: Database["public"]["Enums"]["tutorial_step_enum"]
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          expires_at: string | null
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          expires_at?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          expires_at?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_patterns: {
        Row: {
          analysis_version: number | null
          attention_span: number | null
          break_preferences: Json | null
          collaboration_preference: string | null
          created_at: string | null
          data_sources: Json | null
          deadline_pressure_response: string | null
          difficulty_preference: string | null
          id: string
          last_analyzed_at: string | null
          learning_style: string | null
          motivation_factors: Json | null
          notification_timing: Json | null
          pattern_confidence: Json | null
          preferred_study_times: Json | null
          productivity_peaks: Json | null
          reminder_frequency: string | null
          stress_relief_preferences: Json | null
          stress_triggers: Json | null
          task_completion_style: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_version?: number | null
          attention_span?: number | null
          break_preferences?: Json | null
          collaboration_preference?: string | null
          created_at?: string | null
          data_sources?: Json | null
          deadline_pressure_response?: string | null
          difficulty_preference?: string | null
          id?: string
          last_analyzed_at?: string | null
          learning_style?: string | null
          motivation_factors?: Json | null
          notification_timing?: Json | null
          pattern_confidence?: Json | null
          preferred_study_times?: Json | null
          productivity_peaks?: Json | null
          reminder_frequency?: string | null
          stress_relief_preferences?: Json | null
          stress_triggers?: Json | null
          task_completion_style?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_version?: number | null
          attention_span?: number | null
          break_preferences?: Json | null
          collaboration_preference?: string | null
          created_at?: string | null
          data_sources?: Json | null
          deadline_pressure_response?: string | null
          difficulty_preference?: string | null
          id?: string
          last_analyzed_at?: string | null
          learning_style?: string | null
          motivation_factors?: Json | null
          notification_timing?: Json | null
          pattern_confidence?: Json | null
          preferred_study_times?: Json | null
          productivity_peaks?: Json | null
          reminder_frequency?: string | null
          stress_relief_preferences?: Json | null
          stress_triggers?: Json | null
          task_completion_style?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_purchased_themes: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          price_paid: number
          purchased_at: string | null
          theme_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price_paid?: number
          purchased_at?: string | null
          theme_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          price_paid?: number
          purchased_at?: string | null
          theme_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_questionnaire_responses: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          completion_status: string | null
          id: string
          responses: Json
          started_at: string | null
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          completion_status?: string | null
          id?: string
          responses: Json
          started_at?: string | null
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          completion_status?: string | null
          id?: string
          responses?: Json
          started_at?: string | null
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reminder_patterns: {
        Row: {
          average_task_duration: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          last_updated_at: string | null
          preferred_reminder_frequency: string | null
          preferred_study_times: string[] | null
          procrastination_tendency: number | null
          quiet_hours: Json | null
          stress_level: number | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          average_task_duration?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          preferred_reminder_frequency?: string | null
          preferred_study_times?: string[] | null
          procrastination_tendency?: number | null
          quiet_hours?: Json | null
          stress_level?: number | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          average_task_duration?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          preferred_reminder_frequency?: string | null
          preferred_study_times?: string[] | null
          procrastination_tendency?: number | null
          quiet_hours?: Json | null
          stress_level?: number | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          crashout_reactions_count: number
          current_streak: number | null
          level: number | null
          longest_streak: number | null
          mood_posts_count: number
          stress_relief_sessions_count: number
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          crashout_reactions_count?: number
          current_streak?: number | null
          level?: number | null
          longest_streak?: number | null
          mood_posts_count?: number
          stress_relief_sessions_count?: number
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          crashout_reactions_count?: number
          current_streak?: number | null
          level?: number | null
          longest_streak?: number | null
          mood_posts_count?: number
          stress_relief_sessions_count?: number
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          is_active: boolean | null
          last_activity_date: string | null
          longest_streak: number
          metadata: Json | null
          streak_start_date: string | null
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          is_active?: boolean | null
          last_activity_date?: string | null
          longest_streak?: number
          metadata?: Json | null
          streak_start_date?: string | null
          streak_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          is_active?: boolean | null
          last_activity_date?: string | null
          longest_streak?: number
          metadata?: Json | null
          streak_start_date?: string | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          clerk_user_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          paystack_customer_id: string | null
          paystack_subscription_code: string | null
          status: Database["public"]["Enums"]["subscription_status_enum"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          clerk_user_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          status?:
            | Database["public"]["Enums"]["subscription_status_enum"]
            | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          clerk_user_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          status?:
            | Database["public"]["Enums"]["subscription_status_enum"]
            | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_timetables: {
        Row: {
          color: string | null
          course_code: string | null
          course_name: string
          created_at: string | null
          days_of_week: string[]
          detailed_description: string | null
          end_time: string
          id: string
          instructor: string | null
          is_active: boolean | null
          location: string | null
          semester_end_date: string | null
          semester_start_date: string | null
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          course_code?: string | null
          course_name: string
          created_at?: string | null
          days_of_week: string[]
          detailed_description?: string | null
          end_time: string
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          semester_end_date?: string | null
          semester_start_date?: string | null
          start_time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          course_code?: string | null
          course_name?: string
          created_at?: string | null
          days_of_week?: string[]
          detailed_description?: string | null
          end_time?: string
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          semester_end_date?: string | null
          semester_start_date?: string | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          interests: string[] | null
          subjects: string[] | null
          updated_at: string | null
          year_of_study: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          interests?: string[] | null
          subjects?: string[] | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          interests?: string[] | null
          subjects?: string[] | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Relationships: []
      }
      writing_prompts: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          mood_target: string[]
          prompt_text: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mood_target: string[]
          prompt_text: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mood_target?: string[]
          prompt_text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_coins_to_user: {
        Args: {
          p_amount: number
          p_description: string
          p_metadata?: Json
          p_source: string
          p_user_id: string
        }
        Returns: boolean
      }
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Returns: boolean
      }
      block_user: {
        Args: { actor_id: string; other_id: string }
        Returns: {
          id: string
          status: string
        }[]
      }
      calculate_coin_earning: {
        Args: { p_metadata?: Json; p_source: string; p_user_id: string }
        Returns: number
      }
      calculate_current_streak: { Args: { p_user_id: string }; Returns: number }
      can_make_ai_request: {
        Args: { p_clerk_user_id: string; p_usage_date?: string }
        Returns: {
          can_request: boolean
          current_usage: number
          daily_limit: number
          remaining_requests: number
        }[]
      }
      can_user_perform_action: {
        Args: { p_action: string; p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      change_member_role: {
        Args: {
          p_admin_user_id: string
          p_group_id: string
          p_member_user_id: string
          p_new_role_name: string
        }
        Returns: boolean
      }
      check_daily_login_bonus_eligibility: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_typing_indicators: { Args: never; Returns: undefined }
      cleanup_old_notification_logs: { Args: never; Returns: undefined }
      cleanup_old_reminder_analytics: { Args: never; Returns: undefined }
      clerk_user_id: { Args: never; Returns: string }
      clerk_webhook_handler: { Args: { webhook_payload: Json }; Returns: Json }
      create_or_accept_connection: {
        Args: { actor_id: string; other_id: string }
        Returns: {
          id: string
          status: string
        }[]
      }
      ensure_authenticated: { Args: never; Returns: boolean }
      find_similar_users: {
        Args: {
          max_results?: number
          similarity_threshold?: number
          user_id: string
          user_vector: string
        }
        Returns: {
          avg_session_length: number
          id: string
          learning_style: string
          similarity: number
          subject_interests: string[]
          success_rate: number
        }[]
      }
      get_clerk_user_id: { Args: never; Returns: string }
      get_coin_analytics: {
        Args: { p_user_id: string }
        Returns: {
          current_balance: number
          total_earned: number
          total_spent: number
          transactions_count: number
        }[]
      }
      get_mood_insights: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
      get_or_create_direct_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_streak_leaderboard: {
        Args: { limit_count?: number; requesting_user_id?: string }
        Returns: {
          current_streak: number
          longest_streak: number
          profile_visible: boolean
          total_points: number
          user_id: string
          username: string
        }[]
      }
      get_user_ai_preferences: {
        Args: { user_uuid: string }
        Returns: {
          difficulty_preference: number
          learning_style: string
          preferences_vector: string
          subject_interests: string[]
          user_id: string
        }[]
      }
      get_user_coin_balance: { Args: { p_user_id: string }; Returns: number }
      get_user_coin_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json
          source: string
          transaction_type: string
          user_id: string
        }[]
      }
      get_user_coin_transactions: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json
          reference_id: string
          source: string
        }[]
      }
      get_user_group_permissions: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      get_user_reaction: {
        Args: { post_id_param: string; user_id_param: string }
        Returns: string
      }
      get_user_recommendations: {
        Args: { user_id_input: string }
        Returns: {
          avatar_url: string
          clerk_user_id: string
          email: string
          full_name: string
          interests: string[]
          subjects: string[]
          year_of_study: string
        }[]
      }
      get_user_streaks: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          is_active: boolean
          last_activity_date: string
          longest_streak: number
          streak_start_date: string
          streak_type: string
        }[]
      }
      get_user_study_groups: {
        Args: { p_user_id: string }
        Returns: {
          category_id: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          last_activity_at: string | null
          max_members: number | null
          metadata: Json | null
          name: string
          privacy_level: string | null
          session_count: number | null
          tags: string[] | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "study_groups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      handle_clerk_webhook: {
        Args: { event_type: string; user_data: Json }
        Returns: undefined
      }
      handle_reaction: {
        Args: {
          post_id_param: string
          reaction_type_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      increment_ai_usage: {
        Args: {
          p_clerk_user_id: string
          p_feature_type: string
          p_increment?: number
          p_usage_date: string
        }
        Returns: boolean
      }
      insert_achievement_direct: {
        Args: {
          p_criteria: Json
          p_description: string
          p_icon: string
          p_name: string
          p_points_reward: number
          p_type: string
        }
        Returns: string
      }
      is_conversation_admin: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_streak_active: {
        Args: { p_streak_type: string; p_user_id: string }
        Returns: boolean
      }
      log_group_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_group_id: string
          p_target_id?: string
          p_target_type?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_daily_completion: {
        Args: {
          p_date?: string
          p_points_earned?: number
          p_tasks_completed?: number
          p_user_id: string
        }
        Returns: boolean
      }
      mark_message_as_read: {
        Args: { message_uuid: string; reader_id: string }
        Returns: undefined
      }
      maintain_social_activity_feed: { Args: never; Returns: undefined }
      remove_connection: {
        Args: { actor_id: string; other_id: string }
        Returns: boolean
      }
      remove_group_member: {
        Args: {
          p_admin_user_id: string
          p_group_id: string
          p_member_user_id: string
        }
        Returns: boolean
      }
      remove_reaction:
        | {
            Args: { post_id_param: string; user_id_param: string }
            Returns: undefined
          }
        | {
            Args: {
              post_id_param: string
              reaction_type_param: string
              user_id_param: string
            }
            Returns: undefined
          }
      remove_vote_from_post: {
        Args: { post_id_param: string; user_id_param: string }
        Returns: undefined
      }
      reset_daily_ai_usage: { Args: never; Returns: number }
      respond_to_invitation: {
        Args: { p_invitation_id: string; p_response: string; p_user_id: string }
        Returns: boolean
      }
      search_users: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          clerk_user_id: string
          email: string
          full_name: string
          interests: string[]
          subjects: string[]
          year_of_study: string
        }[]
      }
      send_group_invitation: {
        Args: {
          p_group_id: string
          p_invitee_email?: string
          p_invitee_id?: string
          p_invitee_name?: string
          p_inviter_id: string
          p_message?: string
        }
        Returns: string
      }
      spend_user_coins: {
        Args: {
          p_amount: number
          p_description: string
          p_metadata?: Json
          p_source: string
          p_user_id: string
        }
        Returns: boolean
      }
      sync_user_streak_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      track_notification_event: {
        Args: {
          p_additional_data?: Json
          p_event_type: string
          p_notification_id: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      transfer_group_ownership: {
        Args: {
          p_current_owner_id: string
          p_group_id: string
          p_new_owner_id: string
        }
        Returns: boolean
      }
      trigger_daily_login_bonus: {
        Args: { p_user_id: string }
        Returns: number
      }
      unblock_user: {
        Args: { actor_id: string; other_id: string }
        Returns: boolean
      }
      update_post_reaction_counts: {
        Args: { post_id_param: string }
        Returns: undefined
      }
      update_typing_indicator: {
        Args: { conversation_uuid: string; typing: boolean; user_uuid: string }
        Returns: undefined
      }
      update_user_streak: {
        Args: {
          p_activity_date?: string
          p_streak_type: string
          p_user_id: string
        }
        Returns: Json
      }
      upsert_user_pattern: {
        Args: {
          confidence_param?: number
          pattern_data_param: Json
          pattern_type_param: string
          user_uuid: string
        }
        Returns: string
      }
      validate_clerk_jwt: { Args: { token: string }; Returns: Json }
      vote_on_post: {
        Args: {
          post_id_param: string
          user_id_param: string
          vote_type_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_permission: "channels.delete" | "messages.delete"
      app_role: "admin" | "moderator"
      learning_style_enum:
        | "Visual"
        | "Auditory"
        | "Kinesthetic"
        | "Reading/Writing"
        | "Unspecified"
      payment_status_enum: "pending" | "completed" | "failed" | "cancelled"
      priority_level: "low" | "medium" | "high"
      subscription_status_enum: "active" | "inactive" | "cancelled" | "past_due"
      subscription_tier_enum: "free" | "premium" | "enterprise"
      task_type: "academic" | "personal" | "event"
      tutorial_step_enum:
        | "welcome"
        | "navigation"
        | "task_creation"
        | "ai_suggestions"
        | "social_features"
        | "crashout_room"
        | "achievements"
        | "completion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_permission: ["channels.delete", "messages.delete"],
      app_role: ["admin", "moderator"],
      learning_style_enum: [
        "Visual",
        "Auditory",
        "Kinesthetic",
        "Reading/Writing",
        "Unspecified",
      ],
      payment_status_enum: ["pending", "completed", "failed", "cancelled"],
      priority_level: ["low", "medium", "high"],
      subscription_status_enum: ["active", "inactive", "cancelled", "past_due"],
      subscription_tier_enum: ["free", "premium", "enterprise"],
      task_type: ["academic", "personal", "event"],
      tutorial_step_enum: [
        "welcome",
        "navigation",
        "task_creation",
        "ai_suggestions",
        "social_features",
        "crashout_room",
        "achievements",
        "completion",
      ],
    },
  },
} as const
