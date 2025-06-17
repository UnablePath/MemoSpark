import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface OneSignalState {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  isPushSupported: boolean;
  error: string | null;
}

export const useOneSignalBasic = () => {
  const { userId } = useAuth();
  const [state, setState] = useState<OneSignalState>({
    isInitialized: false,
    isSubscribed: false,
    playerId: null,
    isPushSupported: false,
    error: null,
  });

  // Initialize basic notification support
  const initializeBasic = useCallback(async () => {
    try {
      if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
        throw new Error('OneSignal App ID not configured');
      }

      // Check if basic notifications are supported
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setState(prev => ({ 
          ...prev, 
          isPushSupported: false, 
          error: 'Notifications not supported',
          isInitialized: true,
        }));
        return;
      }

      // For now, just check basic notification permission
      const permission = Notification.permission;
      const isSubscribed = permission === 'granted';

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSubscribed,
        playerId: isSubscribed ? 'basic-test-id' : null,
        isPushSupported: true,
        error: null,
      }));

      console.log('Basic notification system initialized');

    } catch (error) {
      console.error('Error initializing basic notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize notifications',
        isInitialized: true,
      }));
    }
  }, []);

  // Subscribe to basic notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized) {
        throw new Error('Not initialized');
      }

      // Request basic notification permission
      const permission = await Notification.requestPermission();
      const isSubscribed = permission === 'granted';
      
      setState(prev => ({
        ...prev,
        isSubscribed,
        playerId: isSubscribed ? 'basic-test-id' : null,
        error: null,
      }));

      return isSubscribed;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to notifications' 
      }));
      return false;
    }
  }, [state.isInitialized]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        playerId: null,
        error: null,
      }));

      console.log('Unsubscribed from basic notifications');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      }));
      return false;
    }
  }, []);

  // Get basic analytics
  const getAnalytics = useCallback(async () => {
    return {
      isSubscribed: state.isSubscribed,
      playerId: state.playerId,
      isPushSupported: state.isPushSupported,
      permission: typeof window !== 'undefined' && 'Notification' in window 
        ? Notification.permission 
        : 'unsupported',
      timestamp: new Date().toISOString(),
    };
  }, [state]);

  // Send test notification using basic browser API
  const sendTestNotification = useCallback(async (type: 'task' | 'achievement' | 'break' | 'streak') => {
    if (!state.isSubscribed) {
      throw new Error('Not subscribed to notifications');
    }

    // Simple test notification messages
    const messages = {
      task: { title: '📋 Task Reminder', body: 'Don\'t forget about your upcoming task!' },
      achievement: { title: '🏆 Achievement Unlocked!', body: 'You successfully set up notifications!' },
      break: { title: '☕ Take a Break', body: 'You\'ve been studying hard. Time for a 15-minute break!' },
      streak: { title: '🔥 Streak Milestone', body: 'You\'re on a 5-day study streak! Keep it up!' },
    };

    const message = messages[type];
    
    try {
      // Use basic browser notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(message.title, {
          body: message.body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `test-${type}`,
          requireInteraction: false,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        console.log(`Sent ${type} notification:`, message);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }, [state.isSubscribed]);

  // Initialize on mount
  useEffect(() => {
    initializeBasic();
  }, [initializeBasic]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    getAnalytics,
    reinitialize: initializeBasic,
  };
}; 