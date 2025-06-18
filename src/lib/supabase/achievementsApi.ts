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
 * Unlock an achievement for a user
 */
export const unlockAchievement = async (
  achievementData: UserAchievementInsert,
  getToken?: () => Promise<string | null>
): Promise<UserAchievement> => {
  const client = getAuthenticatedClient(getToken);
  try {
    // Check if achievement is already unlocked
    const { data: existing, error: checkError } = await client
      .from('user_achievements')
      .select('id')
      .eq('user_id', achievementData.user_id)
      .eq('achievement_id', achievementData.achievement_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      handleSupabaseError(checkError, 'check existing achievement');
    }

    if (existing) {
      throw new SupabaseApiError('Achievement already unlocked', '23505');
    }
    
    const { data, error } = await client
      .from('user_achievements')
      .insert(achievementData)
      .select()
      .single();
      
    if (error) handleSupabaseError(error, 'unlock achievement');
    return data;
  } catch (error) {
    if (error instanceof SupabaseApiError) throw error;
    return handleSupabaseError(error, 'unlock achievement');
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