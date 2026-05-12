import type { Task } from '@/types/taskTypes';

export type TaskReminderCandidate = Pick<
  Task,
  'id' | 'due_date' | 'title' | 'priority' | 'type'
> & {
  user_id: string;
  clerk_user_id?: string | null;
  reminder_settings?: Task['reminder_settings'];
};

export interface TaskReminderCancelResult {
  cancelled: number;
  failed: number;
}

async function safeFetch(input: RequestInfo, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    console.warn('[task-reminder-bridge] fetch failed', error);
    return null;
  }
}

export async function scheduleTaskReminder(
  task: TaskReminderCandidate,
): Promise<boolean> {
  try {
    if (!task.reminder_settings?.enabled || !task.due_date) return false;
    const { ReminderEngine } = await import('@/lib/reminders/ReminderEngine');
    const engine = ReminderEngine.getInstance();
    const payload = {
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      user_id: task.clerk_user_id || task.user_id,
      priority: task.priority,
      type: task.type,
      subject: (task as Task).subject,
      reminder_offset_minutes: task.reminder_settings?.offset_minutes || 15,
      is_completed: false,
    };
    return await (engine.scheduleSmartReminder as (
      task: unknown,
    ) => Promise<boolean>)(payload);
  } catch (error) {
    console.warn('[task-reminder-bridge] scheduleTaskReminder failed', error);
    return false;
  }
}

export async function cancelTaskReminder(
  taskId: string,
  _clerkUserId: string,
): Promise<TaskReminderCancelResult> {
  if (!taskId) return { cancelled: 0, failed: 0 };

  const response = await safeFetch('/api/push/cancel-by-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ taskId }),
  });

  if (!response) return { cancelled: 0, failed: 1 };

  if (!response.ok) {
    return { cancelled: 0, failed: 1 };
  }

  return { cancelled: 1, failed: 0 };
}

export const taskReminderBridge = {
  schedule: scheduleTaskReminder,
  cancel: cancelTaskReminder,
};
