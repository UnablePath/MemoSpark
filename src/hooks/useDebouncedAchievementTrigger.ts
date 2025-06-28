'use client';

import { useCallback, useRef } from 'react';
import { useAchievementTrigger } from './useAchievementTrigger';
import { useUser } from '@clerk/nextjs';

interface DebouncedTriggerOptions {
  action?: string;
  value?: any;
  metadata?: Record<string, any>;
  showToast?: boolean;
}

/**
 * Debounced wrapper around useAchievementTrigger to prevent excessive POST requests
 * Uses 500ms debounce delay following the pattern from AIQuestionnaire.tsx
 * Includes deduplication to prevent duplicate triggers for the same action+user
 */
export const useDebouncedAchievementTrigger = () => {
  const { user } = useUser();
  const originalTrigger = useAchievementTrigger();
  
  // Map to store pending timers, keyed by action+userId for deduplication
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Create debounced version of triggerAchievement
  const debouncedTriggerAchievement = useCallback(async (
    action: string,
    options: DebouncedTriggerOptions = {}
  ) => {
    if (!user?.id || !action) return { success: false };

    // Create unique key for this action+user combination
    const triggerKey = `${action}-${user.id}`;
    
    // Clear existing timer for this specific trigger if it exists
    const existingTimer = debounceTimers.current.get(triggerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up new debounced timer (500ms delay)
    const timer = setTimeout(async () => {
      try {
        // Execute the original trigger after debounce period
        const result = await originalTrigger.triggerAchievement(action, options);
        
        // Clean up the timer from our map
        debounceTimers.current.delete(triggerKey);
        
        return result;
      } catch (error) {
        console.error('Error in debounced achievement trigger:', error);
        debounceTimers.current.delete(triggerKey);
        return { success: false };
      }
    }, 500); // 500ms debounce delay

    // Store the timer in our map
    debounceTimers.current.set(triggerKey, timer);
    
    // Return a promise that resolves when the debounced action completes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, debounced: true });
      }, 500);
    });
  }, [user?.id, originalTrigger]);

  // Debounced convenience methods wrapping all original methods
  const debouncedTriggerTaskCompleted = useCallback((taskName?: string) => {
    return debouncedTriggerAchievement('task_completed', {
      metadata: { taskName },
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerStreakIncreased = useCallback((streakCount: number) => {
    return debouncedTriggerAchievement('streak_increased', {
      value: streakCount,
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerBubbleGamePlayed = useCallback(() => {
    return debouncedTriggerAchievement('bubble_game_played', {
      metadata: { gameType: 'bubble' },
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerBubbleScoreAchievement = useCallback((score: number) => {
    return debouncedTriggerAchievement('bubble_score_reached', {
      value: score,
      metadata: { gameType: 'bubble' },
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerSocialAction = useCallback((socialAction: string, metadata?: Record<string, any>) => {
    return debouncedTriggerAchievement('social_action', {
      metadata: { socialAction, ...metadata },
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerTutorialStep = useCallback((step: string, metadata?: Record<string, any>) => {
    return debouncedTriggerAchievement('tutorial_step', {
      value: step,
      metadata: { step, ...metadata },
      showToast: false // Usually don't show toast for tutorial steps
    });
  }, [debouncedTriggerAchievement]);

  const debouncedTriggerWellnessAction = useCallback((action: string, metadata?: Record<string, any>) => {
    return debouncedTriggerAchievement('wellness_action', {
      metadata: { wellnessAction: action, ...metadata },
      showToast: true
    });
  }, [debouncedTriggerAchievement]);

  // Cleanup function to clear all pending timers (useful for component unmount)
  const clearAllPendingTriggers = useCallback(() => {
    debounceTimers.current.forEach((timer) => {
      clearTimeout(timer);
    });
    debounceTimers.current.clear();
  }, []);

  return {
    // Debounced versions (recommended for use)
    triggerAchievement: debouncedTriggerAchievement,
    triggerTaskCompleted: debouncedTriggerTaskCompleted,
    triggerStreakIncreased: debouncedTriggerStreakIncreased,
    triggerBubbleGamePlayed: debouncedTriggerBubbleGamePlayed,
    triggerBubbleScoreAchievement: debouncedTriggerBubbleScoreAchievement,
    triggerSocialAction: debouncedTriggerSocialAction,
    triggerTutorialStep: debouncedTriggerTutorialStep,
    triggerWellnessAction: debouncedTriggerWellnessAction,
    
    // Utility functions
    clearAllPendingTriggers,
    
    // Access to original non-debounced versions if needed
    immediate: originalTrigger
  };
}; 