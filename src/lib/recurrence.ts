import { RRule, RRuleSet, rrulestr, Frequency } from 'rrule';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import type { Task } from '@/types/taskTypes';

// Recurrence frequency options for UI
export const RECURRENCE_FREQUENCIES = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export type RecurrenceFrequency = typeof RECURRENCE_FREQUENCIES[number]['value'];

// Days of week for weekly recurrence
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
] as const;

// Recurrence end types
export const RECURRENCE_END_TYPES = [
  { value: 'never', label: 'Never' },
  { value: 'count', label: 'After number of occurrences' },
  { value: 'until', label: 'On date' },
] as const;

export type RecurrenceEndType = typeof RECURRENCE_END_TYPES[number]['value'];

// Interface for recurrence settings in the form
export interface RecurrenceSettings {
  frequency: RecurrenceFrequency;
  interval: number; // Every X frequency (e.g., every 2 weeks)
  daysOfWeek: number[]; // For weekly recurrence
  endType: RecurrenceEndType;
  count?: number; // Number of occurrences
  until?: Date; // End date
}

// Default recurrence settings
export const defaultRecurrenceSettings: RecurrenceSettings = {
  frequency: 'none',
  interval: 1,
  daysOfWeek: [],
  endType: 'never',
};

/**
 * Convert recurrence settings to RRULE string
 */
export function createRRuleFromSettings(
  settings: RecurrenceSettings,
  startDate: Date
): string | null {
  if (settings.frequency === 'none') {
    return null;
  }

  const options: any = {
    dtstart: startDate,
    interval: settings.interval,
  };

  // Set frequency
  switch (settings.frequency) {
    case 'daily':
      options.freq = RRule.DAILY;
      break;
    case 'weekly':
      options.freq = RRule.WEEKLY;
      if (settings.daysOfWeek.length > 0) {
        // Map weekday numbers to rrule weekday constants
        const weekdayMap = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];
        options.byweekday = settings.daysOfWeek.map(day => weekdayMap[day]);
      }
      break;
    case 'monthly':
      options.freq = RRule.MONTHLY;
      break;
    case 'yearly':
      options.freq = RRule.YEARLY;
      break;
    default:
      return null;
  }

  // Set end condition
  switch (settings.endType) {
    case 'count':
      if (settings.count && settings.count > 0) {
        options.count = settings.count;
      }
      break;
    case 'until':
      if (settings.until) {
        options.until = endOfDay(settings.until);
      }
      break;
    // 'never' doesn't need any additional options
  }

  try {
    const rule = new RRule(options);
    return rule.toString();
  } catch (error) {
    console.error('Error creating RRULE:', error);
    return null;
  }
}

/**
 * Parse RRULE string back to recurrence settings
 */
export function parseRRuleToSettings(rruleString: string): RecurrenceSettings {
  try {
    const rule = rrulestr(rruleString);
    const options = rule.options;

    const settings: RecurrenceSettings = {
      frequency: 'none',
      interval: options.interval || 1,
      daysOfWeek: [],
      endType: 'never',
    };

    // Map frequency
    switch (options.freq) {
      case RRule.DAILY:
        settings.frequency = 'daily';
        break;
      case RRule.WEEKLY:
        settings.frequency = 'weekly';
        if (options.byweekday) {
          // Map rrule weekday constants back to numbers
          const weekdays = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
          settings.daysOfWeek = weekdays.map(day => {
            if (typeof day === 'number') return day;
            // Convert rrule weekday object to number (0=Monday, 6=Sunday)
            const weekdayMap = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];
            return weekdayMap.findIndex(w => w === day);
          });
        }
        break;
      case RRule.MONTHLY:
        settings.frequency = 'monthly';
        break;
      case RRule.YEARLY:
        settings.frequency = 'yearly';
        break;
    }

    // Set end condition
    if (options.count) {
      settings.endType = 'count';
      settings.count = options.count;
    } else if (options.until) {
      settings.endType = 'until';
      settings.until = options.until;
    }

    return settings;
  } catch (error) {
    console.error('Error parsing RRULE:', error);
    return defaultRecurrenceSettings;
  }
}

/**
 * Generate task instances for a given date range
 */
export function generateTaskInstances(
  masterTask: Task,
  startDate: Date,
  endDate: Date,
  maxInstances = 100
): Task[] {
  if (!masterTask.recurrence_rule || !masterTask.due_date) {
    return [masterTask];
  }

  try {
    const rule = rrulestr(masterTask.recurrence_rule);
    const masterDueDate = new Date(masterTask.due_date);
    
    // Get occurrences within the date range
    const occurrences = rule.between(
      startOfDay(startDate),
      endOfDay(endDate),
      true,
      (date, i) => i < maxInstances
    );

    const instances: Task[] = [];

    // Add master task if it falls within the range
    if (masterDueDate >= startOfDay(startDate) && masterDueDate <= endOfDay(endDate)) {
      instances.push(masterTask);
    }

    // Generate instances for other occurrences
    for (const occurrence of occurrences) {
      // Skip the master task date
      if (occurrence.getTime() === masterDueDate.getTime()) {
        continue;
      }

      const instance: Task = {
        ...masterTask,
        id: `${masterTask.id}_${occurrence.getTime()}`, // Unique ID for instance
        due_date: occurrence.toISOString(),
        original_due_date: masterTask.due_date, // Reference to master task
      };

      instances.push(instance);
    }

    return instances.sort((a, b) => 
      new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
  } catch (error) {
    console.error('Error generating task instances:', error);
    return [masterTask];
  }
}

/**
 * Check if a task is a recurring instance
 */
export function isRecurringInstance(task: Task): boolean {
  return Boolean(task.original_due_date && task.original_due_date !== task.due_date);
}

/**
 * Check if a task is a master recurring task
 */
export function isMasterRecurringTask(task: Task): boolean {
  return Boolean(task.recurrence_rule && !task.original_due_date);
}

/**
 * Get a human-readable description of the recurrence rule
 */
export function getRecurrenceDescription(rruleString: string): string {
  try {
    const rule = rrulestr(rruleString);
    return rule.toText();
  } catch (error) {
    console.error('Error generating recurrence description:', error);
    return 'Invalid recurrence rule';
  }
}

/**
 * Get the next occurrence date for a recurring task
 */
export function getNextOccurrence(rruleString: string, after?: Date): Date | null {
  try {
    const rule = rrulestr(rruleString);
    const nextDate = rule.after(after || new Date(), true);
    return nextDate;
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
}

/**
 * Expand recurring tasks in a task list for a given date range
 */
export function expandRecurringTasks(
  tasks: Task[],
  startDate: Date,
  endDate: Date,
  maxInstancesPerTask = 50
): Task[] {
  const expandedTasks: Task[] = [];

  for (const task of tasks) {
    if (task.recurrence_rule && !isRecurringInstance(task)) {
      // This is a master recurring task - generate instances
      const instances = generateTaskInstances(task, startDate, endDate, maxInstancesPerTask);
      expandedTasks.push(...instances);
    } else {
      // Regular task or already an instance
      expandedTasks.push(task);
    }
  }

  return expandedTasks;
} 