import type { Task } from '@/types/taskTypes';

/**
 * Thin adapter layer between task mutations and the reminder/notification stack.
 *
 * Scheduling stays inside `ReminderEngine` (already wired into
 * `useCreateTask` / `useUpdateTask` via dynamic import).  This module adds a
 * single canonical cancel path that hits the server route, which in turn
 * talks to OneSignal's REST API and marks the local queue rows cancelled.
 *
 * All methods are best-effort and never throw into calling code, a reminder
 * failing to cancel must never block a task being deleted.
 */

export type TaskReminderCandidate = Pick<Task, 'id' | 'due_date' | 'title' | 'priority' | 'type'> & {
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
    console.warn('[reminder-bridge] fetch failed', error);
    return null;
  }
}

/**
 * Best-effort smart reminder scheduling.  Delegates to ReminderEngine which is
 * already the owner of "figure out the correct offsets, write DB rows, hit
 * OneSignal". Returns true when at least one reminder was scheduled.
 */
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
    return await (engine.scheduleSmartReminder as (task: unknown) => Promise<boolean>)(payload);
  } catch (error) {
    console.warn('[reminder-bridge] scheduleTaskReminder failed', error);
    return false;
  }
}

/**
 * Cancel every pending OneSignal delivery associated with a task. Best-effort:
 * returns counts but never throws.
 */
export async function cancelTaskReminder(
  taskId: string,
  clerkUserId: string,
): Promise<TaskReminderCancelResult> {
  if (!taskId || !clerkUserId) return { cancelled: 0, failed: 0 };

  const response = await safeFetch('/api/notifications/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, userId: clerkUserId }),
  });

  if (!response) return { cancelled: 0, failed: 1 };

  try {
    const body = (await response.json()) as {
      cancelled?: number;
      failed?: number;
    };
    return {
      cancelled: body.cancelled ?? 0,
      failed: body.failed ?? 0,
    };
  } catch (error) {
    console.warn('[reminder-bridge] cancel response parse failed', error);
    return { cancelled: 0, failed: 1 };
  }
}

export const taskReminderBridge = {
  schedule: scheduleTaskReminder,
  cancel: cancelTaskReminder,
};
