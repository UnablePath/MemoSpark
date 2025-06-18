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
          // Set up OneSignal with user authentication if user is logged in
          if (user?.id) {
            console.log('🔐 Setting up OneSignal with user:', user.id);
            await window.OneSignal.login(user.id);
          }
          
          // Check OneSignal permission state (not browser state)
          const permission = window.OneSignal.Notifications.permission;
          console.log('🔍 OneSignal permission detected:', permission);
          setIsSubscribed(permission);
          
          // Get player ID if available
          let currentPlayerId: string | undefined;
          try {
            const id = window.OneSignal.User.PushSubscription.id;
            currentPlayerId = id || undefined;
            console.log('🔍 OneSignal player ID detected:', currentPlayerId);
            setPlayerId(currentPlayerId);
            
            // Sync with database if we have both user and player ID
            if (user?.id && currentPlayerId && permission) {
              console.log('🔄 Syncing subscription to database...');
              await syncSubscriptionToDatabase(user.id, currentPlayerId);
            } else {
              console.log('🔍 Sync conditions not met:', {
                userId: user?.id,
                playerId: currentPlayerId,
                permission
              });
            }
          } catch (e) {
            console.log('🔍 Error getting player ID:', e);
          }
          
          // Listen for subscription changes
          window.OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
            console.log('OneSignal subscription changed:', event);
            setIsSubscribed(event.current.optedIn);
            const newPlayerId = event.current.id || undefined;
            setPlayerId(newPlayerId);
            
            // Sync to database when subscription changes
            if (user?.id && newPlayerId && event.current.optedIn) {
              console.log('🔄 Syncing subscription change to database...');
              await syncSubscriptionToDatabase(user.id, newPlayerId);
            }
          });
          
          setIsInitialized(true);
          console.log('✅ OneSignal initialized with user:', user?.id);
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
  }, [user?.id]); // Re-run when user changes

  // Function to sync OneSignal subscription with our database
  const syncSubscriptionToDatabase = async (userId: string, playerId: string) => {
    try {
      console.log('🔄 Starting sync request:', { userId, playerId });
      
      const response = await fetch('/api/notifications/sync-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          playerId,
          deviceType: 'web'
        })
      });
      
      const result = await response.json();
      console.log('🔄 Sync response:', { status: response.status, result });
      
      if (response.ok) {
        console.log('✅ Subscription synced to database');
      } else {
        console.error('❌ Failed to sync subscription to database:', result);
      }
    } catch (error) {
      console.error('❌ Error syncing subscription to database:', error);
    }
  };

  const subscribe = async (): Promise<boolean> => {
    console.log('🔔 Subscribe clicked');
    
    try {
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // First, ensure user is logged in to OneSignal
      if (user?.id) {
        await window.OneSignal.login(user.id);
      }

      // Use OneSignal's slidedown prompt for better UX (as per documentation)
      try {
        await window.OneSignal.Slidedown.promptPush();
      } catch (slidedownError) {
        console.log('Slidedown not available, falling back to direct permission request');
        // Fallback to direct permission request
        const permission = await window.OneSignal.Notifications.requestPermission();
        if (!permission) {
          return false;
        }
      }
      
      // Wait a moment for the subscription to register
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if subscription was successful
      const permission = window.OneSignal.Notifications.permission;
      const playerId = window.OneSignal.User.PushSubscription.id;
      
      console.log('OneSignal permission result:', permission, 'Player ID:', playerId);
      
      if (permission && playerId) {
        setIsSubscribed(true);
        setPlayerId(playerId);
        
        // Sync with database
        if (user?.id) {
          console.log('🔄 Syncing new subscription to database...');
          await syncSubscriptionToDatabase(user.id, playerId);
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