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
      
      if (!settings.enabled || task.is_completed) {
        return false;
      }

      const dueDate = new Date(task.due_date);
      const reminderOffset = task.reminder_offset_minutes || settings.defaultOffsetMinutes;
      const reminderTime = new Date(dueDate.getTime() - (reminderOffset * 60 * 1000));

      // Don't schedule if reminder time is in the past
      if (reminderTime <= new Date()) {
        console.log(`Reminder time is in the past for task ${task.id}`);
        return false;
      }

      // Check quiet hours
      if (this.isInQuietHours(reminderTime, settings)) {
        // Adjust to end of quiet hours
        reminderTime.setHours(parseInt(settings.quietHoursEnd!.split(':')[0]));
        reminderTime.setMinutes(parseInt(settings.quietHoursEnd!.split(':')[1]));
      }

      // Check weekends
      if (!settings.weekendsEnabled && this.isWeekend(reminderTime)) {
        // Move to next Monday
        const daysUntilMonday = (8 - reminderTime.getDay()) % 7;
        reminderTime.setDate(reminderTime.getDate() + daysUntilMonday);
        reminderTime.setHours(9, 0, 0, 0); // 9 AM on Monday
      }

      // Schedule the notification
      const success = await oneSignalService.scheduleNotification(
        task.user_id,
        {
          contents: { en: `⏰ Don't forget: "${task.title}" is due soon!` },
          headings: { en: '📋 Task Reminder' },
          data: { 
            taskId: task.id, 
            type: 'task_reminder', 
            dueDate: task.due_date,
            reminderType: 'scheduled'
          },
          url: `/dashboard?task=${task.id}`,
          android_channel_id: 'task_reminders',
          priority: 8,
          // Add action buttons
          buttons: [
            {
              id: 'mark_complete',
              text: 'Mark Complete',
              icon: 'https://your-domain.com/icons/check.png'
            },
            {
              id: 'snooze',
              text: 'Snooze 15min',
              icon: 'https://your-domain.com/icons/snooze.png'
            }
          ]
        },
        reminderTime
      );

      if (success) {
        console.log(`Scheduled reminder for task "${task.title}" at ${reminderTime.toISOString()}`);
      }

      return success;
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return false;
    }
  }

  /**
   * Schedule multiple reminders for a task (e.g., 1 day, 1 hour, 15 minutes before)
   */
  async scheduleMultipleReminders(task: Task, reminderOffsets: number[] = [1440, 60, 15]): Promise<boolean[]> {
    const results = await Promise.all(
      reminderOffsets.map(offset => 
        this.scheduleTaskReminder({ ...task, reminder_offset_minutes: offset })
      )
    );
    
    return results;
  }

  /**
   * Cancel reminders for a task (when completed or deleted)
   */
  async cancelTaskReminders(taskId: string, userId: string): Promise<boolean> {
    try {
      // OneSignal doesn't have a direct way to cancel scheduled notifications
      // We'll need to track them in our database and mark as cancelled
      
      // For now, we'll just log this - in production you'd update the database
      console.log(`Cancelled reminders for task ${taskId}`);
      
      return true;
    } catch (error) {
      console.error('Error cancelling task reminders:', error);
      return false;
    }
  }

  /**
   * Send immediate reminder for overdue tasks
   */
  async sendOverdueReminder(task: Task): Promise<boolean> {
    try {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const hoursOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60));

      let message = `⚠️ "${task.title}" is overdue!`;
      if (hoursOverdue > 24) {
        const daysOverdue = Math.floor(hoursOverdue / 24);
        message = `⚠️ "${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!`;
      } else if (hoursOverdue > 1) {
        message = `⚠️ "${task.title}" is ${hoursOverdue} hours overdue!`;
      }

      const success = await oneSignalService.sendNotification({
        contents: { en: message },
        headings: { en: '⚠️ Overdue Task' },
        include_external_user_ids: [task.user_id],
        data: { 
          taskId: task.id, 
          type: 'task_overdue', 
          dueDate: task.due_date,
          hoursOverdue 
        },
        url: `/dashboard?task=${task.id}`,
        android_channel_id: 'task_overdue',
        priority: 10, // High priority for overdue
        buttons: [
          {
            id: 'mark_complete',
            text: 'Mark Complete',
            icon: 'https://your-domain.com/icons/check.png'
          },
          {
            id: 'reschedule',
            text: 'Reschedule',
            icon: 'https://your-domain.com/icons/calendar.png'
          }
        ]
      });

      return !!success;
    } catch (error) {
      console.error('Error sending overdue reminder:', error);
      return false;
    }
  }

  /**
   * Send daily digest of upcoming tasks
   */
  async sendDailyDigest(userId: string, upcomingTasks: Task[]): Promise<boolean> {
    try {
      if (upcomingTasks.length === 0) {
        return false;
      }

      const taskCount = upcomingTasks.length;
      const taskList = upcomingTasks
        .slice(0, 3) // Show max 3 tasks
        .map(task => `• ${task.title}`)
        .join('\n');

      const message = taskCount > 3 
        ? `${taskList}\n... and ${taskCount - 3} more tasks`
        : taskList;

      const success = await oneSignalService.sendNotification({
        contents: { en: message },
        headings: { en: `📅 ${taskCount} task${taskCount > 1 ? 's' : ''} due today` },
        include_external_user_ids: [userId],
        data: { 
          type: 'daily_digest', 
          taskCount,
          taskIds: upcomingTasks.map(t => t.id)
        },
        url: '/dashboard',
        android_channel_id: 'daily_digest',
        priority: 6,
        // Schedule for 9 AM user's local time
        delivery_time_of_day: '9:00AM',
        buttons: [
          {
            id: 'view_tasks',
            text: 'View Tasks',
            icon: 'https://your-domain.com/icons/tasks.png'
          }
        ]
      });

      return !!success;
    } catch (error) {
      console.error('Error sending daily digest:', error);
      return false;
    }
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

  /**
   * Check if date is weekend
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
}

// Export singleton instance
export const taskReminderService = new TaskReminderService(); 