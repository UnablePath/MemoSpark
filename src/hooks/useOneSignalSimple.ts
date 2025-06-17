import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface OneSignalState {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  isPushSupported: boolean;
  error: string | null;
}

// Simple global OneSignal interface
declare global {
  interface Window {
    OneSignal?: any;
  }
}

export const useOneSignalSimple = () => {
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

      // Wait for OneSignal to be available (loaded via script tag in layout)
      let attempts = 0;
      while (!window.OneSignal && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.OneSignal) {
        throw new Error('OneSignal SDK not loaded');
      }

      // Initialize OneSignal with simple config (no service worker for now)
      await window.OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: {
          scope: '/onesignal-sw/',
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
      });

      // Check current subscription status
      const isSubscribed = await window.OneSignal.Notifications.permission === 'granted';
      
      let playerId = null;
      if (isSubscribed) {
        try {
          playerId = await window.OneSignal.User.PushSubscription.id;
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

    } catch (error) {
      console.error('Error initializing OneSignal:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize notifications',
        isInitialized: true,
      }));
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized || !window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Request permission
      await window.OneSignal.Slidedown.promptPush();
      
      // Check if permission was granted
      const permission = await window.OneSignal.Notifications.permission;
      const isSubscribed = permission === 'granted';
      
      if (isSubscribed) {
        let playerId = null;
        try {
          playerId = await window.OneSignal.User.PushSubscription.id;
        } catch (e) {
          console.warn('Could not get player ID after subscription:', e);
        }
        
        setState(prev => ({
          ...prev,
          isSubscribed: true,
          playerId,
          error: null,
        }));

        return true;
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
  }, [state.isInitialized]);

  // Send test notification
  const sendTestNotification = useCallback(async (type: 'task' | 'achievement' | 'break' | 'streak') => {
    if (!userId || !state.playerId) {
      throw new Error('User not authenticated or not subscribed');
    }

    // Simple test notification
    const messages = {
      task: { title: '📋 Task Reminder', body: 'Don\'t forget about your upcoming task!' },
      achievement: { title: '🏆 Achievement Unlocked!', body: 'You successfully set up notifications!' },
      break: { title: '☕ Take a Break', body: 'You\'ve been studying hard. Time for a 15-minute break!' },
      streak: { title: '🔥 Streak Milestone', body: 'You\'re on a 5-day study streak! Keep it up!' },
    };

    const message = messages[type];
    
    // Use OneSignal's simple notification API
    try {
      await window.OneSignal.User.PushSubscription.optIn();
      
      // For testing, we'll just show a browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message.title, {
          body: message.body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }, [userId, state.playerId]);

  // Initialize on mount
  useEffect(() => {
    initializeOneSignal();
  }, [initializeOneSignal]);

  return {
    ...state,
    subscribe,
    sendTestNotification,
    reinitialize: initializeOneSignal,
  };
}; 