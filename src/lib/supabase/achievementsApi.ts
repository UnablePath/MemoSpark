import { supabase, supabaseHelpers, createAuthenticatedSupabaseClient } from './client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type {
  Achievement,
  UserAchievement,
  AchievementInsert,
  UserAchievementInsert,
} from '@/types/achievements';
import { SupabaseApiError, handleSupabaseError, getAuthenticatedClient } from './tasksApi';

// ========================================
// ACHIEVEMENTS API FUNCTIONS
// ========================================

/**
 * Fetch all available achievements
 */
export const fetchAllAchievements = async (): Promise<Achievement[]> => {
  if (!supabase) {
    return handleSupabaseError({ message: 'Supabase client not initialized' }, 'fetch all achievements');
  }
  try {
    const { data, error } = await supabase.from('achievements').select('*');
    if (error) handleSupabaseError(error, 'fetch all achievements');
    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch all achievements');
  }
};

/**
 * Fetch a user's unlocked achievements
 */
export const fetchUserAchievements = async (
  userId: string,
  getToken?: () => Promise<string | null>
): Promise<UserAchievement[]> => {
  const client = getAuthenticatedClient(getToken);
  try {
    const { data, error } = await client
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', userId);
    if (error) handleSupabaseError(error, 'fetch user achievements');
    return data || [];
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'fetch user achievements');
  }
};

/**
 * Unlock an achievement for a user - Now using API route
 */
export const unlockAchievement = async (
  achievementData: UserAchievementInsert,
  getToken?: () => Promise<string | null>
): Promise<UserAchievement> => {
  try {
    // Use the API route instead of direct Supabase access
    const response = await fetch('/api/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'direct_unlock', // Special action for direct achievement unlock
        achievementId: achievementData.achievement_id,
        progress: achievementData.progress || {}
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new SupabaseApiError(errorData.error || 'Failed to unlock achievement', response.status.toString());
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new SupabaseApiError(result.error || 'Failed to unlock achievement', '500');
    }

    // Return the unlocked achievement in the expected format
    return {
      id: `temp-${Date.now()}`, // Temporary ID since API doesn't return full record
      user_id: achievementData.user_id,
      achievement_id: achievementData.achievement_id,
      unlocked_at: new Date().toISOString(),
      earned_at: new Date().toISOString(), // Alias for unlocked_at for compatibility
      progress: achievementData.progress || {}
    };
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    console.error('Error unlocking achievement:', error);
    throw new SupabaseApiError('Failed to unlock achievement', '500');
  }
};

/**
 * Check achievement progress based on a user action
 * This is a conceptual and complex function that would need a dedicated engine.
 * For now, this is a placeholder.
 */
export const checkAchievementProgress = async (
  userId: string,
  action: { type: string; payload: any },
  getToken?: () => Promise<string | null>
) => {
  console.log('Checking achievement progress for', userId, action);
  // In a real implementation, this would involve:
  // 1. Fetching all achievements relevant to the action type.
  // 2. For each achievement, checking the criteria against the user's progress.
  // 3. If criteria are met, calling unlockAchievement.
  // This is highly specific to the game logic and is simplified here.
  return { message: "Progress check placeholder" };
};

/**
 * Real-time subscription for achievement unlocks
 */
export const subscribeToUserAchievements = (
  userId: string,
  callback: (payload: RealtimePostgresChangesPayload<UserAchievement>) => void,
  getToken?: () => Promise<string | null>
) => {
  const client = getAuthenticatedClient(getToken);
  const channel = client
    .channel(`user-achievements-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<UserAchievement>) => {
        callback(payload as RealtimePostgresChangesPayload<UserAchievement>);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}; 