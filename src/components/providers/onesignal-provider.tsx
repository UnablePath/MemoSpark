'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

// Global OneSignal interface for TypeScript
declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

interface OneSignalContextType {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId?: string;
  error?: string;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const OneSignalContext = createContext<OneSignalContextType | null>(null);

export const useOneSignal = () => {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error('useOneSignal must be used within OneSignalProvider');
  }
  return context;
};

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export const OneSignalProvider: React.FC<OneSignalProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const initOneSignal = async () => {
      if (typeof window === 'undefined') return;
      
      // Wait for OneSignal to be available
      let attempts = 0;
      while (!window.OneSignal && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (window.OneSignal) {
        try {
          // Check OneSignal permission state (not browser state)
          const permission = window.OneSignal.Notifications.permission;
          setIsSubscribed(permission);
          
          // Get player ID if available
          try {
            const id = window.OneSignal.User.PushSubscription.id;
            setPlayerId(id || undefined);
          } catch (e) {
            console.log('No player ID yet');
          }
          
          // Listen for subscription changes
          window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
            console.log('OneSignal subscription changed:', event);
            setIsSubscribed(event.current.optedIn);
            setPlayerId(event.current.id || undefined);
          });
          
          setIsInitialized(true);
          console.log('✅ OneSignal initialized');
        } catch (err) {
          console.error('OneSignal init error:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize');
          setIsInitialized(true);
        }
      } else {
        console.warn('OneSignal not available');
        setError('OneSignal SDK not loaded');
        setIsInitialized(true);
      }
    };

    initOneSignal();
  }, []);

  const subscribe = async (): Promise<boolean> => {
    console.log('🔔 Subscribe clicked');
    
    try {
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // Use OneSignal's proper permission flow as per documentation
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('OneSignal permission result:', permission);
      
      if (permission) {
        setIsSubscribed(true);
        
        // Login with Clerk user ID for better tracking
        if (user?.id) {
          await window.OneSignal.login(user.id);
        }
        
        // Get the player ID
        const id = window.OneSignal.User.PushSubscription.id;
        if (id) {
          setPlayerId(id);
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      await window.OneSignal.User.PushSubscription.optOut();
      setIsSubscribed(false);
      setPlayerId(undefined);
      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    }
  };

  const value: OneSignalContextType = {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    subscribe,
    unsubscribe,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}; 