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
  quietHoursStart?: string;
  quietHoursEnd?: string;
  weekendsEnabled: boolean;
}

async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response | null> {
  try {
    return await fetch(input, init);
  } catch {
    return null;
  }
}

export class TaskReminderService {
  private defaultSettings: ReminderSettings = {
    enabled: true,
    defaultOffsetMinutes: 30,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendsEnabled: true,
  };

  /**
   * Validate reminder intent. Actual delivery is queued in Postgres when
   * `tasks` rows carry `due_date` and `reminder_settings` — see DB triggers.
   */
  async scheduleTaskReminder(
    task: Task,
    userSettings?: Partial<ReminderSettings>,
  ): Promise<boolean> {
    try {
      const settings = { ...this.defaultSettings, ...userSettings };

      if (!settings.enabled || task.is_completed) {
        return false;
      }

      const dueDate = new Date(task.due_date);
      const reminderOffset =
        task.reminder_offset_minutes ?? settings.defaultOffsetMinutes;

      let reminderTime: Date;
      if (reminderOffset === 0) {
        reminderTime = new Date();
      } else {
        reminderTime = new Date(
          dueDate.getTime() - reminderOffset * 60 * 1000,
        );
        const now = new Date();
        if (reminderTime <= now) {
          if (dueDate > now) {
            reminderTime = new Date(now.getTime() + 60 * 1000);
          } else {
            return false;
          }
        }
      }

      if (reminderOffset > 30 && this.isInQuietHours(reminderTime, settings)) {
        reminderTime.setHours(
          Number.parseInt(settings.quietHoursEnd?.split(':')[0] ?? '8', 10),
        );
        reminderTime.setMinutes(
          Number.parseInt(settings.quietHoursEnd?.split(':')[1] ?? '0', 10),
        );
      }

      if (
        reminderOffset > 30 &&
        !settings.weekendsEnabled &&
        this.isWeekend(reminderTime)
      ) {
        const daysUntilMonday = (8 - reminderTime.getDay()) % 7;
        reminderTime.setDate(reminderTime.getDate() + daysUntilMonday);
        reminderTime.setHours(9, 0, 0, 0);
      }

      console.log('[task-reminders]', {
        taskId: task.id,
        validatedReminderISO: reminderTime.toISOString(),
        note:
          'Queue rows are inserted by Postgres notify_user when tasks are saved.',
      });
      return true;
    } catch (error) {
      console.error('[task-reminders]', error);
      return false;
    }
  }

  async scheduleMultipleReminders(
    task: Task,
    reminderOffsets: number[] = [1440, 60, 15],
  ): Promise<boolean[]> {
    return await Promise.all(
      reminderOffsets.map(async (offset) => {
        const taskWithOffset = { ...task, reminder_offset_minutes: offset };
        return await this.scheduleTaskReminder(taskWithOffset);
      }),
    );
  }

  async cancelTaskReminders(taskId: string, userId: string): Promise<boolean> {
    try {
      const response = await safeFetch('/api/push/cancel-by-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
        credentials: 'include',
      });

      return Boolean(response?.ok);
    } catch (error) {
      console.error('[task-reminders:cancel]', error);
      return false;
    }
  }

  async sendOverdueReminder(task: Task): Promise<boolean> {
    try {
      const now = new Date();
      const dueDate = new Date(task.due_date);
      const hoursOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60),
      );

      let message = `"${task.title}" is overdue.`;
      if (hoursOverdue > 24) {
        const daysOverdue = Math.floor(hoursOverdue / 24);
        message = `"${task.title}" is ${daysOverdue} day${
          daysOverdue > 1 ? 's' : ''
        } overdue.`;
      } else if (hoursOverdue > 1) {
        message = `"${task.title}" is ${hoursOverdue} hours overdue.`;
      }

      const response = await safeFetch('/api/push/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientUserId: task.user_id,
          category: 'task_reminder',
          title: 'Overdue task',
          body: message,
          url: '/dashboard',
          sourceType: 'task',
          sourceId: task.id,
          scheduledFor: new Date().toISOString(),
          extra: {
            hoursOverdue,
            taskTitle: task.title,
          },
        }),
      });

      return Boolean(response?.ok);
    } catch (error) {
      console.error('[task-reminders:overdue]', error);
      return false;
    }
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isInQuietHours(time: Date, settings: ReminderSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeMinutes = hour * 60 + minute;

    const [startHour, startMin] =
      settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] =
      settings.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes > endMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }
}

export const taskReminderService = new TaskReminderService();
