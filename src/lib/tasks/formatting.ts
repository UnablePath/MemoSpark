import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns';

/**
 * Returns a human-friendly due label for a task, or `null` when the task has no due date.
 * Uses concise relative language for nearby dates and a compact absolute format for distant ones.
 */
export function formatDueLabel(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  try {
    const parsed = parseISO(dueDate);
    if (Number.isNaN(parsed.getTime())) return null;

    const timeLabel = format(parsed, 'h:mm a');

    if (isToday(parsed)) return `Today · ${timeLabel}`;
    if (isTomorrow(parsed)) return `Tomorrow · ${timeLabel}`;
    if (isYesterday(parsed)) return `Yesterday · ${timeLabel}`;

    const daysOut = differenceInCalendarDays(parsed, new Date());
    if (daysOut < 0 && daysOut >= -7) return `${Math.abs(daysOut)}d overdue`;
    if (daysOut > 0 && daysOut < 7) return `${format(parsed, 'EEE')} · ${timeLabel}`;

    return `${format(parsed, 'MMM d')} · ${timeLabel}`;
  } catch {
    return null;
  }
}

/**
 * Returns true when the given due date is strictly before now and the task is not complete.
 */
export function isOverdue(dueDate: string | null | undefined, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  try {
    const parsed = parseISO(dueDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() < Date.now();
  } catch {
    return false;
  }
}

/**
 * Bucket key used by the Today view to group the agenda by time of day.
 */
export type TimeOfDay = 'overdue' | 'morning' | 'afternoon' | 'evening' | 'later';

export function timeOfDayFor(dueDate: string | null | undefined): TimeOfDay {
  if (!dueDate) return 'later';
  try {
    const parsed = parseISO(dueDate);
    if (Number.isNaN(parsed.getTime())) return 'later';
    if (parsed.getTime() < Date.now() && !isToday(parsed)) return 'overdue';
    const hour = parsed.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'later';
  } catch {
    return 'later';
  }
}

export const timeOfDayLabel: Record<TimeOfDay, string> = {
  overdue: 'Overdue',
  morning: 'Morning',
  afternoon: 'This afternoon',
  evening: 'Tonight',
  later: 'Later',
};
