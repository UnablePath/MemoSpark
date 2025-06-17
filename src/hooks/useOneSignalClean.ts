import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { oneSignalService } from '@/lib/notifications/OneSignalService';

interface OneSignalState {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  isPushSupported: boolean;
  error: string | null;
}

// Extend window interface for OneSignal
declare global {
  interface Window {
    OneSignalDeferred?: Promise<any>;
    OneSignal?: any;
  }
}

export const useOneSignalClean = () => {
  const { userId } = useAuth();
  const [state, setState] = useState<OneSignalState>({
    isInitialized: false,
    isSubscribed: false,
    playerId: null,
    isPushSupported: false,
    error: null,
  });

  // Initialize OneSignal
  const initializeOneSignal = useCallback(async () => {
    try {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
        throw new Error('OneSignal App ID not configured');
      }

      // Check if push notifications are supported
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState(prev => ({ 
          ...prev, 
          isPushSupported: false, 
          error: 'Push notifications not supported',
          isInitialized: true,
        }));
        return;
      }

      // Load OneSignal SDK if not already loaded
      if (!window.OneSignal && !window.OneSignalDeferred) {
        window.OneSignalDeferred = new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          script.onload = () => {
            // Wait a bit for OneSignal to be available
            setTimeout(() => resolve(window.OneSignal), 100);
          };
          document.head.appendChild(script);
        });
      }

      // Wait for OneSignal to load
      const OneSignal = window.OneSignal || await window.OneSignalDeferred;
      
      if (!OneSignal || !OneSignal.init) {
        throw new Error('OneSignal SDK failed to load properly');
      }

      // Initialize OneSignal
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        serviceWorkerParam: {
          scope: '/onesignal/',
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
      });

      // Check current subscription status
      const permission = await OneSignal.Notifications.permission;
      const isSubscribed = permission === 'granted';
      
      let playerId = null;
      if (isSubscribed) {
        try {
          playerId = OneSignal.User.PushSubscription.id || null;
        } catch (e) {
          console.warn('Could not get player ID:', e);
        }
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSubscribed,
        playerId,
        isPushSupported: true,
        error: null,
      }));

      // Store player ID in database if user is authenticated
      if (playerId && userId) {
        await oneSignalService.storePlayerSubscription(userId, playerId, navigator.userAgent);
      }

    } catch (error) {
      console.error('Error initializing OneSignal:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize notifications',
        isInitialized: true,
      }));
    }
  }, [userId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized) {
        throw new Error('OneSignal not initialized');
      }

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const OneSignal = window.OneSignal || await window.OneSignalDeferred;

      // Request permission
      await OneSignal.Slidedown.promptPush();
      
      // Check if permission was granted
      const permission = await OneSignal.Notifications.permission;
      const isSubscribed = permission === 'granted';
      
      if (isSubscribed) {
        let playerId = null;
        try {
          playerId = OneSignal.User.PushSubscription.id || null;
        } catch (e) {
          console.warn('Could not get player ID after subscription:', e);
        }
        
        if (playerId) {
          // Store subscription in database
          await oneSignalService.storePlayerSubscription(userId, playerId, navigator.userAgent);

          setState(prev => ({
            ...prev,
            isSubscribed: true,
            playerId,
            error: null,
          }));

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to notifications' 
      }));
      return false;
    }
  }, [state.isInitialized, userId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized) {
        throw new Error('OneSignal not initialized');
      }

      const OneSignal = window.OneSignal || await window.OneSignalDeferred;

      await OneSignal.User.PushSubscription.optOut();

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        playerId: null,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe from notifications' 
      }));
      return false;
    }
  }, [state.isInitialized]);

  // Send test notification
  const sendTestNotification = useCallback(async (type: 'task' | 'achievement' | 'break' | 'streak') => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    switch (type) {
      case 'task':
        return await oneSignalService.sendTaskReminder(
          userId,
          'Sample Task',
          new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          'test-task-id'
        );
      
      case 'achievement':
        return await oneSignalService.sendAchievementNotification(
          userId,
          'First Notification!',
          'You successfully set up push notifications!'
        );
      
      case 'break':
        return await oneSignalService.sendStudyBreakSuggestion(
          userId,
          "You've been studying for a while. Consider taking a 15-minute break to recharge!"
        );
      
      case 'streak':
        const result = await oneSignalService.sendNotification({
          contents: { en: '🔥 You\'re on a 5-day study streak! Keep it up!' },
          headings: { en: '🔥 Streak Milestone' },
          include_player_ids: state.playerId ? [state.playerId] : undefined,
          data: { type: 'streak', streakCount: 5 },
          url: '/dashboard?tab=streaks',
          android_channel_id: 'streaks',
          priority: 6,
        });
        return !!result;
      
      default:
        return false;
    }
  }, [userId, state.playerId]);

  // Get notification analytics
  const getAnalytics = useCallback(async (days: number = 30) => {
    if (!userId) return [];
    return await oneSignalService.getUserNotificationAnalytics(userId, days);
  }, [userId]);

  // Initialize on mount
  useEffect(() => {
    initializeOneSignal();
  }, [initializeOneSignal]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    getAnalytics,
    reinitialize: initializeOneSignal,
  };
}; 