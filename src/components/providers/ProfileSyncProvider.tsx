'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAutoStreak } from '@/hooks/useAutoStreak';

// This component ensures that a user's profile is synced with the backend
// whenever they are authenticated. It should be placed in a layout component
// that wraps all authenticated routes.
export function ProfileSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  
  // Enable automatic daily streak check-ins for all authenticated users
  useAutoStreak(isSignedIn && isLoaded);

  useEffect(() => {
    // Flag to prevent multiple syncs
    let isSyncing = false;

    const syncProfile = async () => {
      if (isSyncing) return;
      isSyncing = true;
      
      try {
        await fetch('/api/sync-profile', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to sync profile:', error);
      } finally {
        isSyncing = false;
      }
    };

    if (isLoaded && isSignedIn) {
      // Check if a sync has already been performed in this session
      const hasSynced = sessionStorage.getItem('profile_synced');
      if (!hasSynced) {
        syncProfile();
        sessionStorage.setItem('profile_synced', 'true');
      }
    }
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
} 