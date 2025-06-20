'use client';

import { useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface AchievementTriggerOptions {
  action?: string;
  value?: any;
  metadata?: Record<string, any>;
  showToast?: boolean;
}

export const useAchievementTrigger = () => {
  const { user } = useUser();

  const triggerAchievement = useCallback(async (
    action: string,
    options: AchievementTriggerOptions = {}
  ) => {
    if (!user?.id || !action) return;

    try {
      const response = await fetch('/api/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          value: options.value,
          metadata: options.metadata
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.unlockedAchievements?.length > 0) {
          // Trigger the achievement notification system
          const notifier = (window as any).achievementNotifier;
          if (notifier) {
            result.unlockedAchievements.forEach((achievement: any) => {
              notifier.addNotification(achievement);
            });
          }

          // Show toast if enabled
          if (options.showToast !== false) {
            const totalCoins = result.totalCoinsEarned || 0;
            toast.success(result.message, {
              description: totalCoins > 0 ? `+${totalCoins} coins earned!` : undefined,
              duration: 4000,
            });
          }

          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
            detail: { 
              achievements: result.unlockedAchievements,
              totalCoins: result.totalCoinsEarned
            }
          }));

          return {
            success: true,
            achievements: result.unlockedAchievements,
            totalCoins: result.totalCoinsEarned
          };
        }
      }
    } catch (error) {
      console.error('Error triggering achievement:', error);
    }

    return { success: false };
  }, [user?.id]);

  // Convenience methods for common achievement triggers
  const triggerTaskCompleted = useCallback((taskName?: string) => {
    return triggerAchievement('task_completed', {
      metadata: { taskName },
      showToast: true
    });
  }, [triggerAchievement]);

  const triggerStreakIncreased = useCallback((streakCount: number) => {
    return triggerAchievement('streak_increased', {
      value: streakCount,
      showToast: true
    });
  }, [triggerAchievement]);

  const triggerBubbleGamePlayed = useCallback(() => {
    return triggerAchievement('bubble_game_played', {
      metadata: { gameType: 'bubble' },
      showToast: true
    });
  }, [triggerAchievement]);

  const triggerBubbleScoreAchievement = useCallback((score: number) => {
    return triggerAchievement('bubble_score_reached', {
      value: score,
      metadata: { gameType: 'bubble' },
      showToast: true
    });
  }, [triggerAchievement]);

  const triggerSocialAction = useCallback((socialAction: string, metadata?: Record<string, any>) => {
    return triggerAchievement('social_action', {
      metadata: { socialAction, ...metadata },
      showToast: true
    });
  }, [triggerAchievement]);

  const triggerTutorialStep = useCallback((step: string, metadata?: Record<string, any>) => {
    return triggerAchievement('tutorial_step', {
      value: step,
      metadata: { step, ...metadata },
      showToast: false // Usually don't show toast for tutorial steps
    });
  }, [triggerAchievement]);

  const triggerWellnessAction = useCallback((action: string, metadata?: Record<string, any>) => {
    return triggerAchievement('wellness_action', {
      metadata: { wellnessAction: action, ...metadata },
      showToast: true
    });
  }, [triggerAchievement]);

  return {
    triggerAchievement,
    triggerTaskCompleted,
    triggerStreakIncreased,
    triggerBubbleGamePlayed,
    triggerBubbleScoreAchievement,
    triggerSocialAction,
    triggerTutorialStep,
    triggerWellnessAction
  };
}; 