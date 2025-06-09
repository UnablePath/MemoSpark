// Task and Event Type Definitions for MemoSpark
// Updated to match enhanced database schema with existing tables

export type Priority = 'low' | 'medium' | 'high';

export type TaskType = 'academic' | 'personal' | 'event';

export interface ReminderSettings {
  enabled: boolean;
  offset_minutes?: number; // How many minutes before due_date to remind
  type?: 'notification' | 'email' | 'both';
}

export interface Task {
  id: string; // UUID
  user_id: string; // UUID, FK to auth.users.id
  title: string;
  description?: string;
  due_date?: string; // ISO timestamp string
  priority: Priority;
  type: TaskType;
  subject?: string;
  completed: boolean;
  reminder_settings?: ReminderSettings; // Enhanced JSONB field
  recurrence_rule?: string; // iCalendar RRULE format (NEW)
  original_due_date?: string; // ISO timestamp string, for recurring instances (NEW)
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

// Note: TimetableEntry uses the user_timetables table with a view alias 'timetable_entries'
export interface TimetableEntry {
  id: string; // UUID
  user_id: string; // UUID, FK to auth.users.id
  course_name: string;
  course_code?: string;
  instructor?: string;
  location?: string;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  days_of_week: string[]; // ['monday', 'wednesday', 'friday'] - validated in DB
  semester_start_date?: string; // YYYY-MM-DD format
  semester_end_date?: string; // YYYY-MM-DD format
  color?: string; // Hex color code for UI display - validated in DB as #RRGGBB
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
}

// Database insert types (without server-generated fields)
export interface TaskInsert extends Omit<Task, 'id' | 'created_at' | 'updated_at'> {
  id?: string; // Optional for insert
  created_at?: string; // Optional for insert
  updated_at?: string; // Optional for insert
}

export interface TimetableEntryInsert extends Omit<TimetableEntry, 'id' | 'created_at' | 'updated_at'> {
  id?: string; // Optional for insert
  created_at?: string; // Optional for insert
  updated_at?: string; // Optional for insert
}

// Database update types (all fields optional except user_id constraint)
export interface TaskUpdate extends Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>> {
  updated_at?: string; // Will be handled by trigger
}

export interface TimetableEntryUpdate extends Partial<Omit<TimetableEntry, 'id' | 'user_id' | 'created_at'>> {
  updated_at?: string; // Will be handled by trigger
}

// Form data types for client-side forms
export interface TaskFormData {
  title: string;
  description?: string;
  due_date?: Date;
  priority: Priority;
  type: TaskType;
  subject?: string;
  reminder_settings?: ReminderSettings;
  recurrence_rule?: string;
}

export interface TimetableEntryFormData {
  course_name: string;
  course_code?: string;
  instructor?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  days_of_week: string[];
  semester_start_date?: Date;
  semester_end_date?: Date;
  color?: string;
}

// API response types
export interface TasksResponse {
  data: Task[];
  count: number;
}

export interface TimetableEntriesResponse {
  data: TimetableEntry[];
  count: number;
}

// Query filter types
export interface TaskFilters {
  completed?: boolean;
  type?: TaskType;
  priority?: Priority;
  subject?: string;
  due_before?: string; // ISO timestamp
  due_after?: string; // ISO timestamp
  has_recurrence?: boolean; // Filter for recurring tasks
}

export interface TimetableEntryFilters {
  course_name?: string;
  instructor?: string;
  days_of_week?: string[];
  semester_active?: boolean; // Filter for current semester
}

// Enum constants for validation (matching database constraints)
export const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high'];
export const TASK_TYPE_OPTIONS: TaskType[] = ['academic', 'personal', 'event'];
export const DAYS_OF_WEEK_OPTIONS = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK_OPTIONS[number];

// Database schema compatibility notes:
// - Tasks table enhanced with reminder_settings (JSONB), recurrence_rule, original_due_date
// - Constraints: title length > 0, priority in ('low','medium','high'), type in ('academic','personal','event')
// - TimetableEntry uses user_timetables table with timetable_entries view
// - Constraints: course_name length > 0, valid time range, valid semester dates, valid color format
// - Both tables have RLS enabled with user_id = auth.uid() policies
// - Auto-updating updated_at triggers are active
// - All foreign keys cascade on user deletion 