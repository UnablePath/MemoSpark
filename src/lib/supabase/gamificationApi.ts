import { supabase, supabaseHelpers, createAuthenticatedSupabaseClient } from './client';
import type { UserStats, LeaderboardUser, UserStatsUpdate } from '@/types/achievements';
import { SupabaseApiError, handleSupabaseError, getAuthenticatedClient } from './tasksApi';

// ========================================
// GAMIFICATION API FUNCTIONS
// ========================================

/**
 * Fetch a user's stats
 */
export const fetchUserStats = async (
  userId: string,
  getToken?: () => Promise<string | null>
): Promise<UserStats | null> => {
  const client = getAuthenticatedClient(getToken);
  try {
    const { data, error } = await client
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error, 'fetch user stats');
    }
    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch user stats');
  }
};

/**
 * Update a user's stats
 */
export const updateUserStats = async (
  userId: string,
  updates: UserStatsUpdate,
  getToken?: () => Promise<string | null>
): Promise<UserStats> => {
  const client = getAuthenticatedClient(getToken);
  try {
    // This would typically be a transaction or a stored procedure for safety
    const { data, error } = await client
      .from('user_stats')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) handleSupabaseError(error, 'update user stats');
    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'update user stats');
  }
};

/**
 * Fetch the leaderboard
 */
export const fetchLeaderboard = async (
  limit = 10,
  getToken?: () => Promise<string | null>
): Promise<LeaderboardUser[]> => {
    const client = getAuthenticatedClient(getToken);
    try {
        const { data, error } = await client
            .from('leaderboard') // Assuming a view or function named 'leaderboard'
            .select('*')
            .limit(limit);

        if (error) handleSupabaseError(error, 'fetch leaderboard');
        
        return data || [];
    } catch (error) {
        if (error instanceof SupabaseApiError) throw error;
        return handleSupabaseError(error, 'fetch leaderboard');
    }
};

/**
 * Grant points to a user
 * This should be handled in a secure server-side environment (e.g., Edge Function)
 */
export const grantPoints = async (
  userId: string,
  points: number,
  getToken?: () => Promise<string | null>
): Promise<{ success: boolean; newTotal?: number }> => {
  // This is a placeholder for a secure server-side operation.
  // Directly calling this from the client is insecure.
  console.log(`Granting ${points} points to user ${userId}. This should be a server-side call.`);
  const stats = await fetchUserStats(userId, getToken);
  if (stats) {
    const newTotal = (stats.total_points || 0) + points;
    await updateUserStats(userId, { total_points: newTotal }, getToken);
    return { success: true, newTotal };
  }
  return { success: false };
}; 