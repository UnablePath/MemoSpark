import { supabasePushService } from './supabasePushService';
import { pushSubscriptionManager } from './pushSubscriptionManager';
import type { NotificationType, RichNotification } from './pushTypes';

export interface ScheduleTaskReminderParams {
  userId: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  reminderMinutes?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface ScheduleStudySessionParams {
  userId: string;
  sessionId?: string;
  sessionTitle: string;
  sessionTime: string;
  duration?: number;
  subject?: string;
}

export interface ScheduleBreakReminderParams {
  userId: string;
  studyDuration: number; // minutes
  breakType: 'short' | 'long';
}

export class NotificationScheduler {
  private static instance: NotificationScheduler;

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  // Schedule task reminders
  async scheduleTaskReminder(params: ScheduleTaskReminderParams): Promise<string | null> {
    const { userId, taskId, taskTitle, dueDate, reminderMinutes = 15, priority = 'medium' } = params;

    try {
      // Calculate scheduled time
      const scheduledFor = new Date(new Date(dueDate).getTime() - reminderMinutes * 60 * 1000);
      
      // Don't schedule if time is in the past
      if (scheduledFor.getTime() <= Date.now()) {
        console.warn('Task reminder time is in the past, not scheduling');
        return null;
      }

      const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
      const urgencyText = reminderMinutes <= 5 ? 'URGENT' : reminderMinutes <= 15 ? 'soon' : 'upcoming';

      return await supabasePushService.scheduleNotification(userId, {
        task_id: taskId,
        notification_type: 'task_reminder',
        title: `${priorityEmoji} Task Reminder`,
        body: `"${taskTitle}" is ${urgencyText} (due in ${reminderMinutes} minutes)`,
        data: {
          taskId,
          priority,
          url: `/dashboard?tab=tasks&task=${taskId}`,
          image: '/notifications/task-reminder.png',
          relatedTaskId: taskId,
          type: 'task_reminder',
          vibrate: priority === 'high' ? [300, 100, 300, 100, 300] : [200, 100, 200],
          requireInteraction: priority === 'high',
          actions: [
            { action: 'mark_complete', title: '✅ Complete', icon: '/icons/check.png' },
            { action: 'snooze_15', title: '⏰ Snooze 15m', icon: '/icons/snooze.png' },
            { action: 'view_task', title: '👀 View Task', icon: '/icons/view.png' }
          ]
        },
        scheduled_for: scheduledFor.toISOString(),
        is_recurring: false
      });
    } catch (error) {
      console.error('Failed to schedule task reminder:', error);
      return null;
    }
  }

  // Schedule multiple reminders for a task
  async scheduleMultipleTaskReminders(params: ScheduleTaskReminderParams): Promise<string[]> {
    const { reminderMinutes = 15 } = params;
    const reminderTimes = [reminderMinutes, Math.ceil(reminderMinutes / 2), 5]; // e.g., 15min, 7min, 5min
    
    const scheduledIds: string[] = [];
    
    for (const minutes of reminderTimes) {
      const id = await this.scheduleTaskReminder({
        ...params,
        reminderMinutes: minutes
      });
      if (id) {
        scheduledIds.push(id);
      }
    }
    
    return scheduledIds;
  }

