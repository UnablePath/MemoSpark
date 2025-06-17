'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { AchievementNotification } from './AchievementBadge';
import { achievementEngine } from '@/lib/gamification/AchievementEngine';
import { stuCelebration } from '@/lib/stu/StuCelebration';
import type { AchievementUnlockResult } from '@/lib/gamification/AchievementEngine';
import type { Achievement } from '@/types/achievements';

interface NotificationQueueItem {
  id: string;
  achievement: Achievement;
  timestamp: number;
  duration?: number;
}

interface AchievementNotificationSystemProps {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export const AchievementNotificationSystem: React.FC<AchievementNotificationSystemProps> = ({
  maxNotifications = 3,
  defaultDuration = 5000,
  position = 'top-right'
}) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationQueueItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize achievement engine
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        await achievementEngine.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize achievement engine:', error);
      }
    };

    if (!isInitialized) {
      initializeEngine();
    }
  }, [isInitialized]);

  // Auto-dismiss notifications after duration
  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map((notification) => {
      const duration = notification.duration || defaultDuration;
      return setTimeout(() => {
        dismissNotification(notification.id);
      }, duration);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, defaultDuration]);

  // Add new notification to queue
  const addNotification = useCallback((achievement: Achievement, duration?: number) => {
    const newNotification: NotificationQueueItem = {
      id: `${achievement.id}-${Date.now()}`,
      achievement,
      timestamp: Date.now(),
      duration
    };

    setNotifications(prev => {
      // Remove oldest notifications if we exceed max
      const updated = [...prev, newNotification];
      if (updated.length > maxNotifications) {
        return updated.slice(-maxNotifications);
      }
      return updated;
    });
  }, [maxNotifications]);

  // Dismiss specific notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Check achievements and show notifications
  const checkAndNotifyAchievements = useCallback(async (
    action: 'task_completed' | 'streak_increased' | 'tutorial_completed' | 'social_interaction',
    value?: number
  ) => {
    if (!user || !isInitialized) return;

    try {
      const results = await achievementEngine.quickCheck(user.id, action, value);
      
      results.forEach((result: AchievementUnlockResult) => {
        if (result.success && result.achievement && result.isNew) {
          addNotification(result.achievement);
          
          // Play achievement sound (optional)
          playAchievementSound();
          
          // Trigger celebration animation (could integrate with Stu mascot)
          triggerCelebration(result.achievement);
        }
      });
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  }, [user, isInitialized, addNotification]);

  // Play achievement unlock sound
  const playAchievementSound = useCallback(() => {
    try {
      // Create a simple achievement sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a simple ascending melody
      const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
      let index = 0;

      const playNote = () => {
        if (index < frequencies.length) {
          oscillator.frequency.setValueAtTime(frequencies[index], audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          index++;
          setTimeout(playNote, 150);
        } else {
          oscillator.stop();
        }
      };

      oscillator.start();
      playNote();
    } catch (error) {
      // Silently fail if audio context is not available
      console.log('Achievement sound not available');
    }
  }, []);

  // Trigger celebration animation
  const triggerCelebration = useCallback((achievement: Achievement) => {
    // Trigger Stu celebration system
    stuCelebration.achievementUnlocked({
      id: achievement.id,
      user_id: user?.id || '',
      achievement_id: achievement.id,
      unlocked_at: new Date().toISOString(),
      earned_at: new Date().toISOString(),
      progress: {},
      achievements: achievement
    });
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('achievementUnlocked', {
      detail: { achievement }
    }));
  }, [user]);

  // Expose methods for external use
  useEffect(() => {
    const globalAchievementNotifier = {
      checkAndNotify: checkAndNotifyAchievements,
      addNotification,
      clearAll: clearAllNotifications
    };

    // Attach to window for global access
    (window as any).achievementNotifier = globalAchievementNotifier;

    return () => {
      delete (window as any).achievementNotifier;
    };
  }, [checkAndNotifyAchievements, addNotification, clearAllNotifications]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-3 pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ 
              x: position.includes('right') ? 400 : position.includes('left') ? -400 : 0,
              y: position.includes('bottom') ? 100 : -100,
              opacity: 0,
              scale: 0.8
            }}
            animate={{ 
              x: 0, 
              y: 0, 
              opacity: 1,
              scale: 1
            }}
            exit={{ 
              x: position.includes('right') ? 400 : position.includes('left') ? -400 : 0,
              y: position.includes('bottom') ? 100 : -100,
              opacity: 0,
              scale: 0.8
            }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 120,
              layout: { duration: 0.3 }
            }}
            className="pointer-events-auto"
          >
            <div className="relative">
              {/* Celebration particles */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-4 pointer-events-none"
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0,
                      rotate: 0
                    }}
                    animate={{ 
                      x: Math.cos((i * Math.PI * 2) / 8) * 50,
                      y: Math.sin((i * Math.PI * 2) / 8) * 50,
                      scale: [0, 1, 0],
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: 1
                    }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                  />
                ))}
              </motion.div>

              <AchievementNotification
                achievements={[notification.achievement]}
                onDismiss={() => dismissNotification(notification.id)}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Clear all button when multiple notifications */}
      {notifications.length > 1 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={clearAllNotifications}
          className="w-full bg-gray-800/90 hover:bg-gray-700/90 text-white text-sm py-2 px-4 rounded-lg backdrop-blur-sm transition-colors pointer-events-auto"
        >
          Clear All ({notifications.length})
        </motion.button>
      )}
    </div>
  );
};

// Hook for using achievement notifications
export const useAchievementNotifications = () => {
  const checkAndNotify = useCallback((
    action: 'task_completed' | 'streak_increased' | 'tutorial_completed' | 'social_interaction',
    value?: number
  ) => {
    const notifier = (window as any).achievementNotifier;
    if (notifier) {
      notifier.checkAndNotify(action, value);
    }
  }, []);

  const addCustomNotification = useCallback((achievement: Achievement, duration?: number) => {
    const notifier = (window as any).achievementNotifier;
    if (notifier) {
      notifier.addNotification(achievement, duration);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    const notifier = (window as any).achievementNotifier;
    if (notifier) {
      notifier.clearAll();
    }
  }, []);

  return {
    checkAndNotify,
    addCustomNotification,
    clearAllNotifications
  };
}; 