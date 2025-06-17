import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface OneSignalState {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  isPushSupported: boolean;
  error: string | null;
  permission: NotificationPermission;
}

// Global OneSignal interface
declare global {
  interface Window {
    OneSignal?: any;
  }
}

export const useOneSignalProduction = () => {
  const { userId } = useAuth();
  const [state, setState] = useState<OneSignalState>({
    isInitialized: false,
    isSubscribed: false,
    playerId: null,
    isPushSupported: false,
    error: null,
    permission: 'default',
  });

  // Initialize OneSignal with proper service worker
  const initializeOneSignal = useCallback(async () => {
    try {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
        throw new Error('OneSignal App ID not configured');
      }

      // Check browser support
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState(prev => ({ 
          ...prev, 
          isPushSupported: false, 
          error: 'Push notifications not supported',
          isInitialized: true,
        }));
        return;
      }

      // Load OneSignal SDK dynamically to avoid conflicts
      if (!window.OneSignal) {
        await loadOneSignalSDK();
      }

      // Initialize OneSignal with proper configuration
      await window.OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: {
          scope: '/onesignal-sw/',
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        notificationClickHandlerMatch: 'origin',
        notificationClickHandlerAction: 'navigate',
      });

      // Get current state
      const permission = await window.OneSignal.Notifications.permission;
      const isSubscribed = permission === 'granted';
      let playerId = null;

      if (isSubscribed) {
        try {
          playerId = await window.OneSignal.User.PushSubscription.id;
        } catch (e) {
          console.warn('Could not get OneSignal player ID:', e);
        }
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSubscribed,
        playerId,
        isPushSupported: true,
        permission,
        error: null,
      }));

      console.log('OneSignal initialized successfully');

    } catch (error) {
      console.error('Error initializing OneSignal:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize OneSignal',
        isInitialized: true,
      }));
    }
  }, []);

  // Load OneSignal SDK dynamically
  const loadOneSignalSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.OneSignal) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait for OneSignal to be available
        const checkOneSignal = () => {
          if (window.OneSignal) {
            resolve();
          } else {
            setTimeout(checkOneSignal, 100);
          }
        };
        checkOneSignal();
      };
      
      script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
      
      document.head.appendChild(script);
    });
  }, []);

  // Subscribe to notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized || !window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Request permission and subscribe
      const permission = await window.OneSignal.Notifications.requestPermission();
      
      if (permission) {
        // Get the player ID
        const playerId = await window.OneSignal.User.PushSubscription.id;
        
        // Store subscription on server
        const { subscribeUser } = await import('@/app/actions');
        const result = await subscribeUser(playerId, navigator.userAgent);
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            isSubscribed: true,
            playerId,
            permission: 'granted',
            error: null,
          }));
          
          // Set external user ID for targeting
          if (userId) {
            await window.OneSignal.login(userId);
          }
          
          return true;
        } else {
          throw new Error(result.error || 'Failed to store subscription');
        }
      } else {
        setState(prev => ({
          ...prev,
          permission: 'denied',
          error: 'Notification permission denied',
        }));
        return false;
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to notifications' 
      }));
      return false;
    }
  }, [state.isInitialized, userId]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized || !window.OneSignal || !state.playerId) {
        throw new Error('Not subscribed or OneSignal not initialized');
      }

      // Unsubscribe from OneSignal
      await window.OneSignal.User.PushSubscription.optOut();
      
      // Remove subscription from server
      const { unsubscribeUser } = await import('@/app/actions');
      const result = await unsubscribeUser(state.playerId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          playerId: null,
          error: null,
        }));
        return true;
      } else {
        throw new Error(result.error || 'Failed to remove subscription');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      }));
      return false;
    }
  }, [state.isInitialized, state.playerId]);

  // Send test notification
  const sendTestNotification = useCallback(async (type: 'task' | 'achievement' | 'break' | 'streak'): Promise<boolean> => {
    if (!state.isSubscribed) {
      throw new Error('Not subscribed to notifications');
    }

    try {
      const actions = await import('@/app/actions');
      let result;
      
      switch (type) {
        case 'task':
          result = await actions.sendTaskReminder('test-task-id', 'Complete your study session', new Date(Date.now() + 30 * 60 * 1000).toISOString());
          break;
        case 'achievement':
          result = await actions.sendAchievementNotification('Setup Complete!', 'You successfully configured background notifications!');
          break;
        case 'break':
          result = await actions.sendBreakSuggestion();
          break;
        case 'streak':
          result = await actions.sendNotification('🔥 Streak Milestone', 'You\'re on a 5-day study streak! Keep it up!', { type: 'streak' });
          break;
      }

      return result?.success || false;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }, [state.isSubscribed]);

  // Get analytics
  const getAnalytics = useCallback(async () => {
    try {
      const { getUserNotificationAnalytics } = await import('@/app/actions');
      const result = await getUserNotificationAnalytics(7);
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }, []);

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