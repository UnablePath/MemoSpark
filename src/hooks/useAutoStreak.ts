'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreakTracker } from '@/lib/gamification/StreakTracker';

/**
 * Automatic streak check-in hook for all users (including free users)
 * Automatically marks daily completion when user visits the app
 * Runs once per day per user to maintain streaks without manual interaction
 */
export const useAutoStreak = (enabled: boolean = true) => {
  const { user, isLoaded } = useUser();
  const streakTracker = useRef(new StreakTracker());
  const hasCheckedIn = useRef(false);

  useEffect(() => {
    if (!enabled || !isLoaded || !user?.id || hasCheckedIn.current) {
      return;
    }

    const autoCheckIn = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const lastCheckInKey = `lastAutoCheckIn_${user.id}`;
        const lastCheckIn = localStorage.getItem(lastCheckInKey);

        // Only check in once per day
        if (lastCheckIn === today) {
          hasCheckedIn.current = true;
          return;
        }

        console.log('🔥 Auto-checking in for streak...');
        
        // Perform automatic daily completion
        const result = await streakTracker.current.markDailyCompletion(
          user.id,
          1, // 1 task completed (daily login)
          5  // 5 points for daily login (lower than manual check-in)
        );

        if (result.success) {
          // Store today's date in localStorage to prevent duplicate check-ins
          localStorage.setItem(lastCheckInKey, today);
          hasCheckedIn.current = true;

          console.log(`✅ Auto check-in successful! Streak: ${result.newStreak} days`);
          
          // Schedule next day's streak reminder automatically
          try {
            const response = await fetch('/api/notifications/schedule-daily-streaks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'enable',
                timeOfDay: '20:00', // 8PM default
                currentStreak: result.newStreak
              })
            });

            if (response.ok) {
              console.log(`📅 Next day's streak reminder scheduled for ${result.newStreak + 1} day streak`);
            } else {
              console.warn('⚠️ Failed to schedule next streak reminder');
            }
          } catch (reminderError) {
            console.warn('⚠️ Error scheduling streak reminder:', reminderError);
          }
          
          // Process coin rewards
          let coinsEarned = 0;
          let coinNotification = '';
          
          if (result.coinRewards) {
            const { dailyBonus, milestoneBonus, streakPenalty } = result.coinRewards;
            
            // Calculate total coins earned
            coinsEarned = (dailyBonus.amount || 0) + (milestoneBonus.amount || 0);
            
            if (coinsEarned > 0) {
              if (milestoneBonus.amount && milestoneBonus.amount > 0) {
                coinNotification = ` (+${coinsEarned} coins milestone bonus!)`;
              } else if (dailyBonus.amount && dailyBonus.amount > 0) {
                coinNotification = ` (+${coinsEarned} coins)`;
              }
            }

            // Show penalty notification if applicable
            if (streakPenalty?.success && streakPenalty.amount > 0) {
              const { toast } = await import('sonner');
              toast.error(`💔 Streak broken! Lost ${streakPenalty.amount} coins`, {
                description: `Don't give up! Start a new streak today.`,
                duration: 5000,
              });
            }
          }
          
          // Show main notification with coin information
          if (result.achievementsUnlocked.length > 0) {
            // Show achievements
            const { toast } = await import('sonner');
            toast.success(`Daily check-in complete! 🔥 ${result.newStreak} day streak${coinNotification}`, {
              description: `Achievement unlocked: ${result.achievementsUnlocked[0].achievement?.name}`,
              duration: 4000,
            });
          } else if (result.newStreak > 1) {
            // Show subtle streak continuation for streaks > 1 day
            const { toast } = await import('sonner');
            toast(`🔥 ${result.newStreak} day streak maintained!${coinNotification}`, {
              description: 'Keep up the great work! Next reminder at 8PM.',
              duration: 2000,
            });
          } else if (result.newStreak === 1) {
            // Show encouragement for new streak
            const { toast } = await import('sonner');
            toast(`🌟 Great start! Day 1 streak${coinNotification}`, {
              description: 'Daily reminders will help you build the habit!',
              duration: 2000,
            });
          }
        }
      } catch (error) {
        console.error('Auto streak check-in failed:', error);
        // Fail silently - don't interrupt user experience
      }
    };

    // Delay the auto check-in slightly to ensure the app has loaded
    const timer = setTimeout(autoCheckIn, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [user?.id, isLoaded, enabled]);

  return {
    isEnabled: enabled && isLoaded && !!user?.id,
    hasCheckedIn: hasCheckedIn.current
  };
}; 