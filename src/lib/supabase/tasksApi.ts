import { supabase, supabaseHelpers, createAuthenticatedSupabaseClient } from './client';
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

export const handleSupabaseError = (error: any, operation: string): never => {
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

/**
 * Get authenticated Supabase client with Clerk token
 * Uses the new Clerk-Supabase integration for automatic authentication
 */
export const getAuthenticatedClient = (getToken?: () => Promise<string | null>) => {
  if (getToken) {
    const authenticatedClient = createAuthenticatedSupabaseClient(getToken);
    if (!authenticatedClient) {
      throw new SupabaseApiError('Failed to create authenticated Supabase client');
    }
    return authenticatedClient;
  }
  
  // Fallback to base client (for server-side or non-authenticated operations)
  return ensureSupabaseClient();
};

// ========================================
// TASK API FUNCTIONS
// ========================================

/**
 * Fetch all tasks for the authenticated user with optional filtering
 * Now uses Clerk-Supabase integration for automatic authentication
 */
export const fetchTasks = async (
  filters?: TaskFilters, 
  getToken?: () => Promise<string | null>
): Promise<Task[]> => {
  const client = getAuthenticatedClient(getToken);

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
export const getTaskById = async (
  id: string, 
  getToken?: () => Promise<string | null>
): Promise<Task | null> => {
  const client = getAuthenticatedClient(getToken);

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
 * Now uses Clerk-Supabase integration - RLS policies handle user authentication automatically
 */
export const createTask = async (
  taskData: Omit<TaskInsert, 'user_id' | 'clerk_user_id'>,
  getToken?: () => Promise<string | null>
): Promise<Task> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // Ensure user profile exists in Supabase (creates if missing)
    const profile = await getUserProfileWithAutoCreation(getToken);
    const userProfileId = profile.id;

    const insertData = {
      ...taskData,
      user_id: userProfileId, // Include the user ID from profiles table (for foreign key)
      clerk_user_id: profile.clerk_user_id, // Include clerk_user_id for RLS policy validation
      // Convert Date objects to ISO strings if present
      due_date: taskData.due_date && typeof taskData.due_date === 'object' && 'toISOString' in taskData.due_date
        ? (taskData.due_date as Date).toISOString() 
        : taskData.due_date,
    } as TaskInsert;

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
  updates: TaskUpdate,
  getToken?: () => Promise<string | null>
): Promise<Task> => {
  const client = getAuthenticatedClient(getToken);

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
export const deleteTask = async (
  id: string, 
  getToken?: () => Promise<string | null>
): Promise<void> => {
  const client = getAuthenticatedClient(getToken);

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
export const toggleTaskCompletion = async (
  id: string, 
  getToken?: () => Promise<string | null>
): Promise<Task> => {
  try {
    // First get the current task to know its completion status
    const currentTask = await getTaskById(id, getToken);
    if (!currentTask) {
      throw new SupabaseApiError('Task not found');
    }

    return await updateTask(id, { completed: !currentTask.completed }, getToken);
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
  filters?: TaskFilters,
  getToken?: () => Promise<string | null>
): Promise<TasksResponse> => {
  const client = getAuthenticatedClient(getToken);

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
  filters?: TimetableEntryFilters,
  getToken?: () => Promise<string | null>
): Promise<TimetableEntry[]> => {
  const client = getAuthenticatedClient(getToken);

  try {
    let query = client
      .from('user_timetables')
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
export const getTimetableEntryById = async (
  id: string, 
  getToken?: () => Promise<string | null>
): Promise<TimetableEntry | null> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { data, error } = await client
      .from('user_timetables')
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
 * Now uses Clerk-Supabase integration - RLS policies handle user authentication automatically
 */
export const createTimetableEntry = async (
  entryData: Omit<TimetableEntryInsert, 'user_id'>,
  getToken?: () => Promise<string | null>
): Promise<TimetableEntry> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // Ensure user profile exists in Supabase (creates if missing)
    const profile = await getUserProfileWithAutoCreation(getToken);
    const userProfileId = profile.id;

    const insertData = {
      ...entryData,
      user_id: userProfileId, // Include the user ID from profiles table (for foreign key)
      // Convert Date objects to ISO strings if present
      semester_start_date: entryData.semester_start_date && typeof entryData.semester_start_date === 'object' && 'toISOString' in entryData.semester_start_date
        ? (entryData.semester_start_date as Date).toISOString().split('T')[0] 
        : entryData.semester_start_date,
      semester_end_date: entryData.semester_end_date && typeof entryData.semester_end_date === 'object' && 'toISOString' in entryData.semester_end_date
        ? (entryData.semester_end_date as Date).toISOString().split('T')[0] 
        : entryData.semester_end_date,
    } as TimetableEntryInsert;

    const { data, error } = await client
      .from('user_timetables')
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
  updates: TimetableEntryUpdate,
  getToken?: () => Promise<string | null>
): Promise<TimetableEntry> => {
  const client = getAuthenticatedClient(getToken);

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
      .from('user_timetables')
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
export const deleteTimetableEntry = async (
  id: string, 
  getToken?: () => Promise<string | null>
): Promise<void> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { error } = await client
      .from('user_timetables')
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
  filters?: TimetableEntryFilters,
  getToken?: () => Promise<string | null>
): Promise<TimetableEntriesResponse> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const startRange = page * limit;
    const endRange = startRange + limit - 1;

    let query = client
      .from('user_timetables')
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
export const getDashboardCounts = async (
  getToken?: () => Promise<string | null>
): Promise<{
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalTimetableEntries: number;
}> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const [tasksResult, completedTasksResult, timetableResult] = await Promise.all([
      client.from('tasks').select('*', { count: 'exact', head: true }),
      client.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),
      client.from('user_timetables').select('*', { count: 'exact', head: true }),
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
// USER PROFILE MANAGEMENT
// ========================================

/**
 * Ensure user profile exists in Supabase, create if missing
 * This handles existing Clerk users who aren't yet in Supabase
 */
export const ensureUserProfile = async (
  getToken?: () => Promise<string | null>
): Promise<{ id: string; clerk_user_id: string }> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // First, try to get existing profile
    const { data: existingProfile, error: profileError } = await client
      .from('profiles')
      .select('id, clerk_user_id')
      .single();

    // If profile exists, return it
    if (existingProfile && !profileError) {
      return existingProfile;
    }

    // If profile doesn't exist, we need to get user data from Clerk and create it
    // Since we're on the client side, we need to get Clerk data differently
    
    // Try to get the Clerk user ID from the JWT token
    // This is a fallback approach - the profile should ideally be created via webhooks
    let clerkUserId: string;
    
    // Get the JWT token and decode it to extract the user ID
    const token = await (getToken ? getToken() : null);
    if (!token) {
      throw new SupabaseApiError('No authentication token available');
    }

    // Decode the JWT token to get the Clerk user ID
    // Note: This is a simple base64 decode - in production you'd want to properly verify the JWT
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      clerkUserId = payload.sub;
    } catch (decodeError) {
      throw new SupabaseApiError('Failed to decode authentication token');
    }

    if (!clerkUserId) {
      throw new SupabaseApiError('No user ID found in authentication token');
    }

    // Create a basic profile for the user
    // Note: This creates a minimal profile - the user should complete onboarding to fill in details
    const newProfileData = {
      clerk_user_id: clerkUserId,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newProfile, error: createError } = await client
      .from('profiles')
      .insert(newProfileData)
      .select('id, clerk_user_id')
      .single();

    if (createError) {
      throw new SupabaseApiError('Failed to create user profile', createError.code, createError);
    }

    console.log('Created new user profile for Clerk user:', clerkUserId);
    return newProfile;

  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'ensure user profile exists');
  }
};

/**
 * Enhanced version that gets user profile with auto-creation
 * This replaces the simple profile lookup in create functions
 */
export const getUserProfileWithAutoCreation = async (
  getToken?: () => Promise<string | null>
): Promise<{ id: string; clerk_user_id: string }> => {
  return ensureUserProfile(getToken);
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
  feedbackData: AISuggestionFeedbackInsert,
  getToken?: () => Promise<string | null>
): Promise<AISuggestionFeedback> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // Ensure user profile exists in Supabase (creates if missing)
    const profile = await getUserProfileWithAutoCreation(getToken);
    const userProfileId = profile.id;

    const insertData = {
      ...feedbackData,
      user_id: userProfileId, // Include the user ID from profiles table (for foreign key)
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
export const getAISuggestionFeedback = async (
  filters?: {
    suggestion_type?: string;
    feedback?: 'liked' | 'disliked';
    limit?: number;
    days_back?: number;
  },
  getToken?: () => Promise<string | null>
): Promise<AISuggestionFeedback[]> => {
  const client = getAuthenticatedClient(getToken);

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
export const getAISuggestionFeedbackSummary = async (
  getToken?: () => Promise<string | null>
): Promise<{
  totalFeedback: number;
  likedCount: number;
  dislikedCount: number;
  likeRatio: number;
  byType: Record<string, { liked: number; disliked: number; ratio: number }>;
}> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { data, error } = await client
      .from('ai_suggestion_feedback')
      .select('suggestion_type, feedback');

    if (error) {
      handleSupabaseError(error, 'get AI suggestion feedback summary');
    }

    const feedback = data || [];
    const totalFeedback = feedback.length;
    const likedCount = feedback.filter((f: { feedback: string }) => f.feedback === 'liked').length;
    const dislikedCount = feedback.filter((f: { feedback: string }) => f.feedback === 'disliked').length;
    const likeRatio = totalFeedback > 0 ? likedCount / totalFeedback : 0;

    // Group by suggestion type
    const byType: Record<string, { liked: number; disliked: number; ratio: number }> = {};
    
    feedback.forEach((f: { suggestion_type: string; feedback: string }) => {
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
  feedback: 'liked' | 'disliked',
  getToken?: () => Promise<string | null>
): Promise<AISuggestionFeedback> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // With Clerk-Supabase integration, RLS policies automatically handle user authentication
    // No need for manual user lookup - the JWT token contains the user information

    // Try to update existing feedback first
    const { data: existingData, error: existingError } = await client
      .from('ai_suggestion_feedback')
      .select('id')
      .eq('suggestion_id', suggestionId)
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
export const deleteAISuggestionFeedback = async (
  suggestionId: string, 
  getToken?: () => Promise<string | null>
): Promise<void> => {
  const client = getAuthenticatedClient(getToken);

  try {
    // With Clerk-Supabase integration, RLS policies automatically handle user authentication
    // No need for manual user lookup - the JWT token contains the user information

    const { error } = await client
      .from('ai_suggestion_feedback')
      .delete()
      .eq('suggestion_id', suggestionId);

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
export const getEnhancedUserContext = async (
  getToken?: () => Promise<string | null>
): Promise<{
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
  const client = getAuthenticatedClient(getToken);

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
      
      getAISuggestionFeedbackSummary(getToken)
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