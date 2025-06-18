import { createClient } from '@supabase/supabase-js';

// Global OneSignal interface for TypeScript
declare global {
  interface Window {
    OneSignal?: any;
  }
}
import { supabase } from '@/lib/supabase/client';

interface OneSignalNotification {
  app_id: string;
  contents: { [key: string]: string };
  headings?: { [key: string]: string };
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  included_segments?: string[];
  data?: Record<string, any>;
  url?: string;
  send_after?: string;
  delayed_option?: 'timezone' | 'last-active';
  delivery_time_of_day?: string;
  ttl?: number;
  priority?: number;
  android_channel_id?: string;
  small_icon?: string;
  large_icon?: string;
  buttons?: Array<{
    id: string;
    text: string;
    icon?: string;
    url?: string;
  }>;
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  external_id?: string;
}

export class OneSignalService {
  private static instance: OneSignalService;
  private supabase;
  private appId: string;
  private restApiKey: string;
  private apiUrl = 'https://onesignal.com/api/v1';
  private isInitialized = false;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    this.appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
    this.restApiKey = process.env.ONESIGNAL_REST_API_KEY!;

    if (!this.appId || !this.restApiKey) {
      console.warn('OneSignal credentials not properly configured');
    }
  }

  public static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  async initializeOneSignal(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
        return false;
      }

      // OneSignal is initialized via script tags in layout.tsx
      // Just wait for it to be available and mark as initialized
      if (typeof window !== 'undefined' && window.OneSignal) {
        this.isInitialized = true;
        return true;
      }
      
      // Wait for OneSignal to be loaded
      await new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (window.OneSignal) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('OneSignal SDK not found'));
        }, 5000);
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      return false;
    }
  }

  async getSubscriptionStatus(): Promise<{ isSubscribed: boolean; playerId?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initializeOneSignal();
      }
      
      if (!window.OneSignal) {
        return { isSubscribed: false };
      }
      
      const permission = window.OneSignal.Notifications.permission;
      const playerId = window.OneSignal.User.PushSubscription.id;
      
      return {
        isSubscribed: permission,
        playerId: playerId || undefined
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return { isSubscribed: false };
    }
  }

  async subscribeUser(clerkUserId: string): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        await this.initializeOneSignal();
      }

      if (!window.OneSignal) {
        console.error('OneSignal not available');
        return null;
      }

      // Prompt for push notification permission
      await window.OneSignal.Slidedown.promptPush();
      
      // Set external user ID for better user tracking
      await window.OneSignal.login(clerkUserId);
      
      // Get the player ID after subscription
      const playerId = window.OneSignal.User.PushSubscription.id;
      
      if (playerId) {
        await this.storePlayerSubscription(clerkUserId, playerId);
        return playerId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return null;
    }
  }

  async unsubscribeUser(playerId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeOneSignal();
      }

      if (!window.OneSignal) {
        console.error('OneSignal not available');
        return false;
      }

      // Unsubscribe from push notifications
      await window.OneSignal.User.PushSubscription.optOut();
      
      // Remove from database
      await this.removePlayerSubscription(playerId);
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe user:', error);
      return false;
    }
  }

  async storePlayerSubscription(clerkUserId: string, playerId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: clerkUserId, // Using auth.users(id) - will be mapped via RLS
          external_user_id: clerkUserId, // Clerk user ID
          onesignal_player_id: playerId,
          device_type: 'web',
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'external_user_id'
        });

      if (error) {
        console.error('Error storing player subscription:', error);
      }
    } catch (error) {
      console.error('Failed to store player subscription:', error);
    }
  }

  async removePlayerSubscription(playerId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('onesignal_player_id', playerId);

      if (error) {
        console.error('Error removing player subscription:', error);
      }
    } catch (error) {
      console.error('Failed to remove player subscription:', error);
    }
  }

  async sendTaskReminder(playerId: string, taskTitle: string, reminderTime: Date): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_ids: [playerId],
          headings: { en: '📚 Task Reminder' },
          contents: { en: `Don't forget: ${taskTitle}` },
          data: {
            type: 'task_reminder',
            task_title: taskTitle,
            reminder_time: reminderTime.toISOString(),
          },
          url: '/dashboard',
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
    } catch (error) {
      console.error('Failed to send task reminder:', error);
      return false;
    }
  }

  async sendAchievementNotification(playerId: string, achievementTitle: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_ids: [playerId],
          headings: { en: '🎉 Achievement Unlocked!' },
          contents: { en: `Congratulations! You earned: ${achievementTitle}` },
          data: {
            type: 'achievement',
            achievement_title: achievementTitle,
          },
          url: '/dashboard',
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
    } catch (error) {
      console.error('Failed to send achievement notification:', error);
      return false;
    }
  }

  async sendBreakSuggestion(playerId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_ids: [playerId],
          headings: { en: '🌟 Take a Break' },
          contents: { en: message },
          data: {
            type: 'break_suggestion',
            message,
          },
          url: '/dashboard',
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
    } catch (error) {
      console.error('Failed to send break suggestion:', error);
      return false;
    }
  }

  /**
   * Send notification immediately via OneSignal REST API
   * This eliminates the need for cron jobs - notifications are sent in real-time
   */
  async sendNotification(notification: Partial<OneSignalNotification>): Promise<OneSignalResponse | null> {
    try {
      const payload: OneSignalNotification = {
        app_id: this.appId,
        contents: { en: 'Default message' },
        ...notification,
      };

      const response = await fetch(`${this.apiUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OneSignal API error:', response.status, errorData);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      return null;
    }
  }

  /**
   * Send study break suggestion
   */
  async sendStudyBreakSuggestion(userId: string, message: string): Promise<boolean> {
    try {
      const { data: subscription } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('external_user_id', userId)
        .eq('is_active', true)
        .single();

      if (!subscription?.onesignal_player_id) return false;

      const result = await this.sendNotification({
        contents: { 
          en: message 
        },
        headings: { 
          en: '☕ Time for a Break?' 
        },
        include_player_ids: [subscription.onesignal_player_id],
        data: { 
          type: 'study_break' 
        },
        url: '/dashboard?tab=wellness',
        android_channel_id: 'study_breaks',
        priority: 4,
      });

      if (result) {
        await this.trackNotificationEvent(userId, result.id, 'sent', 'study_break');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending study break suggestion:', error);
      return false;
    }
  }

  /**
   * Schedule notification for later delivery using OneSignal's delayed delivery
   * This replaces cron job functionality
   */
  async scheduleNotification(
    userId: string, 
    notification: Partial<OneSignalNotification>, 
    deliveryTime: Date
  ): Promise<boolean> {
    try {
      const { data: subscription } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('external_user_id', userId)
        .eq('is_active', true)
        .single();

      if (!subscription?.onesignal_player_id) return false;

      const result = await this.sendNotification({
        ...notification,
        include_player_ids: [subscription.onesignal_player_id],
        send_after: deliveryTime.toISOString(),
        delayed_option: 'timezone', // Respect user's timezone
      });

      if (result) {
        // Store scheduled notification in database for tracking
        await this.supabase
          .from('notification_queue')
          .insert({
            user_id: userId,
            onesignal_notification_id: result.id,
            title: notification.headings?.en || 'Notification',
            body: notification.contents?.en || 'You have a notification',
            scheduled_for: deliveryTime.toISOString(),
            status: 'scheduled',
            data: notification.data || {},
          });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  }

  /**
   * Get notification categories for settings
   */
  async getNotificationCategories() {
    const { data, error } = await this.supabase
      .from('notification_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching notification categories:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update user preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    const { error } = await this.supabase
      .from('notification_preferences')
      .upsert(preferences.map((pref: any) => ({
        ...pref,
        user_id: userId,
      })), {
        onConflict: 'user_id,category_id'
      });

    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }

    return true;
  }

  /**
   * Track notification events for analytics
   */
  async trackNotificationEvent(
    userId: string, 
    notificationId: string, 
    eventType: string, 
    category: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('notification_analytics')
        .insert({
          user_id: userId,
          notification_id: notificationId,
          event_type: eventType,
          category,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error tracking notification event:', error);
    }
  }

  /**
   * Get user's notification analytics
   */
  async getUserNotificationAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('notification_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching notification analytics:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('push_subscriptions')
      .select('onesignal_player_id')
      .eq('external_user_id', userId)
      .eq('is_active', true)
      .single();

    return !!data?.onesignal_player_id;
  }
}

// Export singleton instance
export const oneSignalService = OneSignalService.getInstance(); 