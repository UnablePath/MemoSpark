'use client';

import { useCallback, useEffect, useState } from 'react';
import { stuCelebration, type CelebrationType, type CelebrationConfig } from '@/lib/stu/StuCelebration';
import type { Achievement, UserAchievement } from '@/types/achievements';

interface UseCelebrationReturn {
  celebrate: (
    type: CelebrationType,
    achievement?: Achievement | UserAchievement,
    customMessage?: string
  ) => Promise<void>;
  achievementUnlocked: (achievement: Achievement | UserAchievement) => Promise<void>;
  streakMilestone: (streakCount: number) => Promise<void>;
  coinsEarned: (amount: number) => Promise<void>;
  levelUp: (newLevel: number) => Promise<void>;
  taskCompleted: (taskName?: string) => Promise<void>;
  firstTimeAchievement: (achievementName: string) => Promise<void>;
  stopCelebration: () => void;
  isPlaying: boolean;
  currentCelebration: CelebrationConfig | null;
}

export const useCelebration = (): UseCelebrationReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationConfig | null>(null);

  // Update local state when celebration starts/ends
  useEffect(() => {
    const handleCelebrationStart = (event: Event) => {
      const customEvent = event as CustomEvent<CelebrationConfig>;
      setIsPlaying(true);
      setCurrentCelebration(customEvent.detail);
    };

    const handleCelebrationEnd = () => {
      setIsPlaying(false);
      setCurrentCelebration(null);
    };

    const handleCelebrationStop = () => {
      setIsPlaying(false);
      setCurrentCelebration(null);
    };

    window.addEventListener('stu-celebration', handleCelebrationStart);
    window.addEventListener('stu-celebration-end', handleCelebrationEnd);
    window.addEventListener('stu-celebration-stop', handleCelebrationStop);

    return () => {
      window.removeEventListener('stu-celebration', handleCelebrationStart);
      window.removeEventListener('stu-celebration-end', handleCelebrationEnd);
      window.removeEventListener('stu-celebration-stop', handleCelebrationStop);
    };
  }, []);

  // Initialize state from singleton
  useEffect(() => {
    setIsPlaying(stuCelebration.isCurrentlyPlaying());
    setCurrentCelebration(stuCelebration.getCurrentCelebration());
  }, []);

  const celebrate = useCallback(async (
    type: CelebrationType,
    achievement?: Achievement | UserAchievement,
    customMessage?: string
  ) => {
    return stuCelebration.celebrate(type, achievement, customMessage);
  }, []);

  const achievementUnlocked = useCallback(async (achievement: Achievement | UserAchievement) => {
    return stuCelebration.achievementUnlocked(achievement);
  }, []);

  const streakMilestone = useCallback(async (streakCount: number) => {
    return stuCelebration.streakMilestone(streakCount);
  }, []);

  const coinsEarned = useCallback(async (amount: number) => {
    return stuCelebration.coinsEarned(amount);
  }, []);

  const levelUp = useCallback(async (newLevel: number) => {
    return stuCelebration.levelUp(newLevel);
  }, []);

  const taskCompleted = useCallback(async (taskName?: string) => {
    return stuCelebration.taskCompleted(taskName);
  }, []);

  const firstTimeAchievement = useCallback(async (achievementName: string) => {
    return stuCelebration.firstTimeAchievement(achievementName);
  }, []);

  const stopCelebration = useCallback(() => {
    stuCelebration.stopCelebration();
  }, []);

  return {
    celebrate,
    achievementUnlocked,
    streakMilestone,
    coinsEarned,
    levelUp,
    taskCompleted,
    firstTimeAchievement,
    stopCelebration,
    isPlaying,
    currentCelebration,
  };
}; 