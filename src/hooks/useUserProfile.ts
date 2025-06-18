"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface UserProfile {
  id: string;
  clerk_user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
  year_of_study?: string;
  subjects?: string[];
  interests?: string[];
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

/**
 * Hook to get the current user's profile from Supabase via API endpoints
 * Uses server-side API to bypass RLS authentication issues
 */
export const useUserProfile = (): UseUserProfileReturn => {
  const { userId, isLoaded: authLoaded } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (): Promise<void> => {
    if (!authLoaded || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      if (data.success && data.profile) {
        setProfile(data.profile);
      } else {
        // If no profile exists, try to trigger profile creation via sync
        try {
          const syncResponse = await fetch('/api/sync-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (syncResponse.ok) {
            // Try fetching again after sync
            const retryResponse = await fetch('/api/profile', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const retryData = await retryResponse.json();
            if (retryResponse.ok && retryData.success && retryData.profile) {
              setProfile(retryData.profile);
            } else {
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        } catch (syncError) {
          console.error('Error during profile sync:', syncError);
          setProfile(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!authLoaded || !userId) {
      return false;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.success && data.profile) {
        setProfile(data.profile);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [authLoaded, userId]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
  };
};

/**
 * Hook specifically for checking if user profile exists and is ready
 */
export const useUserProfileReady = (): boolean => {
  const { profile, isLoading } = useUserProfile();
  return !isLoading && profile !== null;
}; 