  // Schedule study session reminders
  async scheduleStudySessionReminder(params: ScheduleStudySessionParams): Promise<string | null> {
    const { userId, sessionId, sessionTitle, sessionTime, duration = 60, subject } = params;

    try {
      const sessionStart = new Date(sessionTime);
      
      // Don't schedule if time is in the past
      if (sessionStart.getTime() <= Date.now()) {
        console.warn('Study session time is in the past, not scheduling');
        return null;
      }

      // Schedule 5 minutes before session
      const reminderTime = new Date(sessionStart.getTime() - 5 * 60 * 1000);

      return await supabasePushService.scheduleNotification(userId, {
        task_id: sessionId,
        notification_type: 'study_session',
        title: '📚 Study Session Starting Soon',
        body: `"${sessionTitle}" starts in 5 minutes${subject ? ` (${subject})` : ''}`,
        data: {
          sessionId,
          sessionTitle,
          duration,
          subject,
          url: '/dashboard?tab=timetable',
          image: '/notifications/study-session.png',
          actions: [
            { action: 'start', title: 'Start Now', icon: '▶️' },
            { action: 'snooze', title: 'Snooze 5min', icon: '⏰' },
            { action: 'reschedule', title: 'Reschedule', icon: '📅' }
          ],
          vibrate: [200, 100, 200],
          requireInteraction: false
        },
        scheduled_for: reminderTime.toISOString(),
        is_recurring: false
      });
    } catch (error) {
      console.error('Failed to schedule study session reminder:', error);
      return null;
    }
  }

  // Schedule break reminders during study sessions
  async scheduleBreakReminder(params: ScheduleBreakReminderParams): Promise<string | null> {
    const { userId, studyDuration, breakType } = params;

    try {
      const breakTime = new Date(Date.now() + studyDuration * 60 * 1000);
      const breakDuration = breakType === 'short' ? 5 : 15;
      const breakEmoji = breakType === 'short' ? '☕' : '🧘';

      return await supabasePushService.scheduleNotification(userId, {
        notification_type: 'break_reminder',
        title: `${breakEmoji} Time for a Break!`,
        body: `You've been studying for ${studyDuration} minutes. Take a ${breakDuration}-minute ${breakType} break.`,
        data: {
          breakType,
          breakDuration,
          studyDuration,
          url: '/dashboard?tab=focus',
          image: '/notifications/break-time.png',
          actions: [
            { action: 'start_break', title: `Start ${breakDuration}min Break`, icon: '🛌' },
            { action: 'continue', title: 'Keep Studying', icon: '📖' },
            { action: 'finish', title: 'End Session', icon: '✅' }
          ],
          vibrate: [100, 50, 100],
          requireInteraction: false
        },
        scheduled_for: breakTime.toISOString(),
        is_recurring: false
      });
    } catch (error) {
      console.error('Failed to schedule break reminder:', error);
      return null;
    }
  }

