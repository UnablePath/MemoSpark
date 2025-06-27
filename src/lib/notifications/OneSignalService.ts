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
  
  // Android-specific
  android_channel_id?: string;
  small_icon?: string;
  large_icon?: string;
  
  // iOS-specific APNS configuration
  ios_badgeType?: 'None' | 'SetTo' | 'Increase';
  ios_badgeCount?: number;
  ios_sound?: string;
  ios_category?: string;
  apns_alert?: {
    title?: string;
    subtitle?: string;
    body?: string;
  };
  ios_attachments?: {
    id: string;
    url: string;
    type?: string;
  }[];
  mutable_content?: boolean;
  content_available?: boolean;
  ios_interruption_level?: 'passive' | 'active' | 'time-sensitive' | 'critical';
  
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
      // Use iOS-optimized notification for better delivery
      return await this.sendIOSTaskReminder(playerId, taskTitle, reminderTime);
    } catch (error) {
      console.error('Failed to send task reminder:', error);
      
      // Fallback to basic notification
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
          // iOS-specific fallback settings
          ios_sound: 'default',
          ios_category: 'TASK_REMINDER',
          ios_badgeType: 'Increase',
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
    }
  }

  async sendAchievementNotification(playerId: string, achievementTitle: string): Promise<boolean> {
    try {
      // Use iOS-optimized notification for achievements
      const result = await this.sendIOSOptimizedNotification(
        playerId,
        '🎉 Achievement Unlocked!',
        `Congratulations! You earned: ${achievementTitle}`,
        {
          subtitle: 'Great job on your progress!',
          category: 'ACHIEVEMENT',
          sound: 'tri-tone.caf', // Celebratory sound for achievements
          interruptionLevel: 'active',
          actionButtons: [
            { id: 'view', text: '🏆 View Achievement', url: '/dashboard?tab=achievements' },
            { id: 'share', text: '📱 Share', url: '/dashboard?share=achievement' }
          ],
          data: {
            type: 'achievement',
            achievement_title: achievementTitle,
          },
          url: '/dashboard?tab=achievements'
        }
      );

      return !!result;
    } catch (error) {
      console.error('Failed to send achievement notification:', error);
      
      // Fallback to basic notification
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
          url: '/dashboard?tab=achievements',
          // iOS-specific fallback settings
          ios_sound: 'tri-tone.caf',
          ios_category: 'ACHIEVEMENT',
          ios_badgeType: 'Increase',
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
    }
  }

  async sendBreakSuggestion(playerId: string, message: string): Promise<boolean> {
    try {
      // Use iOS-optimized notification for break suggestions
      const result = await this.sendIOSOptimizedNotification(
        playerId,
        '🌟 Take a Break',
        message,
        {
          subtitle: 'Your wellbeing matters',
          category: 'WELLNESS',
          sound: 'default',
          interruptionLevel: 'passive', // Non-intrusive for wellness suggestions
          actionButtons: [
            { id: 'break', text: '☕ Take Break', url: '/dashboard?tab=wellness' },
            { id: 'continue', text: '📚 Keep Studying', url: '/dashboard' }
          ],
          data: {
            type: 'break_suggestion',
            message,
          },
          url: '/dashboard?tab=wellness'
        }
      );

      return !!result;
    } catch (error) {
      console.error('Failed to send break suggestion:', error);
      
      // Fallback to basic notification
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
          url: '/dashboard?tab=wellness',
          // iOS-specific fallback settings
          ios_sound: 'default',
          ios_category: 'WELLNESS',
          ios_badgeType: 'None', // Don't increase badge for wellness suggestions
        }),
      });

      const result = await response.json();
      return response.ok && result.success;
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
      const { data: subscription, error } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('external_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !subscription?.onesignal_player_id) return false;

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
      const { data: subscription, error } = await this.supabase
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('external_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !subscription?.onesignal_player_id) return false;

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
            clerk_user_id: userId, // Use clerk_user_id instead of user_id
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
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select('onesignal_player_id')
      .eq('external_user_id', userId)
      .eq('is_active', true)
      .maybeSingle(); // Use maybeSingle to avoid 406 error when no record found

    if (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }

    return !!data?.onesignal_player_id;
  }

  /**
   * Check iOS-specific notification permissions and provide troubleshooting info
   */
  async checkiOSPermissions(): Promise<{
    isSupported: boolean;
    permission: string;
    issues: string[];
    suggestions: string[];
  }> {
    const result = {
      isSupported: false,
      permission: 'unknown',
      issues: [] as string[],
      suggestions: [] as string[]
    };

    try {
      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSPWA = window.navigator.standalone;
      
      if (!isIOS) {
        result.issues.push('Not running on iOS device');
        return result;
      }

      result.isSupported = true;

      // Check Safari version for PWA support
      const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
      const safariVersion = safariMatch ? parseFloat(safariMatch[1]) : 0;
      
      if (safariVersion < 11.3) {
        result.issues.push(`Safari ${safariVersion} detected. iOS 11.3+ required for PWA notifications`);
        result.suggestions.push('Update iOS to version 11.3 or later');
      }

      // Check if app is installed as PWA
      if (!isIOSPWA) {
        result.issues.push('App not installed as PWA');
        result.suggestions.push('Install app to Home Screen for notification support');
        result.suggestions.push('Use Safari Share button → "Add to Home Screen"');
      }

      // Check OneSignal permission status
      if (window.OneSignal) {
        result.permission = window.OneSignal.Notifications.permission ? 'granted' : 'default';
        
        if (result.permission === 'default') {
          result.suggestions.push('Tap "Allow" when prompted for notifications');
        } else if (result.permission === 'denied') {
          result.issues.push('Notifications blocked by user');
          result.suggestions.push('Go to iPhone Settings → Notifications → [App Name] to enable');
        }
      } else {
        result.issues.push('OneSignal not loaded');
      }

      // Check for notification API support
      if (!('Notification' in window)) {
        result.issues.push('Notification API not supported');
      }

      return result;
    } catch (error) {
      console.error('Error checking iOS permissions:', error);
      result.issues.push('Error checking permissions');
      return result;
    }
  }

  /**
   * Set iOS badge count for the app
   */
  async setiOSBadgeCount(count: number): Promise<boolean> {
    try {
      if (!window.OneSignal) {
        console.error('OneSignal not available for badge management');
        return false;
      }

      // OneSignal handles badge count automatically, but we can send a silent notification to update it
      const result = await this.sendNotification({
        include_player_ids: [], // No specific users, just badge update
        contents: { en: '' }, // Silent notification
        headings: { en: '' },
        ios_badgeType: 'SetTo',
        ios_badgeCount: Math.max(0, count),
        content_available: true, // Makes it a silent notification
        priority: 1 // Low priority for badge-only updates
      });

      return !!result;
    } catch (error) {
      console.error('Error setting iOS badge count:', error);
      return false;
    }
  }

  /**
   * Send iOS-optimized notification with enhanced APNS configuration
   */
  async sendIOSOptimizedNotification(
    playerId: string, 
    title: string, 
    message: string, 
    options: {
      subtitle?: string;
      category?: string;
      sound?: string;
      badge?: number;
      interruptionLevel?: 'passive' | 'active' | 'time-sensitive' | 'critical';
      attachments?: { id: string; url: string; type?: string }[];
      actionButtons?: { id: string; text: string; url?: string }[];
      data?: Record<string, any>;
      url?: string;
    } = {}
  ): Promise<OneSignalResponse | null> {
    try {
      const notification: Partial<OneSignalNotification> = {
        include_player_ids: [playerId],
        contents: { en: message },
        headings: { en: title },
        
        // iOS-specific APNS configuration
        apns_alert: {
          title,
          subtitle: options.subtitle,
          body: message
        },
        ios_sound: options.sound || 'default',
        ios_category: options.category || 'STUDYSPARK_NOTIFICATION',
        ios_interruption_level: options.interruptionLevel || 'active',
        mutable_content: true, // Enables notification service extensions
        
        // Badge management
        ios_badgeType: options.badge !== undefined ? 'SetTo' : 'Increase',
        ios_badgeCount: options.badge,
        
        // Attachments (images, etc.)
        ios_attachments: options.attachments,
        
        // Action buttons
        buttons: options.actionButtons,
        
        // Data and URL
        data: {
          ...options.data,
          ios_optimized: true,
          sent_at: new Date().toISOString()
        },
        url: options.url,
        
        // High priority for iOS notifications
        priority: options.interruptionLevel === 'critical' ? 10 : 8,
        ttl: 259200 // 3 days
      };

      return await this.sendNotification(notification);
    } catch (error) {
      console.error('Error sending iOS-optimized notification:', error);
      return null;
    }
  }

  /**
   * Send iOS task reminder with proper APNS configuration
   */
  async sendIOSTaskReminder(
    playerId: string, 
    taskTitle: string, 
    reminderTime: Date,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      minutesUntilDue?: number;
    } = {}
  ): Promise<boolean> {
    const { priority = 'medium', minutesUntilDue } = options;
    
    // Determine message and urgency based on time remaining
    let message = `Don't forget: ${taskTitle}`;
    let interruptionLevel: 'passive' | 'active' | 'time-sensitive' | 'critical' = 'active';
    let sound = 'default';
    
    if (minutesUntilDue !== undefined) {
      if (minutesUntilDue <= 5) {
        message = `🚨 URGENT: "${taskTitle}" is due in ${minutesUntilDue} minutes!`;
        interruptionLevel = 'critical';
        sound = 'alarm.caf';
      } else if (minutesUntilDue <= 30) {
        message = `⏰ "${taskTitle}" is due in ${minutesUntilDue} minutes`;
        interruptionLevel = 'time-sensitive';
      } else if (minutesUntilDue <= 60) {
        message = `📅 "${taskTitle}" is due within the hour`;
      }
    }

    // Priority-based sound selection
    if (priority === 'urgent') {
      sound = 'alarm.caf';
      interruptionLevel = 'critical';
    } else if (priority === 'high') {
      sound = 'tri-tone.caf';
      interruptionLevel = 'time-sensitive';
    }

    try {
      const result = await this.sendIOSOptimizedNotification(
        playerId,
        '📚 Task Reminder',
        message,
        {
          subtitle: `Due: ${reminderTime.toLocaleTimeString()}`,
          category: 'TASK_REMINDER',
          sound,
          interruptionLevel,
          actionButtons: [
            { id: 'complete', text: '✅ Mark Complete', url: '/dashboard?complete=true' },
            { id: 'snooze', text: '⏰ Snooze 15min', url: '/dashboard?snooze=15' }
          ],
          data: {
            type: 'task_reminder',
            task_title: taskTitle,
            reminder_time: reminderTime.toISOString(),
            priority,
            minutes_until_due: minutesUntilDue
          },
          url: '/dashboard'
        }
      );

      if (result) {
        await this.trackNotificationEvent(playerId.split('-')[0] || playerId, result.id, 'sent', 'task_reminder');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to send iOS task reminder:', error);
      return false;
    }
  }

  /**
   * Test iOS notification configuration and delivery
   */
  async testiOSNotificationDelivery(playerId: string): Promise<{
    success: boolean;
    issues: string[];
    notificationId?: string;
  }> {
    const result = {
      success: false,
      issues: [] as string[],
      notificationId: undefined as string | undefined
    };

    try {
      // Check iOS permissions first
      const permissionCheck = await this.checkiOSPermissions();
      if (permissionCheck.issues.length > 0) {
        result.issues.push(...permissionCheck.issues);
      }

      // Send test notification
      const testNotification = await this.sendIOSOptimizedNotification(
        playerId,
        '🧪 iOS Test Notification',
        'If you see this, iOS notifications are working correctly!',
        {
          subtitle: 'StudySpark Notification Test',
          category: 'TEST_NOTIFICATION',
          sound: 'default',
          interruptionLevel: 'active',
          actionButtons: [
            { id: 'success', text: '✅ Working!', url: '/dashboard?test=success' }
          ],
          data: {
            type: 'ios_test',
            timestamp: new Date().toISOString()
          }
        }
      );

      if (testNotification) {
        result.success = true;
        result.notificationId = testNotification.id;
      } else {
        result.issues.push('Failed to send test notification');
      }

    } catch (error) {
      console.error('Error testing iOS notification delivery:', error);
      result.issues.push(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

// Export singleton instance
export const oneSignalService = OneSignalService.getInstance(); 