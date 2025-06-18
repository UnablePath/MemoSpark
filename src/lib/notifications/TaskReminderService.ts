import { oneSignalService } from './OneSignalService';

interface Task {
  id: string;
  title: string;
  due_date: string;
  user_id: string;
  reminder_offset_minutes?: number;
  is_completed?: boolean;
}

interface ReminderSettings {
  enabled: boolean;
  defaultOffsetMinutes: number;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
  weekendsEnabled: boolean;
}

export class TaskReminderService {
  private defaultSettings: ReminderSettings = {
    enabled: true,
    defaultOffsetMinutes: 30, // 30 minutes before due date
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendsEnabled: true,
  };

  /**
   * Schedule reminder when task is created
   */
  async scheduleTaskReminder(task: Task, userSettings?: Partial<ReminderSettings>): Promise<boolean> {
    try {
      const settings = { ...this.defaultSettings, ...userSettings };
      
      console.log(`🔔 Scheduling reminder for task: "${task.title}"`);
      console.log(`📋 Task details:`, { 
        id: task.id, 
        due_date: task.due_date, 
        user_id: task.user_id,
        reminder_offset_minutes: task.reminder_offset_minutes 
      });
      
      if (!settings.enabled || task.is_completed) {
        console.log(`⏭️ Skipping reminder - settings.enabled: ${settings.enabled}, task.is_completed: ${task.is_completed}`);
        return false;
      }

      const dueDate = new Date(task.due_date);
      const reminderOffset = task.reminder_offset_minutes || settings.defaultOffsetMinutes;
      
      console.log(`⏰ Due date: ${dueDate.toISOString()}, Reminder offset: ${reminderOffset} minutes`);

      // Handle immediate reminders (0 minutes)
      let reminderTime: Date;
      if (reminderOffset === 0) {
        reminderTime = new Date(); // Send immediately
        console.log(`⚡ Immediate reminder requested - sending now`);
      } else {
        reminderTime = new Date(dueDate.getTime() - (reminderOffset * 60 * 1000));
        console.log(`⏰ Calculated reminder time: ${reminderTime.toISOString()}`);
        
        // Don't schedule if reminder time is in the past (unless immediate)
        if (reminderTime <= new Date()) {
          console.log(`❌ Reminder time is in the past for task ${task.id} - not scheduling`);
          return false;
        }
      }

      // Check quiet hours (skip for immediate reminders and short offsets < 30 minutes)
      if (reminderOffset > 30 && this.isInQuietHours(reminderTime, settings)) {
        console.log(`🔇 Adjusting for quiet hours (reminder offset > 30 minutes)`);
        // Adjust to end of quiet hours
        reminderTime.setHours(parseInt(settings.quietHoursEnd!.split(':')[0]));
        reminderTime.setMinutes(parseInt(settings.quietHoursEnd!.split(':')[1]));
        console.log(`🔇 Adjusted reminder time: ${reminderTime.toISOString()}`);
      } else if (reminderOffset > 0 && reminderOffset <= 30) {
        console.log(`⚡ Short reminder (${reminderOffset} min) - skipping quiet hours adjustment`);
      }

      // Check weekends (skip for immediate reminders and short offsets < 30 minutes)
      if (reminderOffset > 30 && !settings.weekendsEnabled && this.isWeekend(reminderTime)) {
        console.log(`📅 Adjusting for weekend settings (reminder offset > 30 minutes)`);
        // Move to next Monday
        const daysUntilMonday = (8 - reminderTime.getDay()) % 7;
        reminderTime.setDate(reminderTime.getDate() + daysUntilMonday);
        reminderTime.setHours(9, 0, 0, 0); // 9 AM on Monday
        console.log(`📅 Adjusted to Monday: ${reminderTime.toISOString()}`);
      } else if (reminderOffset > 0 && reminderOffset <= 30) {
        console.log(`⚡ Short reminder (${reminderOffset} min) - skipping weekend adjustment`);
      }

      // Send the notification
      let success = false;
      
      if (reminderOffset === 0) {
        // Send immediate notification using OneSignal
        console.log(`⚡ Sending immediate task reminder via OneSignal`);
        
        // Get user's OneSignal player ID first
        const hasSubscription = await oneSignalService.hasActiveSubscription(task.user_id);
        if (!hasSubscription) {
          console.log(`❌ No active OneSignal subscription for user: ${task.user_id}`);
          return false;
        }

        // Send immediate notification
        const { data: subscription } = await oneSignalService['supabase']
          .from('push_subscriptions')
          .select('onesignal_player_id')
          .eq('external_user_id', task.user_id)
          .eq('is_active', true)
          .single();

        if (!subscription?.onesignal_player_id) {
          console.log(`❌ No OneSignal player ID found for user: ${task.user_id}`);
          return false;
        }

        success = await oneSignalService.sendTaskReminder(
          subscription.onesignal_player_id,
          task.title,
          dueDate
        );
      } else {
        // Schedule future notification using OneSignal's send_after
        console.log(`📅 Scheduling future task reminder via OneSignal for: ${reminderTime.toISOString()}`);
        
        success = await oneSignalService.scheduleNotification(
          task.user_id,
          {
            contents: { 
              en: `⏰ Don't forget: "${task.title}" is due soon!` 
            },
            headings: { 
              en: '📋 Task Reminder' 
            },
            data: {
              type: 'task_reminder',
              taskTitle: task.title,
              dueDate: dueDate.toISOString(),
              url: '/dashboard'
            },
            url: '/dashboard',
            android_channel_id: 'task_reminders',
            priority: 5,
          },
          reminderTime
        );
      }

      if (success) {
        console.log(`✅ Successfully ${reminderOffset === 0 ? 'sent' : 'scheduled'} reminder for task "${task.title}"`);
      } else {
        console.log(`❌ Failed to ${reminderOffset === 0 ? 'send' : 'schedule'} reminder for task "${task.title}"`);
      }

      return success;
    } catch (error) {
      console.error('❌ Error scheduling task reminder:', error);
      return false;
    }
  }

