"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ensureUserProfile } from '@/lib/supabase/tasksApi';

interface UserProfile {
  id: string;
  clerk_user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user's profile with automatic creation
 * This ensures that Clerk users always have a corresponding Supabase profile
 */
export const useUserProfile = (): UseUserProfileReturn => {
  const { isSignedIn, getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!isSignedIn) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // This will create the profile if it doesn't exist
      const profileData = await ensureUserProfile(() => getToken({ template: 'supabase-integration' }));
      
      // Note: ensureUserProfile returns minimal data, you might want to fetch full profile
      // For now, we'll use what we have
      setProfile({
        id: profileData.id,
        clerk_user_id: profileData.clerk_user_id,
        onboarding_completed: false, // Will be updated when full profile is loaded
      });

    } catch (err) {
      console.error('Error ensuring user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [isSignedIn]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
};

/**
 * Hook specifically for checking if user profile exists and is ready
 * This is useful for conditional rendering while profile is being created
 */
export const useUserProfileReady = (): boolean => {
  const { profile, isLoading } = useUserProfile();
  return !isLoading && profile !== null;
}; 