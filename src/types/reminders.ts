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

// For API creation (server-side with user_id)
export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;

// For frontend creation (client-side without user_id)
export type ReminderCreateInput = Omit<ReminderInsert, 'user_id' | 'completed'> & {
  user_id?: string; // Optional for frontend, API will add it
  completed?: boolean; // Optional for frontend, defaults to false
  reminder_time?: string; // Optional reminder time field
};

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