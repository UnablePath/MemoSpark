'use server'

import { oneSignalService } from '@/lib/notifications/OneSignalService';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Type definitions
interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// OneSignal subscription management
export async function subscribeUser(playerId: string, userAgent?: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    await oneSignalService.storePlayerSubscription(userId, playerId);

    revalidatePath('/settings');
    return { success: true, data: { subscribed: true, playerId } };
  } catch (error) {
    console.error('Error in subscribeUser action:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function unsubscribeUser(playerId: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    await oneSignalService.removePlayerSubscription(playerId);

    revalidatePath('/settings');
    return { success: true, data: { unsubscribed: true } };
  } catch (error) {
    console.error('Error in unsubscribeUser action:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Real-time task reminder - no cron dependency
export async function sendTaskReminder(taskId: string, taskTitle: string, dueDate: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Send via OneSignal for real-time delivery
    const success = await oneSignalService.sendTaskReminder(
      userId, 
      taskTitle, 
      new Date(dueDate)
    );

    if (success) {
      return { success: true, data: { sent: true } };
    }
    return { success: false, error: 'Failed to send notification' };
  } catch (error) {
    console.error('Error in sendTaskReminder action:', error);
    return { success: false, error: 'Failed to send task reminder' };
  }
}

// Schedule task reminder based on reminder settings
export async function scheduleTaskReminder(
  taskId: string, 
  taskTitle: string, 
  dueDate: string, 
  reminderOffsetMinutes: number
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Calculate reminder time
    const dueDateObj = new Date(dueDate);
    const reminderTime = new Date(dueDateObj.getTime() - (reminderOffsetMinutes * 60 * 1000));

    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      const success = await oneSignalService.scheduleNotification(
        userId,
        {
          contents: { en: `⏰ Don't forget: "${taskTitle}" is due soon!` },
          headings: { en: '📋 Task Reminder' },
          data: { taskId, type: 'task_reminder', dueDate },
          url: `/dashboard?task=${taskId}`,
          android_channel_id: 'task_reminders',
          priority: 8,
        },
        reminderTime
      );

      return { 
        success: success, 
        data: { 
          scheduled: success, 
          reminderTime: reminderTime.toISOString() 
        } 
      };
    }
    return { success: false, error: 'Reminder time is in the past' };
  } catch (error) {
    console.error('Error scheduling task reminder:', error);
    return { success: false, error: 'Failed to schedule task reminder' };
  }
}

export async function sendAchievementNotification(achievementName: string, description: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const success = await oneSignalService.sendAchievementNotification(userId, achievementName);

    return { success: true, data: { sent: success } };
  } catch (error) {
    console.error('Error in sendAchievementNotification action:', error);
    return { success: false, error: 'Failed to send achievement notification' };
  }
}

export async function sendBreakSuggestion(message?: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const success = await oneSignalService.sendStudyBreakSuggestion(
      userId, 
      message || "You've been studying for a while. Consider taking a 15-minute break to recharge!"
    );

    return { success: true, data: { sent: success } };
  } catch (error) {
    console.error('Error in sendBreakSuggestion action:', error);
    return { success: false, error: 'Failed to send break suggestion' };
  }
}

// Generic notification sending
export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  url?: string
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await oneSignalService.sendNotification({
      contents: { en: body },
      headings: { en: title },
      data: data || {},
      url: url || '/dashboard',
      android_channel_id: 'general',
      priority: 6,
    });

    return { success: !!result, data: { notificationId: result } };
  } catch (error) {
    console.error('Error in sendNotification action:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Analytics functions
export async function trackNotificationClick(notificationId: string, additionalData?: Record<string, unknown>): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // OneSignal handles click tracking automatically via webhooks
    // This is just for additional custom tracking if needed
    console.log('Notification clicked:', { notificationId, userId, additionalData });

    return { success: true, data: { tracked: true } };
  } catch (error) {
    console.error('Error in trackNotificationClick action:', error);
    return { success: false, error: 'Failed to track notification click' };
  }
}

