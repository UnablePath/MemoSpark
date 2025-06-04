import { supabase, supabaseHelpers } from './client';
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskFilters,
  TimetableEntry,
  TimetableEntryInsert,
  TimetableEntryUpdate,
  TimetableEntryFilters,
  TasksResponse,
  TimetableEntriesResponse,
} from '@/types/taskTypes';

// ========================================
// ERROR HANDLING AND UTILITIES
// ========================================

export class SupabaseApiError extends Error {
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'SupabaseApiError';
    this.code = code;
    this.details = details;
  }
}

const handleSupabaseError = (error: any, operation: string): never => {
  supabaseHelpers.handleError(error, operation);
  throw new SupabaseApiError(
    `${operation} failed: ${error?.message || 'Unknown error'}`,
    error?.code,
    error
  );
};

const ensureSupabaseClient = () => {
  if (!supabase) {
    throw new SupabaseApiError('Supabase client not initialized');
  }
  return supabase;
};

// ========================================
// TASK API FUNCTIONS
// ========================================

/**
 * Fetch all tasks for the authenticated user with optional filtering
 */
export const fetchTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const client = ensureSupabaseClient();

  try {
    let query = client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.subject) {
        query = query.ilike('subject', `%${filters.subject}%`);
      }
      if (filters.due_before) {
        query = query.lte('due_date', filters.due_before);
      }
      if (filters.due_after) {
        query = query.gte('due_date', filters.due_after);
      }
      if (filters.has_recurrence !== undefined) {
        if (filters.has_recurrence) {
          query = query.not('recurrence_rule', 'is', null);
        } else {
          query = query.is('recurrence_rule', null);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'fetch tasks');
    }

    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch tasks');
  }
};

/**
 * Get a specific task by ID
 */
export const getTaskById = async (id: string): Promise<Task | null> => {
  const client = ensureSupabaseClient();

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      handleSupabaseError(error, 'get task by ID');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get task by ID');
  }
};

/**
 * Create a new task
 */
export const createTask = async (
  taskData: Omit<TaskInsert, 'user_id'>
): Promise<Task> => {
  const client = ensureSupabaseClient();

  try {
    const clerkUserId = await supabaseHelpers.getCurrentUserId();
    if (!clerkUserId) {
      throw new SupabaseApiError('User not authenticated with Clerk');
    }

    // Ensure user profile exists in Supabase
    await supabaseHelpers.ensureUserExists();

    // Get the Supabase user profile to get the internal user_id
    const profile = await supabaseHelpers.getCurrentUserProfile();
    if (!profile) {
      throw new SupabaseApiError('User profile not found - please complete onboarding');
    }

    const insertData: TaskInsert = {
      ...taskData,
      user_id: profile.id, // Use the Supabase profile ID
      // Convert Date objects to ISO strings if present
      due_date: taskData.due_date && typeof taskData.due_date === 'object' && 'toISOString' in taskData.due_date
        ? (taskData.due_date as Date).toISOString() 
        : taskData.due_date,
    };

    const { data, error } = await client
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'create task');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'create task');
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (
  id: string,
  updates: TaskUpdate
): Promise<Task> => {
  const client = ensureSupabaseClient();

  try {
    const updateData = {
      ...updates,
      // Convert Date objects to ISO strings if present
      due_date: updates.due_date && typeof updates.due_date === 'object' && 'toISOString' in updates.due_date
        ? (updates.due_date as Date).toISOString() 
        : updates.due_date,
    };

    const { data, error } = await client
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'update task');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'update task');
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (id: string): Promise<void> => {
  const client = ensureSupabaseClient();

  try {
    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'delete task');
    }
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    handleSupabaseError(error, 'delete task');
  }
};

/**
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (id: string): Promise<Task> => {
  const client = ensureSupabaseClient();

  try {
    // First get the current task to know its completion status
    const currentTask = await getTaskById(id);
    if (!currentTask) {
      throw new SupabaseApiError('Task not found');
    }

    return await updateTask(id, { completed: !currentTask.completed });
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'toggle task completion');
  }
};

/**
 * Get tasks with pagination
 */
