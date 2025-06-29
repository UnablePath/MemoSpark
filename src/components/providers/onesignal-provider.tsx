'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';

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
  isOperating: boolean;
  
  // iOS-specific features
  isIOS: boolean;
  iosPermissionStatus?: string;
  iosIssues: string[];
  iosSuggestions: string[];
  
  subscribe: (force?: boolean) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  promptUser: () => Promise<boolean>;
  
  // iOS-specific methods
  checkIOSPermissions: () => Promise<void>;
  testIOSDelivery: () => Promise<boolean>;
  debugIOSConfiguration: () => Promise<Record<string, any>>;
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
  const { triggerAchievement } = useDebouncedAchievementTrigger();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  const [shouldPromptUser, setShouldPromptUser] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [lastOperationTime, setLastOperationTime] = useState(0);
  
  // iOS-specific state
  const [isIOS, setIsIOS] = useState(false);
  const [iosPermissionStatus, setIOSPermissionStatus] = useState<string | undefined>();
  const [iosIssues, setIOSIssues] = useState<string[]>([]);
  const [iosSuggestions, setIOSSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const initOneSignal = async () => {
      if (typeof window === 'undefined') return;
      
      // Detect iOS
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);
      
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
          
          // iOS-specific initialization
          if (isIOSDevice) {
            await checkIOSPermissions();
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
            
            // Update iOS status if on iOS
            if (isIOSDevice) {
              await checkIOSPermissions();
            }
            
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
    console.log('🔔 Subscribe called', { force, isOperating });
    
    // Debouncing - prevent multiple operations within 3 seconds
    const now = Date.now();
    if (now - lastOperationTime < 3000) {
      console.log('🔔 Operation debounced, too soon since last operation');
      return false;
    }
    setLastOperationTime(now);

    // Prevent multiple simultaneous operations
    if (isOperating) {
      console.log('🔔 Already processing operation, skipping...');
      return false;
    }
    
    try {
      setIsOperating(true);
      
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // First, ensure user is logged in to OneSignal
      if (user?.id) {
        console.log('🔐 Logging user into OneSignal:', user.id);
        await window.OneSignal.login(user.id);
      }
      
      // Check current subscription status before proceeding
      const currentOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      if (currentOptedIn) {
        console.log('🔔 User is already subscribed');
        return true;
      }
      
      console.log('🔔 Showing slidedown prompt with force:', force);
      
      // Use the slidedown prompt. OneSignal handles the logic of whether to show it.
      // The `force` parameter overrides the "cool down" period if the user previously dismissed it.
      // This is ideal when the action is initiated by a user click.
      await window.OneSignal.Slidedown.promptPush({ force });
      
      // Wait longer for user interaction and SDK to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check the final status
      const newOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      const newPlayerId = window.OneSignal.User.PushSubscription.id;

      console.log('🔔 Subscribe result:', { newOptedIn, newPlayerId });

      if (newOptedIn) {
        console.log('✅ Successfully subscribed to notifications');
        triggerAchievement('notifications_enabled');
        
        // Force state update in case the listener didn't fire
        setIsSubscribed(true);
        setPlayerId(newPlayerId || undefined);
        
        // Ensure database sync
        if (user?.id) {
          await syncSubscriptionStatus(user.id, newPlayerId, true);
        }
      } else {
        console.log('❌ User declined or subscription failed');
      }

      return !!newOptedIn;
    } catch (err) {
      console.error('❌ Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    } finally {
      setIsOperating(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    console.log('🔕 Unsubscribe called', { isOperating });
    
    // Debouncing - prevent multiple operations within 3 seconds
    const now = Date.now();
    if (now - lastOperationTime < 3000) {
      console.log('🔕 Operation debounced, too soon since last operation');
      return false;
    }
    setLastOperationTime(now);

    // Prevent multiple simultaneous operations
    if (isOperating) {
      console.log('🔕 Already processing operation, skipping...');
      return false;
    }
    
    try {
      setIsOperating(true);
      
      if (!window.OneSignal) {
        setError('OneSignal not available');
        return false;
      }

      // Check if already unsubscribed
      const currentOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      if (!currentOptedIn) {
        console.log('🔕 User is already unsubscribed');
        return true;
      }

      console.log('🔕 Opting out of push notifications...');
      
      // The SDK handles the case where the user is already opted out.
      await window.OneSignal.User.PushSubscription.optOut();
      
      // Wait for the change to take effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify the change
      const newOptedIn = window.OneSignal.User.PushSubscription.optedIn;
      console.log('🔕 Unsubscribe result:', { newOptedIn });
      
      if (!newOptedIn) {
        console.log('✅ Successfully unsubscribed from notifications');
        
        // Force state update in case the listener didn't fire
        setIsSubscribed(false);
        setPlayerId(undefined);
        
        // Ensure database sync
        if (user?.id) {
          await syncSubscriptionStatus(user.id, undefined, false);
        }
      }
      
      // The event listener will handle the state change and DB sync.
      console.log('✅ Unsubscribe command completed.');
      return !newOptedIn;
      
    } catch (err) {
      console.error('❌ Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setIsOperating(false);
    }
  };

  // iOS-specific methods
  const checkIOSPermissions = async (): Promise<void> => {
    try {
      if (!isIOS) {
        setIOSIssues(['Not running on iOS device']);
        return;
      }

      const issues: string[] = [];
      const suggestions: string[] = [];

      // Check Safari version
      const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
      const safariVersion = safariMatch ? parseFloat(safariMatch[1]) : 0;
      
      if (safariVersion < 11.3) {
        issues.push(`Safari ${safariVersion} detected. iOS 11.3+ required for PWA notifications`);
        suggestions.push('Update iOS to version 11.3 or later');
      }

      // Check if app is installed as PWA
      const isIOSPWA = window.navigator.standalone;
      if (!isIOSPWA) {
        issues.push('App not installed as PWA');
        suggestions.push('Install app to Home Screen for notification support');
        suggestions.push('Use Safari Share button → "Add to Home Screen"');
      }

      // Check OneSignal permission status
      if (window.OneSignal) {
        const permission = window.OneSignal.Notifications.permission;
        setIOSPermissionStatus(permission ? 'granted' : 'default');
        
        if (!permission) {
          suggestions.push('Tap "Allow" when prompted for notifications');
        }
      } else {
        issues.push('OneSignal not loaded');
        setIOSPermissionStatus('unknown');
      }

      // Check for notification API support
      if (!('Notification' in window)) {
        issues.push('Notification API not supported');
      }

      setIOSIssues(issues);
      setIOSSuggestions(suggestions);
    } catch (error) {
      console.error('Error checking iOS permissions:', error);
      setIOSIssues(['Error checking permissions']);
    }
  };

  const testIOSDelivery = async (): Promise<boolean> => {
    try {
      if (!isIOS || !playerId) {
        console.log('Cannot test iOS delivery: not iOS or no player ID');
        return false;
      }

      // Use the OneSignal service for iOS testing
      const { OneSignalService } = await import('@/lib/notifications/OneSignalService');
      const oneSignalService = OneSignalService.getInstance();
      
      const result = await oneSignalService.testiOSNotificationDelivery(playerId);
      return result.success;
    } catch (error) {
      console.error('Error testing iOS delivery:', error);
      return false;
    }
  };

  const debugIOSConfiguration = async (): Promise<Record<string, any>> => {
    const debug: Record<string, any> = {
      isIOS,
      isIOSPWA: window.navigator.standalone,
      safariVersion: 'unknown',
      notificationAPISupported: 'Notification' in window,
      oneSignalLoaded: !!window.OneSignal,
      permission: iosPermissionStatus || 'unknown',
      playerId: playerId || 'none',
      issues: iosIssues,
      suggestions: iosSuggestions,
      timestamp: new Date().toISOString()
    };

    // Get Safari version
    const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
    if (safariMatch) {
      debug.safariVersion = safariMatch[1];
    }

    // Get OneSignal details if available
    if (window.OneSignal) {
      try {
        debug.oneSignalDetails = {
          permission: window.OneSignal.Notifications.permission,
          optedIn: window.OneSignal.User.PushSubscription.optedIn,
          playerId: window.OneSignal.User.PushSubscription.id
        };
      } catch (e) {
        debug.oneSignalError = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    return debug;
  };

  // Function to prompt user for notifications (can be called from anywhere)
  const promptUser = async (): Promise<boolean> => {
    console.log('🔔 Actively prompting user for notifications');
    // We call subscribe with `force: true` because this function is meant
    // to be called by an explicit user action, like clicking a button.
    return await subscribe(true);
  };

  const value: OneSignalContextType = {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    shouldPromptUser,
    isSyncing,
    isOperating,
    
    // iOS-specific properties
    isIOS,
    iosPermissionStatus,
    iosIssues,
    iosSuggestions,
    
    subscribe,
    unsubscribe,
    promptUser,
    
    // iOS-specific methods
    checkIOSPermissions,
    testIOSDelivery,
    debugIOSConfiguration,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}; 