'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { fetchUserStats, fetchLeaderboard } from '@/lib/supabase/gamificationApi';
import { fetchUserAchievements } from '@/lib/supabase/achievementsApi';
import { StreakTracker } from '@/lib/gamification/StreakTracker';
import type { UserStats, LeaderboardUser, UserAchievement } from '@/types/achievements';

export const useAchievements = () => {
  const { user, isLoaded } = useUser();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const loadData = async () => {
        setLoading(true);
        try {
          // Get real streak data from StreakTracker
          const streakTracker = new StreakTracker();
          const [stats, board, achievements, realStreakData] = await Promise.all([
            fetchUserStats(user.id),
            fetchLeaderboard(10),
            fetchUserAchievements(user.id),
            streakTracker.getCurrentStreak(user.id)
          ]);
          
          // Merge real streak data with user stats
          const mergedStats = stats ? {
            ...stats,
            current_streak: realStreakData.current_streak,
            longest_streak: realStreakData.longest_streak
          } : realStreakData;
          
          setUserStats(mergedStats);
          setLeaderboard(board);
          setUserAchievements(achievements);
        } catch (error) {
          console.error("Failed to load gamification data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else if (!isLoaded) {
      // Still loading
    } else {
      // Not signed in
      setLoading(false);
    }
  }, [user, isLoaded]);

  // Force refresh function
  const reload = useCallback(async () => {
    if (!user?.id || !isLoaded) return;

    setLoading(true);
    setError(null);

    try {
      // Get real streak data from StreakTracker
      const streakTracker = new StreakTracker();
      const [statsResponse, leaderboardResponse, achievementsResponse, realStreakData] = await Promise.all([
        fetchUserStats(user.id),
        fetchLeaderboard(10),
        fetchUserAchievements(user.id),
        streakTracker.getCurrentStreak(user.id)
      ]);

      // Merge real streak data with user stats
      const mergedStats = statsResponse ? {
        ...statsResponse,
        current_streak: realStreakData.current_streak,
        longest_streak: realStreakData.longest_streak
      } : realStreakData;

      setUserStats(mergedStats);
      setLeaderboard(leaderboardResponse);
      setUserAchievements(achievementsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isLoaded]);

  return {
    userStats,
    leaderboard,
    userAchievements,
    loading,
    error,
    reload
  };
}; 