import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  fetchAllAchievements,
  fetchUserAchievements,
  subscribeToUserAchievements,
  fetchUserStats,
  fetchLeaderboard,
} from '@/lib/supabase/client';
import type { Achievement, UserAchievement, UserStats, LeaderboardUser } from '@/types/achievements';

export const useAchievements = () => {
  const { getToken, userId } = useAuth();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const token = await getToken({ template: 'supabase-integration' });
      const [all, user, stats, board] = await Promise.all([
        fetchAllAchievements(),
        fetchUserAchievements(userId, () => Promise.resolve(token)),
        fetchUserStats(userId, () => Promise.resolve(token)),
        fetchLeaderboard(10, () => Promise.resolve(token)),
      ]);
      setAllAchievements(all);
      setUserAchievements(user);
      setUserStats(stats);
      setLeaderboard(board);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!userId) return;

    const handleNewAchievement = (payload: any) => {
      // A more robust implementation would fetch the new achievement details
      console.log('New achievement unlocked!', payload);
      loadInitialData(); // Reload data on new achievement
    };

    const tokenProvider = async () => getToken({ template: 'supabase-integration' });
    const unsubscribe = subscribeToUserAchievements(userId, handleNewAchievement, tokenProvider);

    return () => {
      unsubscribe();
    };
  }, [userId, getToken, loadInitialData]);

  return {
    allAchievements,
    userAchievements,
    userStats,
    leaderboard,
    loading,
    error,
    reload: loadInitialData,
  };
}; 