export async function trackNotificationDismiss(notificationId: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // OneSignal handles dismiss tracking automatically via webhooks
    console.log('Notification dismissed:', { notificationId, userId });

    return { success: true, data: { tracked: true } };
  } catch (error) {
    console.error('Error in trackNotificationDismiss action:', error);
    return { success: false, error: 'Failed to track notification dismiss' };
  }
}

// Get user notification analytics
export async function getUserNotificationAnalytics(days = 30): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const analytics = await oneSignalService.getUserNotificationAnalytics(userId, days);

    return { success: true, data: analytics };
  } catch (error) {
    console.error('Error in getUserNotificationAnalytics action:', error);
    return { success: false, error: 'Failed to get notification analytics' };
  }
}

// Legacy compatibility functions (simplified)
export async function processNotificationQueue(): Promise<ActionResult> {
  // OneSignal handles queuing automatically, so this is a no-op
  return { success: true, data: { processed: 0, message: 'OneSignal handles queuing automatically' } };
}

export async function getUserNotificationCategories(): Promise<ActionResult> {
  // OneSignal uses predefined categories
  const categories = [
    { id: 'task_reminders', name: 'Task Reminders', description: 'Notifications about upcoming tasks' },
    { id: 'achievements', name: 'Achievements', description: 'Celebration notifications for milestones' },
    { id: 'study_breaks', name: 'Study Breaks', description: 'Suggestions for taking breaks' },
    { id: 'streaks', name: 'Streaks', description: 'Study streak milestone notifications' },
    { id: 'general', name: 'General', description: 'General app notifications' },
  ];

  return { success: true, data: categories };
}

const DEFAULT_NOTIF_PREFS: Record<string, { enabled: boolean; quietHours: boolean }> = {
  task_reminders: { enabled: true, quietHours: false },
  achievements: { enabled: true, quietHours: false },
  study_breaks: { enabled: true, quietHours: true },
  streaks: { enabled: true, quietHours: false },
  general: { enabled: true, quietHours: true },
  social: { enabled: true, quietHours: false },
};

export async function getUserNotificationPreferences(): Promise<ActionResult> {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createAuthenticatedSupabaseClient(
      wrapClerkTokenForSupabase(getToken),
    );
    if (!supabase) {
      return { success: true, data: DEFAULT_NOTIF_PREFS };
    }

    const { data: row, error } = await supabase
      .from('clerk_notification_preferences')
      .select('categories')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (error || !row?.categories) {
      return { success: true, data: { ...DEFAULT_NOTIF_PREFS } };
    }

    const raw = row.categories as Record<string, { enabled?: boolean; quietHours?: boolean }>;
    const merged = { ...DEFAULT_NOTIF_PREFS };
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === 'object') {
        merged[k] = {
          enabled: v.enabled !== false,
          quietHours: Boolean(v.quietHours),
        };
      }
    }
    return { success: true, data: merged };
  } catch (error) {
    console.error('Error in getUserNotificationPreferences action:', error);
    return { success: false, error: 'Failed to get notification preferences' };
  }
}

export async function updateNotificationPreferences(
  categoryId: string, 
  preferences: {
    enabled?: boolean;
    quietHours?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createAuthenticatedSupabaseClient(
      wrapClerkTokenForSupabase(getToken),
    );
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    const { data: row } = await supabase
      .from('clerk_notification_preferences')
      .select('categories')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    const prev = (row?.categories as Record<string, { enabled: boolean; quietHours: boolean }>) ?? {};
    const next = {
      ...DEFAULT_NOTIF_PREFS,
      ...prev,
      [categoryId]: {
        enabled: preferences.enabled !== false,
        quietHours: Boolean(preferences.quietHours),
      },
    };

    const { error } = await supabase
      .from('clerk_notification_preferences')
      .upsert(
        {
          clerk_user_id: userId,
          categories: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id' },
      );

    if (error) {
      console.error('clerk_notification_preferences upsert:', error);
      return { success: false, error: 'Failed to save notification preferences' };
    }

    revalidatePath('/settings');
    return { success: true, data: { updated: true, message: 'Preferences saved' } };
  } catch (error) {
    console.error('Error in updateNotificationPreferences action:', error);
    return { success: false, error: 'Failed to update notification preferences' };
  }
} 