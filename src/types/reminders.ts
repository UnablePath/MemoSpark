export interface Reminder {
  id: string;
  user_id: string; // Clerk user ID (TEXT)
  task_id?: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  points?: number;
  created_at: string;
  updated_at: string;
}

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;
export type ReminderUpdate = Partial<ReminderInsert>;

export interface ReminderFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_before?: string;
  due_after?: string;
}

export interface RemindersResponse {
  data: Reminder[];
  count: number;
} 