'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export interface OnboardingStatus {
  isLoading: boolean;
  isCompleted: boolean;
  error?: string;
}

/**
 * Simple hook to check onboarding status using official Clerk-Supabase integration
 * Leverages Clerk's public metadata to determine onboarding completion
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<OnboardingStatus>({
    isLoading: true,
    isCompleted: false,
  });

  useEffect(() => {
    if (!isLoaded) {
      setStatus({ isLoading: true, isCompleted: false });
      return;
    }

    if (!user) {
      setStatus({ 
        isLoading: false, 
        isCompleted: false, 
        error: 'User not authenticated' 
      });
      return;
    }

    try {
      // Check onboarding status from Clerk's public metadata
      const isCompleted = Boolean(user.publicMetadata?.onboardingComplete);
      
      setStatus({
        isLoading: false,
        isCompleted,
      });
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setStatus({
        isLoading: false,
        isCompleted: false,
        error: 'Failed to check onboarding status',
      });
    }
  }, [user, isLoaded]);

  return status;
} 