  // Send achievement notification immediately
  async sendAchievementNotification(
    userId: string,
    achievementTitle: string,
    achievementDescription: string,
    achievementType: string = 'general'
  ): Promise<boolean> {
    try {
      const notification: RichNotification = {
        title: '🏆 Achievement Unlocked!',
        body: `${achievementTitle}\n${achievementDescription}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: {
          achievementId: `achievement-${Date.now()}`,
          url: '/dashboard',
          actions: [
            { action: 'view', title: 'View Achievement', icon: '👀' },
            { action: 'continue', title: 'Keep Going!', icon: '🚀' }
          ]
        },
        actions: [
          { action: 'view', title: 'View Achievement', icon: '👀' },
          { action: 'continue', title: 'Keep Going!', icon: '🚀' }
        ],
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        timestamp: Date.now()
      };

      const success = await pushSubscriptionManager.sendRichNotification(notification, 'achievement');
      
      if (!success) {
        await supabasePushService.scheduleNotification(userId, {
          notification_type: 'achievement',
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          scheduled_for: new Date().toISOString(),
          is_recurring: false
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send achievement notification:', error);
      return false;
    }
  }

  // Schedule daily summary notifications
  async scheduleDailySummary(userId: string, preferredTime: string = '18:00'): Promise<string | null> {
    try {
      const [hours, minutes] = preferredTime.split(':').map(Number);
      const now = new Date();
      const scheduledFor = new Date();
      
      scheduledFor.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (scheduledFor.getTime() <= now.getTime()) {
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      }

      return await supabasePushService.scheduleNotification(userId, {
        notification_type: 'daily_summary',
        title: '📊 Your Study Summary',
        body: 'Check out what you accomplished today and plan for tomorrow!',
        data: {
          url: '/dashboard?tab=analytics',
          image: '/notifications/daily-summary.png',
          actions: [
            { action: 'view', title: 'View Summary', icon: '📊' },
            { action: 'plan', title: 'Plan Tomorrow', icon: '📅' },
            { action: 'dismiss', title: 'Dismiss', icon: '❌' }
          ],
          vibrate: [200, 100, 200],
          requireInteraction: false
        },
        scheduled_for: scheduledFor.toISOString(),
        is_recurring: true,
        recurrence_pattern: 'daily'
      });
    } catch (error) {
      console.error('Failed to schedule daily summary:', error);
      return null;
    }
  }

  // Process pending notifications (for server-side cron job integration)
  async processPendingNotifications(): Promise<void> {
    try {
      // This method is designed to be called by a server-side cron job
      // Query scheduled notifications that are due
      const pendingNotifications = await supabasePushService.getScheduledNotifications('system');
      
      // Filter notifications that are due
      const now = new Date();
      const dueNotifications = pendingNotifications.filter(notification => 
        notification.status === 'pending' && 
        new Date(notification.scheduled_for) <= now
      );

      // Send due notifications
      for (const notification of dueNotifications) {
        try {
          // Mark as sent first to prevent duplicate processing
          await supabasePushService.markNotificationAsSent(notification.id);
          
          // Send the notification via push service with all data including actions
          const richNotification: RichNotification = {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            actions: notification.data?.actions || [],
            icon: notification.data?.icon || '/favicon.ico',
            badge: notification.data?.badge || '/favicon.ico',
            image: notification.data?.image,
            requireInteraction: notification.data?.requireInteraction || false,
            vibrate: notification.data?.vibrate || [200, 100, 200],
            tag: notification.id,
            timestamp: Date.now()
          };
          
          await pushSubscriptionManager.sendRichNotification(richNotification, notification.notification_type);
          
        } catch (error) {
          console.error(`Failed to send scheduled notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      return await supabasePushService.cancelScheduledNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  // Get user's scheduled notifications
  async getUserScheduledNotifications(userId: string): Promise<any[]> {
    try {
      return await supabasePushService.getScheduledNotifications(userId, 'pending');
    } catch (error) {
      console.error('Failed to get user scheduled notifications:', error);
      return [];
    }
  }

  // Smart scheduling based on user's optimal times
  async scheduleSmartTaskReminder(params: ScheduleTaskReminderParams): Promise<string | null> {
    try {
      // Get user's notification stats to find optimal times
      const userStats = await supabasePushService.getUserNotificationStats(params.userId);
      
      if (userStats && userStats.preferred_times.length > 0) {
        // Adjust reminder time to user's most engaged hours if possible
        const dueTime = new Date(params.dueDate);
        const optimalHours = userStats.preferred_times;
        
        // Find the closest optimal hour before the due time
        let bestReminderTime = new Date(dueTime.getTime() - (params.reminderMinutes || 15) * 60 * 1000);
        
        for (const hour of optimalHours) {
          const candidateTime = new Date(dueTime);
          candidateTime.setHours(hour, 0, 0, 0);
          
          // Must be before due time and after current time
          if (candidateTime.getTime() < dueTime.getTime() && candidateTime.getTime() > Date.now()) {
            bestReminderTime = candidateTime;
            break;
          }
        }
        
        // Update the reminder time
        const updatedParams = {
          ...params,
          dueDate: dueTime.toISOString(),
          reminderMinutes: Math.round((dueTime.getTime() - bestReminderTime.getTime()) / (60 * 1000))
        };
        
        return await this.scheduleTaskReminder(updatedParams);
      }
      
      // Fallback to regular scheduling
      return await this.scheduleTaskReminder(params);
    } catch (error) {
      console.error('Failed to schedule smart task reminder:', error);
      return await this.scheduleTaskReminder(params);
    }
  }
}

export const notificationScheduler = NotificationScheduler.getInstance(); 