"use client";

import { useEffect } from 'react';
import { useUser } from '@/lib/user-context';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from "@/components/ui/sonner";

interface ClientBodyProps {
  children: React.ReactNode;
}

export default function ClientBody({ children }: ClientBodyProps) {
  const { profile, isProfileLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isProfileLoaded) {
      return; // Wait until the profile is loaded
    }

    const needsOnboarding = !profile.name;
    const isOnboardingPage = pathname === '/onboarding';

    // TODO: Add authentication check here later
    // const isAuthenticated = checkAuthStatus(); // Placeholder
    // if (!isAuthenticated && pathname !== '/login') {
    //   router.replace('/login');
    //   return;
    // }

    if (needsOnboarding && !isOnboardingPage) {
      // If profile name is missing and we are NOT on the onboarding page, redirect there
      router.replace('/onboarding');
    } else if (!needsOnboarding && isOnboardingPage) {
      // If profile name EXISTS and we ARE on the onboarding page, redirect away
      router.replace('/dashboard');
    }
    // Otherwise, stay on the current page (e.g., dashboard, settings, etc.)

  }, [isProfileLoaded, profile, pathname, router]);

  // Render children only if profile is loaded and onboarding status is resolved,
  // or if on the onboarding page itself while needing onboarding.
  const shouldRenderChildren = isProfileLoaded && (!profile.name || pathname !== '/onboarding');

  return (
    <>
      {/* Render children based on loading/onboarding state */}
      {shouldRenderChildren ? children : (
          <div className="flex items-center justify-center h-screen bg-background">
              <p>Loading...</p> { /* Or a dedicated loading component */ }
          </div>
      )}
      <Toaster /> { /* Keep toaster accessible */}
    </>
  );
}