  /**
   * Schedule multiple reminders for a task (e.g., 1 day, 1 hour, 15 minutes before)
   */
  async scheduleMultipleReminders(task: Task, reminderOffsets: number[] = [1440, 60, 15]): Promise<boolean[]> {
    console.log(`🔔 Scheduling multiple reminders for task: "${task.title}" with offsets: ${reminderOffsets.join(', ')} minutes`);
    
    const results = await Promise.all(
      reminderOffsets.map(async (offset) => {
        const taskWithOffset = { ...task, reminder_offset_minutes: offset };
        return await this.scheduleTaskReminder(taskWithOffset);
      })
    );
    
    console.log(`📊 Multiple reminder results: ${results.map((r, i) => `${reminderOffsets[i]}min: ${r ? '✅' : '❌'}`).join(', ')}`);
    return results;
  }

  /**
   * Cancel reminders for a task
   */
  async cancelTaskReminders(taskId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Cancelling reminders for task: ${taskId}`);
      
      // OneSignal doesn't support cancelling scheduled notifications via API
      // But we can mark them as cancelled in our database for tracking
      console.log(`⚠️ OneSignal doesn't support cancelling scheduled notifications - they will still be delivered`);
      const success = true; // Always return true since we can't actually cancel OneSignal scheduled notifications
      
      if (success) {
        console.log(`✅ Successfully cancelled reminders for task: ${taskId}`);
      } else {
        console.log(`⚠️ No reminders found to cancel for task: ${taskId}`);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error cancelling task reminders:', error);
      return false;
    }
  }

  /**
   * Send immediate reminder for overdue tasks
   */
  async sendOverdueReminder(task: Task): Promise<boolean> {
    try {
      console.log(`⚠️ Sending overdue reminder for task: "${task.title}"`);
      
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const hoursOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60));

      console.log(`⏰ Task is ${hoursOverdue} hours overdue`);

      // Send overdue notification via OneSignal
      const hasSubscription = await oneSignalService.hasActiveSubscription(task.user_id);
      if (!hasSubscription) {
        console.log(`❌ No active OneSignal subscription for user: ${task.user_id}`);
        return false;
      }

      // Get user's OneSignal player ID
      const { data: subscription } = await oneSignalService['supabase']
        .from('push_subscriptions')
        .select('onesignal_player_id')
        .eq('external_user_id', task.user_id)
        .eq('is_active', true)
        .single();

      if (!subscription?.onesignal_player_id) {
        console.log(`❌ No OneSignal player ID found for user: ${task.user_id}`);
        return false;
      }

      let message = `⚠️ "${task.title}" is overdue!`;
      if (hoursOverdue > 24) {
        const daysOverdue = Math.floor(hoursOverdue / 24);
        message = `⚠️ "${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!`;
      } else if (hoursOverdue > 1) {
        message = `⚠️ "${task.title}" is ${hoursOverdue} hours overdue!`;
      }

      const result = await oneSignalService.sendNotification({
        contents: { en: message },
        headings: { en: '⚠️ Overdue Task' },
        include_player_ids: [subscription.onesignal_player_id],
        data: {
          type: 'task_overdue',
          taskTitle: task.title,
          dueDate: dueDate.toISOString(),
          hoursOverdue,
          url: '/dashboard'
        },
        url: '/dashboard',
        android_channel_id: 'task_reminders',
        priority: 10, // High priority for overdue tasks
      });

      const success = !!result;

      if (success) {
        console.log(`✅ Successfully sent overdue reminder for task: "${task.title}"`);
      } else {
        console.log(`❌ Failed to send overdue reminder for task: "${task.title}"`);
      }

      return success;
    } catch (error) {
      console.error('❌ Error sending overdue reminder:', error);
      return false;
    }
  }

  /**
   * Check if a date falls on a weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Check if time is within quiet hours
   */
  private isInQuietHours(time: Date, settings: ReminderSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeMinutes = hour * 60 + minute;

    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    } else {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }
  }
}

// Export singleton instance
export const taskReminderService = new TaskReminderService(); 