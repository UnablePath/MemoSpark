'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { fetchUserStats, fetchLeaderboard } from '@/lib/supabase/gamificationApi';
import { StreakTracker } from '@/lib/gamification/StreakTracker';
import type { UserStats, LeaderboardUser, UserAchievement, Achievement } from '@/types/achievements';

/**
 * @deprecated This hook is deprecated. Use useFetchAchievements from @/hooks/useAchievementQueries instead.
 * This legacy hook will be removed in a future version.
 */
export const useAchievements = () => {
  console.warn('useAchievements is deprecated. Use useFetchAchievements from @/hooks/useAchievementQueries instead.');
  
  const { user, isLoaded } = useUser();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch achievements from the new API
  const fetchAchievementsData = useCallback(async () => {
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        return {
          achievements: data.achievements || [],
          userAchievements: data.achievements?.filter((a: any) => a.unlocked) || []
        };
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
    return { achievements: [], userAchievements: [] };
  }, []);

  // Function to fetch coin balance
  const fetchCoinBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/balance');
      if (response.ok) {
        const data = await response.json();
        return data.balance || 0;
      }
    } catch (error) {
      console.error('Error fetching coin balance:', error);
    }
    return 0;
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // Get real streak data from StreakTracker
          const streakTracker = new StreakTracker();
          
          const [
            stats, 
            board, 
            realStreakData, 
            achievementsData,
            coinBalance
          ] = await Promise.all([
            fetchUserStats(user.id).catch(() => null),
            fetchLeaderboard(10).catch(() => []),
            streakTracker.getCurrentStreak(user.id).catch(() => ({ current_streak: 0, longest_streak: 0 })),
            fetchAchievementsData(),
            fetchCoinBalance()
          ]);
          
          // Merge real streak data with user stats and add coin balance
          const mergedStats = stats ? {
            ...stats,
            current_streak: realStreakData.current_streak,
            longest_streak: realStreakData.longest_streak,
            coin_balance: coinBalance
          } : {
            user_id: user.id,
            total_points: 0,
            level: 1,
            current_streak: realStreakData.current_streak,
            longest_streak: realStreakData.longest_streak,
            tasks_completed: 0,
            achievements_earned: achievementsData.userAchievements.length,
            coin_balance: coinBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setUserStats(mergedStats);
          setLeaderboard(board);
          setAllAchievements(achievementsData.achievements);
          
          // Convert achievements data to UserAchievement format
          const userAchievementsFormatted = achievementsData.userAchievements.map((achievement: any) => ({
            id: achievement.id,
            user_id: user.id,
            achievement_id: achievement.id,
            unlocked_at: achievement.unlockedAt || new Date().toISOString(),
            progress: achievement.userProgress || {},
            achievements: achievement
          }));
          
          setUserAchievements(userAchievementsFormatted);
          
        } catch (error) {
          console.error("Failed to load gamification data:", error);
          setError(error instanceof Error ? error.message : 'Failed to load data');
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
  }, [user, isLoaded, fetchAchievementsData, fetchCoinBalance]);

  // Force refresh function
  const reload = useCallback(async () => {
    if (!user?.id || !isLoaded) return;

    setLoading(true);
    setError(null);

    try {
      // Get real streak data from StreakTracker
      const streakTracker = new StreakTracker();
      
      const [
        statsResponse, 
        leaderboardResponse, 
        realStreakData,
        achievementsData,
        coinBalance
      ] = await Promise.all([
        fetchUserStats(user.id).catch(() => null),
        fetchLeaderboard(10).catch(() => []),
        streakTracker.getCurrentStreak(user.id).catch(() => ({ current_streak: 0, longest_streak: 0 })),
        fetchAchievementsData(),
        fetchCoinBalance()
      ]);

      // Merge real streak data with user stats and add coin balance
      const mergedStats = statsResponse ? {
        ...statsResponse,
        current_streak: realStreakData.current_streak,
        longest_streak: realStreakData.longest_streak,
        coin_balance: coinBalance
      } : {
        user_id: user.id,
        total_points: 0,
        level: 1,
        current_streak: realStreakData.current_streak,
        longest_streak: realStreakData.longest_streak,
        tasks_completed: 0,
        achievements_earned: achievementsData.userAchievements.length,
        coin_balance: coinBalance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setUserStats(mergedStats);
      setLeaderboard(leaderboardResponse);
      setAllAchievements(achievementsData.achievements);
      
      // Convert achievements data to UserAchievement format
      const userAchievementsFormatted = achievementsData.userAchievements.map((achievement: any) => ({
        id: achievement.id,
        user_id: user.id,
        achievement_id: achievement.id,
        unlocked_at: achievement.unlockedAt || new Date().toISOString(),
        progress: achievement.userProgress || {},
        achievements: achievement
      }));
      
      setUserAchievements(userAchievementsFormatted);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isLoaded, fetchAchievementsData, fetchCoinBalance]);

  return {
    userStats,
    leaderboard,
    userAchievements,
    allAchievements,
    loading,
    error,
    reload
  };
}; 