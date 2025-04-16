"use client";

import { useEffect } from 'react';
import { useUser } from '@/lib/user-context';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from "@/components/ui/sonner";

interface ClientBodyProps {
  children: React.ReactNode;
}

// Paths that don't require profile/onboarding checks for initial access
const ALLOWED_INITIAL_PATHS = ['/', '/login', '/signup'];

export default function ClientBody({ children }: ClientBodyProps) {
  const { profile, isProfileLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isProfileLoaded) {
      return; // Wait until the profile is loaded
    }

    const isAllowedInitialPath = ALLOWED_INITIAL_PATHS.includes(pathname);
    const needsOnboarding = !profile.name;
    const isOnboardingPage = pathname === '/onboarding';

    // --- Redirection Logic --- 
    // Only perform redirection checks if we are NOT on one of the initially allowed paths
    if (!isAllowedInitialPath) {
        if (needsOnboarding && !isOnboardingPage) {
            // If profile missing and NOT on onboarding -> redirect to onboarding
            router.replace('/onboarding');
        } else if (!needsOnboarding && isOnboardingPage) {
            // If profile exists and ON onboarding -> redirect to dashboard
            router.replace('/dashboard');
        }
        // If profile exists and not on onboarding page, stay put (e.g., on /dashboard, /settings)
    }
    // If on an allowed initial path (/ , /login, /signup), do no automatic redirection here.

  }, [isProfileLoaded, profile, pathname, router]);

  // Determine if children should be rendered
  const shouldRenderChildren = () => {
      if (ALLOWED_INITIAL_PATHS.includes(pathname)) {
          // Always render home, login, signup immediately
          return true;
      }
      if (!isProfileLoaded) {
          // If not on an initial path and profile isn't loaded, show loading
          return false;
      }
      // From here, profile IS loaded and we are NOT on home/login/signup
      if (!profile.name && pathname === '/onboarding') {
          // Needs onboarding and is on the correct page
          return true;
      }
       if (profile.name && pathname !== '/onboarding'){
           // Has profile and is not trying to access onboarding (e.g., dashboard, settings)
           return true;
       }
      // Otherwise, show loading (covers redirect state or unexpected path/profile combos)
      return false;
  };

  return (
    <>
      {shouldRenderChildren() ? children : (
          <div className="flex items-center justify-center h-screen bg-background">
              <p>Loading...</p> { /* Consider a more visually appealing loader */}
          </div>
      )}
      <Toaster />
    </>
  );
}
