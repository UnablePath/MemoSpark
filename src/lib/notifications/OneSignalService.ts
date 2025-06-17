import { createClient } from '@supabase/supabase-js';

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
  private supabase;
  private appId: string;
  private restApiKey: string;
  private apiUrl = 'https://onesignal.com/api/v1';

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
   * Send task reminder notification
   * Real-time delivery - no cron dependency
   */
  async sendTaskReminder(userId: string, taskTitle: string, dueDate: Date, taskId: string): Promise<boolean> {
    try {
      // Get user's OneSignal player ID from database
      const { data: subscription } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!subscription?.onesignal_player_id) {
        console.warn('No OneSignal player ID found for user:', userId);
        return false;
      }

      // Calculate time until due
      const timeUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60)); // minutes
      const timeText = timeUntilDue > 60 
        ? `${Math.ceil(timeUntilDue / 60)} hours`
        : `${timeUntilDue} minutes`;

      const result = await this.sendNotification({
        contents: { 
          en: `⏰ "${taskTitle}" is due in ${timeText}!` 
        },
        headings: { 
          en: '📋 Task Reminder' 
        },
        include_player_ids: [subscription.onesignal_player_id],
        data: { 
          taskId, 
          type: 'task_reminder',
          dueDate: dueDate.toISOString() 
        },
        url: `/dashboard?task=${taskId}`,
        android_channel_id: 'task_reminders',
        small_icon: 'ic_notification_task',
        priority: 8, // High priority
        ttl: 3600, // 1 hour TTL
      });

      if (result) {
        // Track analytics in database
        await this.trackNotificationEvent(userId, result.id, 'sent', 'task_reminder');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending task reminder:', error);
      return false;
    }
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(userId: string, achievementTitle: string, description: string): Promise<boolean> {
    try {
      const { data: subscription } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!subscription?.onesignal_player_id) return false;

      const result = await this.sendNotification({
        contents: { 
          en: `🎉 ${description}` 
        },
        headings: { 
          en: `🏆 Achievement: ${achievementTitle}` 
        },
        include_player_ids: [subscription.onesignal_player_id],
        data: { 
          type: 'achievement',
          achievement: achievementTitle 
        },
        url: '/dashboard?tab=achievements',
        android_channel_id: 'achievements',
        priority: 6,
      });

      if (result) {
        await this.trackNotificationEvent(userId, result.id, 'sent', 'achievement');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending achievement notification:', error);
      return false;
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
        .eq('user_id', userId)
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
        .eq('user_id', userId)
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
   * Store OneSignal player ID when user subscribes
   */
  async storePlayerSubscription(userId: string, playerId: string, userAgent?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          onesignal_player_id: playerId,
          user_agent: userAgent,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,onesignal_player_id'
        });

      if (error) {
        console.error('Error storing player subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in storePlayerSubscription:', error);
      return false;
    }
  }

  /**
   * Remove OneSignal player subscription when user unsubscribes
   */
  async removePlayerSubscription(playerId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('onesignal_player_id', playerId);

      if (error) {
        console.error('Error removing player subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removePlayerSubscription:', error);
      return false;
    }
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
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return !!data?.onesignal_player_id;
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalService(); 