export const fetchTasksPaginated = async (
  page = 0,
  limit = 20,
  filters?: TaskFilters
): Promise<TasksResponse> => {
  const client = ensureSupabaseClient();

  try {
    const startRange = page * limit;
    const endRange = startRange + limit - 1;

    let query = client
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(startRange, endRange);

    // Apply filters (same as fetchTasks)
    if (filters) {
      if (filters.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.subject) {
        query = query.ilike('subject', `%${filters.subject}%`);
      }
      if (filters.due_before) {
        query = query.lte('due_date', filters.due_before);
      }
      if (filters.due_after) {
        query = query.gte('due_date', filters.due_after);
      }
      if (filters.has_recurrence !== undefined) {
        if (filters.has_recurrence) {
          query = query.not('recurrence_rule', 'is', null);
        } else {
          query = query.is('recurrence_rule', null);
        }
      }
    }

    const { data, error, count } = await query;

    if (error) {
      handleSupabaseError(error, 'fetch tasks paginated');
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch tasks paginated');
  }
};

// ========================================
// TIMETABLE ENTRY API FUNCTIONS
// ========================================

/**
 * Fetch all timetable entries for the authenticated user with optional filtering
 */
export const fetchTimetableEntries = async (
  filters?: TimetableEntryFilters
): Promise<TimetableEntry[]> => {
  const client = ensureSupabaseClient();

  try {
    let query = client
      .from('timetable_entries')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.course_name) {
        query = query.ilike('course_name', `%${filters.course_name}%`);
      }
      if (filters.instructor) {
        query = query.ilike('instructor', `%${filters.instructor}%`);
      }
      if (filters.days_of_week && filters.days_of_week.length > 0) {
        query = query.overlaps('days_of_week', filters.days_of_week);
      }
      if (filters.semester_active) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .lte('semester_start_date', today)
          .gte('semester_end_date', today);
      }
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'fetch timetable entries');
    }

    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch timetable entries');
  }
};

/**
 * Get a specific timetable entry by ID
 */
export const getTimetableEntryById = async (id: string): Promise<TimetableEntry | null> => {
  const client = ensureSupabaseClient();

  try {
    const { data, error } = await client
      .from('timetable_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      handleSupabaseError(error, 'get timetable entry by ID');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get timetable entry by ID');
  }
};

/**
 * Create a new timetable entry
 */
export const createTimetableEntry = async (
  entryData: Omit<TimetableEntryInsert, 'user_id'>
): Promise<TimetableEntry> => {
  const client = ensureSupabaseClient();

  try {
    const clerkUserId = await supabaseHelpers.getCurrentUserId();
    if (!clerkUserId) {
      throw new SupabaseApiError('User not authenticated with Clerk');
    }

    // Ensure user profile exists in Supabase
    await supabaseHelpers.ensureUserExists();

    // Get the Supabase user profile to get the internal user_id for foreign key
    const profile = await supabaseHelpers.getCurrentUserProfile();
    if (!profile || !profile.id) { // Ensure profile and profile.id exist
      throw new SupabaseApiError('User profile not found or incomplete - please complete onboarding');
    }

    const insertData: TimetableEntryInsert = {
      ...entryData,
      user_id: profile.id, // Use the Supabase profile ID (which is profile.id)
      // Convert Date objects to ISO strings if present
      semester_start_date: entryData.semester_start_date && typeof entryData.semester_start_date === 'object' && 'toISOString' in entryData.semester_start_date
        ? (entryData.semester_start_date as Date).toISOString().split('T')[0] 
        : entryData.semester_start_date,
      semester_end_date: entryData.semester_end_date && typeof entryData.semester_end_date === 'object' && 'toISOString' in entryData.semester_end_date
        ? (entryData.semester_end_date as Date).toISOString().split('T')[0] 
        : entryData.semester_end_date,
    };

    const { data, error } = await client
      .from('timetable_entries')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'create timetable entry');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'create timetable entry');
  }
};

/**
 * Update an existing timetable entry
 */
