import { supabase } from '@/lib/supabase/client';
import type { 
  DatabasePushSubscription, 
  NotificationLog, 
  ScheduledNotification, 
  NotificationPreferences,
  NotificationType,
  RichNotification,
  NotificationAnalytics,
  UserNotificationStats,
  PushSubscriptionWithMetadata
} from './pushTypes';

export class SupabasePushService {
  private static instance: SupabasePushService;
  private supabaseClient = supabase;

  static getInstance(): SupabasePushService {
    if (!SupabasePushService.instance) {
      SupabasePushService.instance = new SupabasePushService();
    }
    return SupabasePushService.instance;
  }

  // Subscription Management
  async saveSubscription(
    userId: string, 
    subscription: PushSubscriptionWithMetadata
  ): Promise<string> {
    if (!this.supabaseClient) throw new Error('Supabase not configured');
    
    const { data, error } = await this.supabaseClient
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: subscription.userAgent,
        last_used: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'user_id,endpoint',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      throw new Error('Failed to save push subscription');
    }

    return data.id;
  }

  async getSubscriptions(userId: string): Promise<DatabasePushSubscription[]> {
    if (!this.supabaseClient) return [];
    
    const { data, error } = await this.supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      return [];
    }

    return data || [];
  }

  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.supabaseClient) return false;
    
    const { error } = await this.supabaseClient
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId);

    if (error) {
      return false;
    }

    return true;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    if (!this.supabaseClient) return null;
    
    const { data, error } = await this.supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return null;
    }

    return data;
  }

  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    if (!this.supabaseClient) return null;
    
    const { data, error } = await this.supabaseClient
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  // Scheduled Notifications
  async scheduleNotification(
    userId: string,
    notification: Omit<ScheduledNotification, 'id' | 'user_id' | 'created_at' | 'status'>
  ): Promise<string | null> {
    if (!this.supabaseClient) return null;
    
    const { data, error } = await this.supabaseClient
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        ...notification,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      return null;
    }

    return data.id;
  }

  async getScheduledNotifications(
    userId: string,
    status?: ScheduledNotification['status']
  ): Promise<ScheduledNotification[]> {
    if (!this.supabaseClient) return [];
    
    let query = this.supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return data || [];
  }

  async markNotificationAsSent(notificationId: string): Promise<boolean> {
    if (!this.supabaseClient) return false;
    
    const { error } = await this.supabaseClient
      .from('scheduled_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      return false;
    }

    return true;
  }

  async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    if (!this.supabaseClient) return false;
    
    const { error } = await this.supabaseClient
      .from('scheduled_notifications')
      .update({ status: 'cancelled' })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to cancel scheduled notification:', error);
      return false;
    }

    return true;
  }

  // Notification Logging
  async logNotification(
    userId: string,
    subscriptionId: string | null,
    notification: RichNotification,
    notificationType: NotificationType,
    status: NotificationLog['status'] = 'sent',
    errorMessage?: string
  ): Promise<string | null> {
    if (!this.supabaseClient) return null;
    
    const { data, error } = await this.supabaseClient
      .from('push_notification_logs')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        notification_type: notificationType,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        status,
        error_message: errorMessage
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log notification:', error);
      return null;
    }

    return data.id;
  }

  async updateNotificationStatus(
    logId: string,
    status: NotificationLog['status'],
    timestamp?: string
  ): Promise<boolean> {
    if (!this.supabaseClient) return false;
    
    const updateData: Record<string, any> = { status };
    
    if (status === 'delivered' && timestamp) {
      updateData.delivered_at = timestamp;
    } else if (status === 'clicked' && timestamp) {
      updateData.clicked_at = timestamp;
    }

    const { error } = await this.supabaseClient
      .from('push_notification_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) {
      console.error('Failed to update notification status:', error);
      return false;
    }

    return true;
  }

  // Analytics
  async getNotificationAnalytics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<NotificationAnalytics | null> {
    if (!this.supabaseClient) return null;
    
    try {
      let query = this.supabaseClient
        .from('push_notification_logs')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('sent_at', startDate);
      }
      if (endDate) {
        query = query.lte('sent_at', endDate);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Failed to get notification analytics:', error);
        return null;
      }

      if (!logs || logs.length === 0) {
        return {
          total_sent: 0,
          total_delivered: 0,
          total_clicked: 0,
          total_failed: 0,
          delivery_rate: 0,
          click_rate: 0,
          engagement_rate: 0,
          top_notification_types: [],
          hourly_distribution: [],
          recent_activity: []
        };
      }

      // Calculate metrics
      const total_sent = logs.length;
      const total_delivered = logs.filter((log: NotificationLog) => log.status === 'delivered' || log.status === 'clicked').length;
      const total_clicked = logs.filter((log: NotificationLog) => log.status === 'clicked').length;
      const total_failed = logs.filter((log: NotificationLog) => log.status === 'failed').length;

      const delivery_rate = total_sent > 0 ? (total_delivered / total_sent) * 100 : 0;
      const click_rate = total_delivered > 0 ? (total_clicked / total_delivered) * 100 : 0;
      const engagement_rate = total_sent > 0 ? (total_clicked / total_sent) * 100 : 0;

      // Group by notification type
      const typeGroups: { [key: string]: NotificationLog[] } = {};
      logs.forEach((log: NotificationLog) => {
        if (!typeGroups[log.notification_type]) {
          typeGroups[log.notification_type] = [];
        }
        typeGroups[log.notification_type].push(log);
      });

      const top_notification_types = Object.entries(typeGroups).map(([type, typeLogs]) => ({
        type: type as NotificationType,
        count: typeLogs.length,
        engagement_rate: typeLogs.length > 0 
          ? (typeLogs.filter((log: NotificationLog) => log.status === 'clicked').length / typeLogs.length) * 100 
          : 0
      })).sort((a, b) => b.count - a.count);

      // Hourly distribution
      const hourlyGroups: { [hour: number]: NotificationLog[] } = {};
      logs.forEach((log: NotificationLog) => {
        const hour = new Date(log.sent_at).getHours();
        if (!hourlyGroups[hour]) {
          hourlyGroups[hour] = [];
        }
        hourlyGroups[hour].push(log);
      });

      const hourly_distribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourlyGroups[hour]?.length || 0,
        engagement_rate: hourlyGroups[hour] 
          ? (hourlyGroups[hour].filter((log: NotificationLog) => log.status === 'clicked').length / hourlyGroups[hour].length) * 100 
          : 0
      }));

      const recent_activity = logs
        .sort((a: NotificationLog, b: NotificationLog) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
        .slice(0, 10);

      return {
        total_sent,
        total_delivered,
        total_clicked,
        total_failed,
        delivery_rate,
        click_rate,
        engagement_rate,
        top_notification_types,
        hourly_distribution,
        recent_activity
      };
    } catch (error) {
      console.error('Error calculating notification analytics:', error);
      return null;
    }
  }

  async getUserNotificationStats(userId: string): Promise<UserNotificationStats | null> {
    const analytics = await this.getNotificationAnalytics(userId);
    if (!analytics) return null;

    // Calculate engagement score (0-100)
    const engagement_score = Math.round(
      (analytics.delivery_rate + analytics.click_rate + analytics.engagement_rate) / 3
    );

    // Find preferred times (hours with highest engagement)
    const preferred_times = analytics.hourly_distribution
      .filter(h => h.count > 0)
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, 3)
      .map(h => h.hour);

    // Most engaged notification types
    const most_engaged_types = analytics.top_notification_types
      .filter(t => t.engagement_rate > 0)
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, 3)
      .map(t => t.type);

    const last_interaction = analytics.recent_activity.length > 0 
      ? analytics.recent_activity[0].sent_at 
      : new Date().toISOString();

    return {
      user_id: userId,
      total_notifications: analytics.total_sent,
      engagement_score,
      preferred_times,
      most_engaged_types,
      last_interaction
    };
  }

  // Task Integration
  async scheduleTaskReminder(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: string,
    reminderMinutes: number = 15
  ): Promise<string | null> {
    const scheduledFor = new Date(new Date(dueDate).getTime() - reminderMinutes * 60 * 1000);
    
    return await this.scheduleNotification(userId, {
      task_id: taskId,
      notification_type: 'task_reminder',
      title: `📚 Task Reminder`,
      body: `"${taskTitle}" is due in ${reminderMinutes} minutes!`,
      data: {
        taskId,
        url: `/dashboard?tab=tasks&task=${taskId}`,
        actions: [
          { action: 'complete', title: 'Mark Complete', icon: '✅' },
          { action: 'snooze', title: 'Snooze 10min', icon: '⏰' }
        ]
      },
      scheduled_for: scheduledFor.toISOString(),
      is_recurring: false
    });
  }

  async scheduleStudySessionReminder(
    userId: string,
    sessionTitle: string,
    sessionTime: string
  ): Promise<string | null> {
    return await this.scheduleNotification(userId, {
      notification_type: 'study_session',
      title: `📖 Study Session Starting`,
      body: `Time for your "${sessionTitle}" study session!`,
      data: {
        url: '/dashboard?tab=timetable',
        actions: [
          { action: 'start', title: 'Start Session', icon: '🚀' },
          { action: 'reschedule', title: 'Reschedule', icon: '📅' }
        ]
      },
      scheduled_for: sessionTime,
      is_recurring: false
    });
  }

  async sendAchievementNotification(
    userId: string,
    achievementTitle: string,
    achievementDescription: string
  ): Promise<string | null> {
    return await this.scheduleNotification(userId, {
      notification_type: 'achievement',
      title: `🏆 Achievement Unlocked!`,
      body: `"${achievementTitle}" - ${achievementDescription}`,
      data: {
        url: '/dashboard?tab=achievements',
        image: '/achievements/celebration.png',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Achievement', icon: '👀' },
          { action: 'share', title: 'Share', icon: '📤' }
        ]
      },
      scheduled_for: new Date().toISOString(),
      is_recurring: false
    });
  }
}

export const supabasePushService = SupabasePushService.getInstance(); 