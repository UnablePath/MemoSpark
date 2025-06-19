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
  shouldPromptUser: boolean;
  isSyncing: boolean;
  subscribe: (force?: boolean) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  promptUser: () => Promise<boolean>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  const [shouldPromptUser, setShouldPromptUser] = useState(false);

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
          
          // Check OneSignal permission state
          const permission = window.OneSignal.Notifications.permission;
          const optedIn = window.OneSignal.User.PushSubscription.optedIn;
          console.log('🔍 OneSignal status:', { permission, optedIn });
          setIsSubscribed(permission && optedIn);
          
          // Get player ID if available
          let currentPlayerId: string | undefined;
          try {
            const id = window.OneSignal.User.PushSubscription.id;
            currentPlayerId = id || undefined;
            console.log('🔍 OneSignal player ID detected:', currentPlayerId);
            setPlayerId(currentPlayerId);
          } catch (e) {
            console.log('🔍 Error getting player ID:', e);
          }
          
          // Check if user should be prompted for notifications
          if (user?.id && !permission && !hasShownPrompt) {
            console.log('🔔 User should be prompted for notifications');
            setShouldPromptUser(true);
          }
          
          // Sync current state with database
          if (user?.id) {
            await syncSubscriptionStatus(user.id, currentPlayerId, permission && optedIn);
          }
          
          // Listen for subscription changes
          window.OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
            console.log('🔄 OneSignal subscription changed:', event);
            const newSubscribed = event.current.optedIn && window.OneSignal.Notifications.permission;
            setIsSubscribed(newSubscribed);
            const newPlayerId = event.current.id || undefined;
            setPlayerId(newPlayerId);
            
            // Sync to database when subscription changes
            if (user?.id) {
              await syncSubscriptionStatus(user.id, newPlayerId, newSubscribed);
            }
          });
          
          // Listen for slidedown prompt events
          window.OneSignal.Slidedown.addEventListener('slidedownShown', () => {
            console.log('🔔 Slidedown prompt shown');
            setHasShownPrompt(true);
            setShouldPromptUser(false);
            
            // Track outcome
            window.OneSignal.Session.sendOutcome('notification_prompt_shown');
          });
          
          // Listen for notification clicks to track engagement
          window.OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('🔔 Notification clicked:', event);
            
            // Track click outcome
            window.OneSignal.Session.sendOutcome('notification_clicked');
            
            // Track specific notification type if available
            if (event.notification?.data?.type) {
              window.OneSignal.Session.sendOutcome(`notification_${event.notification.data.type}_clicked`);
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

  // Function to sync OneSignal subscription status with our database
  const syncSubscriptionStatus = async (userId: string, playerId: string | undefined, isActive: boolean) => {
    // Prevent duplicate sync requests
    if (isSyncing) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }
    
    try {
      setIsSyncing(true);
      console.log('🔄 Starting sync request:', { userId, playerId, isActive });
      
      if (isActive && playerId) {
        // User is subscribed - sync to database
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
      } else {
        // User is not subscribed - update database to mark as inactive
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId
          })
        });
        
        const result = await response.json();
        console.log('🔄 Unsubscribe response:', { status: response.status, result });
        
        if (response.ok) {
          console.log('✅ Unsubscription synced to database');
        } else {
          console.error('❌ Failed to sync unsubscription to database:', result);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing subscription status to database:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const subscribe = async (force: boolean = false): Promise<boolean> => {
    console.log('🔔 Subscribe clicked', { force });
    
    try {
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // First, ensure user is logged in to OneSignal
      if (user?.id) {
        await window.OneSignal.login(user.id);
      }

      // Check if user is already opted in but just needs permission
      const currentPermission = window.OneSignal.Notifications.permission;
      const currentOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      
      console.log('🔍 Current state before subscribe:', { currentPermission, currentOptedIn });

      if (currentPermission && !currentOptedIn) {
        // User has permission but is opted out - just opt back in
        console.log('🔄 User has permission but is opted out, opting back in...');
        await window.OneSignal.User.PushSubscription.optIn();
        
        // Wait a moment for the state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const playerId = window.OneSignal.User.PushSubscription.id;
        const optedIn = window.OneSignal.User.PushSubscription.optedIn;
        
        if (playerId && optedIn) {
          setIsSubscribed(true);
          setPlayerId(playerId);
          
          if (user?.id) {
            await syncSubscriptionStatus(user.id, playerId, true);
          }
          
          return true;
        }
      } else if (!currentPermission) {
        // User doesn't have permission - show prompt
        try {
          if (force) {
            console.log('🔔 Forcing slidedown prompt');
            await window.OneSignal.Slidedown.promptPush({ force: true });
          } else {
            await window.OneSignal.Slidedown.promptPush();
          }
          setHasShownPrompt(true);
        } catch (slidedownError) {
          console.log('Slidedown not available, falling back to direct permission request');
          const permission = await window.OneSignal.Notifications.requestPermission();
          if (!permission) {
            return false;
          }
        }
        
        // Wait for the subscription to register
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if subscription was successful
        const permission = window.OneSignal.Notifications.permission;
        const optedIn = window.OneSignal.User.PushSubscription.optedIn;
        const playerId = window.OneSignal.User.PushSubscription.id;
        
        console.log('🔍 OneSignal result after prompt:', { permission, optedIn, playerId });
        
        if (permission && optedIn && playerId) {
          setIsSubscribed(true);
          setPlayerId(playerId);
          
          if (user?.id) {
            await syncSubscriptionStatus(user.id, playerId, true);
          }
          
          return true;
        }
      } else {
        // User is already fully subscribed
        console.log('✅ User is already subscribed');
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
    console.log('🔕 Unsubscribe clicked');
    
    try {
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // Check current state
      const currentPermission = window.OneSignal.Notifications.permission;
      const currentOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      const currentPlayerId = window.OneSignal.User.PushSubscription.id;
      
      console.log('🔍 Current state before unsubscribe:', { currentPermission, currentOptedIn, currentPlayerId });

      if (currentPermission && currentOptedIn) {
        // User is subscribed - opt them out
        await window.OneSignal.User.PushSubscription.optOut();
        
        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newOptedIn = window.OneSignal.User.PushSubscription.optedIn;
        console.log('🔍 State after opt out:', { newOptedIn });
        
        setIsSubscribed(false);
        
        // Sync unsubscription to database
        if (user?.id) {
          await syncSubscriptionStatus(user.id, currentPlayerId, false);
        }
        
        return true;
      } else {
        // User is already unsubscribed
        console.log('✅ User is already unsubscribed');
        setIsSubscribed(false);
        
        // Still sync to ensure database is correct
        if (user?.id) {
          await syncSubscriptionStatus(user.id, currentPlayerId, false);
        }
        
        return true;
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    }
  };

  // Function to prompt user for notifications (can be called from anywhere)
  const promptUser = async (): Promise<boolean> => {
    console.log('🔔 Prompting user for notifications');
    return await subscribe(true);
  };

  const value: OneSignalContextType = {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    shouldPromptUser,
    isSyncing,
    subscribe,
    unsubscribe,
    promptUser,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}; 