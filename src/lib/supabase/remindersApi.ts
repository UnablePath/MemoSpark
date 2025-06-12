import { supabase, supabaseHelpers, createAuthenticatedSupabaseClient } from './client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type {
  Reminder,
  ReminderInsert,
  ReminderUpdate,
  ReminderFilters,
  RemindersResponse,
} from '@/types/reminders';
import { SupabaseApiError, handleSupabaseError, getAuthenticatedClient } from './tasksApi';

// ========================================
// REMINDER API FUNCTIONS
// ========================================

/**
 * Fetch all reminders for the authenticated user with optional filtering
 */
export const fetchReminders = async (
  filters?: ReminderFilters,
  getToken?: () => Promise<string | null>
): Promise<Reminder[]> => {
  const client = getAuthenticatedClient(getToken);

  try {
    let query = client
      .from('reminders')
      .select('*')
      .order('due_date', { ascending: true });

    // Apply filters
    if (filters) {
      if (filters.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.due_before) {
        query = query.lte('due_date', filters.due_before);
      }
      if (filters.due_after) {
        query = query.gte('due_date', filters.due_after);
      }
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'fetch reminders');
    }

    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch reminders');
  }
};

/**
 * Get a specific reminder by ID
 */
export const getReminderById = async (
  id: string,
  getToken?: () => Promise<string | null>
): Promise<Reminder | null> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { data, error } = await client
      .from('reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      handleSupabaseError(error, 'get reminder by ID');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'get reminder by ID');
  }
};

/**
 * Create a new reminder
 */
export const createReminder = async (
  reminderData: ReminderInsert,
  getToken?: () => Promise<string | null>
): Promise<Reminder> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { data, error } = await client
      .from('reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'create reminder');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'create reminder');
  }
};

/**
 * Update an existing reminder
 */
export const updateReminder = async (
  id: string,
  updates: ReminderUpdate,
  getToken?: () => Promise<string | null>
): Promise<Reminder> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { data, error } = await client
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'update reminder');
    }

    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'update reminder');
  }
};

/**
 * Delete a reminder
 */
export const deleteReminder = async (
  id: string,
  getToken?: () => Promise<string | null>
): Promise<void> => {
  const client = getAuthenticatedClient(getToken);

  try {
    const { error } = await client.from('reminders').delete().eq('id', id);

    if (error) {
      handleSupabaseError(error, 'delete reminder');
    }
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    handleSupabaseError(error, 'delete reminder');
  }
};

/**
 * Fetch reminders with pagination
 */
export const fetchRemindersPaginated = async (
  page = 0,
  limit = 20,
  filters?: ReminderFilters,
  getToken?: () => Promise<string | null>
): Promise<RemindersResponse> => {
    const client = getAuthenticatedClient(getToken);
    const from = page * limit;
    const to = from + limit - 1;

    try {
        let query = client
            .from('reminders')
            .select('*', { count: 'exact' })
            .order('due_date', { ascending: true })
            .range(from, to);

        if (filters) {
            if (filters.completed !== undefined) {
                query = query.eq('completed', filters.completed);
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority);
            }
        }

        const { data, error, count } = await query;

        if (error) {
            handleSupabaseError(error, 'fetch reminders paginated');
        }

        return { data: data || [], count: count || 0 };
    } catch (error) {
        if (error instanceof SupabaseApiError) throw error;
        return handleSupabaseError(error, 'fetch reminders paginated');
    }
};

/**
 * Real-time subscription for reminder updates
 */
export const subscribeToReminders = (
    callback: (payload: RealtimePostgresChangesPayload<Reminder>) => void,
    getToken?: () => Promise<string | null>
) => {
    const client = getAuthenticatedClient(getToken);
    const channel = client
        .channel('public:reminders')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reminders' },
            (payload) => {
                callback(payload as RealtimePostgresChangesPayload<Reminder>);
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
}; 