export const updateTimetableEntry = async (
  id: string,
  updates: TimetableEntryUpdate
): Promise<TimetableEntry> => {
  const client = ensureSupabaseClient();

  try {
    const updateData = {
      ...updates,
      // Convert Date objects to ISO strings if present
      semester_start_date: updates.semester_start_date && typeof updates.semester_start_date === 'object' && 'toISOString' in updates.semester_start_date
        ? (updates.semester_start_date as Date).toISOString().split('T')[0] 
        : updates.semester_start_date,
      semester_end_date: updates.semester_end_date && typeof updates.semester_end_date === 'object' && 'toISOString' in updates.semester_end_date
        ? (updates.semester_end_date as Date).toISOString().split('T')[0] 
        : updates.semester_end_date,
    };

    const { data, error } = await client
      .from('timetable_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'update timetable entry');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'update timetable entry');
  }
};

/**
 * Delete a timetable entry
 */
export const deleteTimetableEntry = async (id: string): Promise<void> => {
  const client = ensureSupabaseClient();

  try {
    const { error } = await client
      .from('timetable_entries')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'delete timetable entry');
    }
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    handleSupabaseError(error, 'delete timetable entry');
  }
};

/**
 * Get timetable entries with pagination
 */
export const fetchTimetableEntriesPaginated = async (
  page = 0,
  limit = 20,
  filters?: TimetableEntryFilters
): Promise<TimetableEntriesResponse> => {
  const client = ensureSupabaseClient();

  try {
    const startRange = page * limit;
    const endRange = startRange + limit - 1;

    let query = client
      .from('timetable_entries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(startRange, endRange);

    // Apply filters (same as fetchTimetableEntries)
    if (filters) {
      if (filters.course_name) {
        query = query.ilike('course_name', `%${filters.course_name}%`);
      }
      if (filters.instructor) {
        query = query.ilike('instructor', `%${filters.instructor}%`);
      }
      if (filters.days_of_week && filters.days_of_week.length > 0) {
        query = query.overlaps('days_of_week', filters.days_of_week);
      }
      if (filters.semester_active) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .lte('semester_start_date', today)
          .gte('semester_end_date', today);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      handleSupabaseError(error, 'fetch timetable entries paginated');
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch timetable entries paginated');
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get count of tasks and timetable entries for dashboard summary
 */
export const getDashboardCounts = async (): Promise<{
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalTimetableEntries: number;
}> => {
  const client = ensureSupabaseClient();

  try {
    const [tasksResult, completedTasksResult, timetableResult] = await Promise.all([
      client.from('tasks').select('*', { count: 'exact', head: true }),
      client.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),
      client.from('timetable_entries').select('*', { count: 'exact', head: true }),
    ]);

    const totalTasks = tasksResult.count || 0;
    const completedTasks = completedTasksResult.count || 0;
    const pendingTasks = totalTasks - completedTasks;
    const totalTimetableEntries = timetableResult.count || 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      totalTimetableEntries,
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get dashboard counts');
  }
};

/**
 * Test database connectivity and table availability
 */
export const testDatabaseConnection = async (): Promise<{
  success: boolean;
  tables: string[];
  error?: string;
}> => {
  try {
    return await supabaseHelpers.testConnection();
  } catch (error) {
    return {
      success: false,
      tables: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ========================================
// AI SUGGESTION FEEDBACK API FUNCTIONS
// ========================================

/**
 * AI suggestion feedback interface
 */
export interface AISuggestionFeedback {
  id: string;
  user_id: string;
  suggestion_id: string;
  suggestion_type: string;
  suggestion_title: string;
  feedback: 'liked' | 'disliked';
  suggestion_context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AISuggestionFeedbackInsert {
  suggestion_id: string;
  suggestion_type: string;
  suggestion_title: string;
  feedback: 'liked' | 'disliked';
  suggestion_context?: Record<string, any>;
}

/**
 * Save user feedback for an AI suggestion
 */
export const saveAISuggestionFeedback = async (
  feedbackData: AISuggestionFeedbackInsert
): Promise<AISuggestionFeedback> => {
  const client = ensureSupabaseClient();

  try {
    const clerkUserId = await supabaseHelpers.getCurrentUserId();
    if (!clerkUserId) {
      throw new SupabaseApiError('User not authenticated with Clerk');
    }

    // Ensure user profile exists in Supabase, which also creates a basic profile if missing.
    // This step is important if feedback can be given before full onboarding.
    await supabaseHelpers.ensureUserExists(); 

    // Get the Supabase user profile to get the internal user_id for foreign key
    const profile = await supabaseHelpers.getCurrentUserProfile();
    if (!profile || !profile.id) {
      throw new SupabaseApiError('User profile not found or incomplete - unable to save feedback. Please complete onboarding.');
    }

    const insertData = {
      ...feedbackData,
      user_id: profile.id, // Use the Supabase profile ID (which is profile.id)
      suggestion_context: feedbackData.suggestion_context || {},
    };

    const { data, error } = await client
      .from('ai_suggestion_feedback')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'save AI suggestion feedback');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'save AI suggestion feedback');
  }
};

/**
 * Get user feedback for AI suggestions with optional filtering
 */
export const getAISuggestionFeedback = async (filters?: {
  suggestion_type?: string;
  feedback?: 'liked' | 'disliked';
  limit?: number;
  days_back?: number;
}): Promise<AISuggestionFeedback[]> => {
  const client = ensureSupabaseClient();

  try {
    let query = client
      .from('ai_suggestion_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.suggestion_type) {
        query = query.eq('suggestion_type', filters.suggestion_type);
      }
      if (filters.feedback) {
        query = query.eq('feedback', filters.feedback);
      }
      if (filters.days_back) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.days_back);
        query = query.gte('created_at', cutoffDate.toISOString());
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'get AI suggestion feedback');
    }

    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get AI suggestion feedback');
  }
};

/**
 * Get feedback summary/analytics for AI suggestions
 */
export const getAISuggestionFeedbackSummary = async (): Promise<{
  totalFeedback: number;
  likedCount: number;
  dislikedCount: number;
  likeRatio: number;
  byType: Record<string, { liked: number; disliked: number; ratio: number }>;
}> => {
  const client = ensureSupabaseClient();

  try {
    const { data, error } = await client
      .from('ai_suggestion_feedback')
      .select('suggestion_type, feedback');

    if (error) {
      handleSupabaseError(error, 'get AI suggestion feedback summary');
    }

    const feedback = data || [];
    const totalFeedback = feedback.length;
    const likedCount = feedback.filter(f => f.feedback === 'liked').length;
    const dislikedCount = feedback.filter(f => f.feedback === 'disliked').length;
    const likeRatio = totalFeedback > 0 ? likedCount / totalFeedback : 0;

    // Group by suggestion type
    const byType: Record<string, { liked: number; disliked: number; ratio: number }> = {};
    
    feedback.forEach(f => {
      if (!byType[f.suggestion_type]) {
        byType[f.suggestion_type] = { liked: 0, disliked: 0, ratio: 0 };
      }
      if (f.feedback === 'liked') {
        byType[f.suggestion_type].liked++;
      } else {
        byType[f.suggestion_type].disliked++;
      }
    });

    // Calculate ratios for each type
    Object.keys(byType).forEach(type => {
      const total = byType[type].liked + byType[type].disliked;
      byType[type].ratio = total > 0 ? byType[type].liked / total : 0;
    });

    return {
      totalFeedback,
      likedCount,
      dislikedCount,
      likeRatio,
      byType,
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get AI suggestion feedback summary');
  }
};

/**
 * Update or upsert AI suggestion feedback
 */
export const updateAISuggestionFeedback = async (
  suggestionId: string,
  feedback: 'liked' | 'disliked'
): Promise<AISuggestionFeedback> => {
  const client = ensureSupabaseClient();

  try {
    const clerkUserId = await supabaseHelpers.getCurrentUserId();
    if (!clerkUserId) {
      throw new SupabaseApiError('User not authenticated with Clerk');
    }

    const profile = await supabaseHelpers.getCurrentUserProfile();
    if (!profile || !profile.id) {
      throw new SupabaseApiError('User profile not found - unable to update feedback.');
    }

    // Try to update existing feedback first
    const { data: existingData, error: existingError } = await client
      .from('ai_suggestion_feedback')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', profile.id) // Use Supabase profile ID
      .single();

    if (existingData) {
      // Update existing feedback
      const { data, error } = await client
        .from('ai_suggestion_feedback')
        .update({ feedback, updated_at: new Date().toISOString() }) // Also update updated_at
        .eq('id', existingData.id)
        .select()
        .single();

      if (error) {
        handleSupabaseError(error, 'update AI suggestion feedback');
      }

      return data;
    } else {
      // This case should ideally not be hit if UI triggers update only on existing items.
      // If it can be hit, then an upsert or clear error is needed.
      // For now, erroring out as the original code did.
      throw new SupabaseApiError('Cannot update non-existing feedback. Suggestion or original feedback not found for this user.');
    }
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'update AI suggestion feedback');
  }
};

/**
 * Delete AI suggestion feedback
 */
export const deleteAISuggestionFeedback = async (suggestionId: string): Promise<void> => {
  const client = ensureSupabaseClient();

  try {
    const clerkUserId = await supabaseHelpers.getCurrentUserId();
    if (!clerkUserId) {
      throw new SupabaseApiError('User not authenticated with Clerk');
    }
    
    const profile = await supabaseHelpers.getCurrentUserProfile();
    if (!profile || !profile.id) {
      // If profile doesn't exist, there's no feedback to delete for this user.
      // This can be treated as a success or a specific error, 
      // but for deletion, it implies the resource is already gone.
      console.warn('User profile not found; no feedback to delete.')
      return; 
    }

    const { error } = await client
      .from('ai_suggestion_feedback')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', profile.id); // Use Supabase profile ID

    if (error) {
      handleSupabaseError(error, 'delete AI suggestion feedback');
    }
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    handleSupabaseError(error, 'delete AI suggestion feedback');
  }
};

/**
 * Get enhanced user context for AI suggestions
 */
export const getEnhancedUserContext = async (): Promise<{
  recentTasks: Task[];
  recentCompletedTasks: Task[];
  upcomingTasks: Task[];
  timetableEntries: TimetableEntry[];
  userPreferences: any;
  feedbackSummary: {
    totalFeedback: number;
    likeRatio: number;
    dislikedTypes: string[];
    preferredTypes: string[];
  };
}> => {
  const client = ensureSupabaseClient();

  try {
    // Get recent tasks (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get upcoming tasks (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [recentTasksResult, completedTasksResult, upcomingTasksResult, timetableResult, feedbackSummary] = await Promise.all([
      client
        .from('tasks')
        .select('*')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      
      client
        .from('tasks')
        .select('*')
        .eq('completed', true)
        .gte('updated_at', fourteenDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10),
      
      client
        .from('tasks')
        .select('*')
        .eq('completed', false)
        .lte('due_date', sevenDaysFromNow.toISOString())
        .order('due_date', { ascending: true })
        .limit(15),
      
      client
        .from('user_timetables')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      
      getAISuggestionFeedbackSummary()
    ]);

    const recentTasks = recentTasksResult.data || [];
    const recentCompletedTasks = completedTasksResult.data || [];
    const upcomingTasks = upcomingTasksResult.data || [];
    const timetableEntries = timetableResult.data || [];

    // Extract disliked and preferred types from feedback
    const dislikedTypes = Object.keys(feedbackSummary.byType)
      .filter(type => feedbackSummary.byType[type].ratio < 0.3 && (feedbackSummary.byType[type].liked + feedbackSummary.byType[type].disliked) >= 3);
    
    const preferredTypes = Object.keys(feedbackSummary.byType)
      .filter(type => feedbackSummary.byType[type].ratio > 0.7 && (feedbackSummary.byType[type].liked + feedbackSummary.byType[type].disliked) >= 3);

    return {
      recentTasks,
      recentCompletedTasks,
      upcomingTasks,
      timetableEntries,
      userPreferences: {}, // Could be expanded with actual user preferences
      feedbackSummary: {
        totalFeedback: feedbackSummary.totalFeedback,
        likeRatio: feedbackSummary.likeRatio,
        dislikedTypes,
        preferredTypes,
      },
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get enhanced user context');
  }
}; 