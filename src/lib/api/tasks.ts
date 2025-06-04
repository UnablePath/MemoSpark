import {
  fetchTasks,
  getTaskById,
  createTask as supabaseCreateTask,
  updateTask as supabaseUpdateTask,
  deleteTask as supabaseDeleteTask,
  toggleTaskCompletion as supabaseToggleTaskCompletion,
} from '@/lib/supabase/tasksApi';

import type { Task, TaskInsert, TaskUpdate, TaskFilters } from '@/types/taskTypes';

// Re-export Supabase functions for backward compatibility
export const createTask = supabaseCreateTask;
export const updateTask = supabaseUpdateTask;
export const deleteTask = supabaseDeleteTask;
export const toggleTaskCompletion = supabaseToggleTaskCompletion;

// Additional utility functions
export const getTasks = fetchTasks;
export const getTask = getTaskById;

export { fetchTasks, getTaskById };

// Types re-export for convenience
export type { Task, TaskInsert, TaskUpdate, TaskFilters }; 