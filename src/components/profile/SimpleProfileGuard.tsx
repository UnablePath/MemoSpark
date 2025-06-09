'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface SimpleProfileGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Simple profile guard that ensures users have completed onboarding
 * Uses the official Clerk-Supabase integration for authentication state
 */
export function SimpleProfileGuard({ 
  children, 
  fallback = <ProfileGuardFallback />,
  redirectTo = '/clerk-onboarding'
}: SimpleProfileGuardProps) {
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoading, isCompleted, error } = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    // Wait for both user and onboarding status to load
    if (!userLoaded || isLoading) return;

    // If no user, let middleware handle authentication redirect
    if (!user) return;

    // If onboarding not completed, redirect to onboarding
    if (!isCompleted && !error) {
      router.push(redirectTo);
    }
  }, [user, userLoaded, isLoading, isCompleted, error, redirectTo, router]);

  // Show loading state while checking status
  if (!userLoaded || isLoading) {
    return fallback;
  }

  // If there's an error or user not found, show fallback
  if (error || !user) {
    return fallback;
  }

  // If onboarding not completed, show fallback (redirect is handled by useEffect)
  if (!isCompleted) {
    return fallback;
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * Default fallback component shown while checking profile status
 */
function ProfileGuardFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Checking profile status...</p>
      </div>
    </div>
  );
} 