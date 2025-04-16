"use client";

import { useEffect } from 'react';
import { useUser } from '@/lib/user-context';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from "@/components/ui/sonner";

interface ClientBodyProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/signup'];

export default function ClientBody({ children }: ClientBodyProps) {
  const { profile, isProfileLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isProfileLoaded) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);
    const needsOnboarding = !profile.name;
    const isOnboardingPage = pathname === '/onboarding';

    if (!isPublicPath) {
      if (needsOnboarding && !isOnboardingPage) {
        router.replace('/onboarding');
      } else if (!needsOnboarding && isOnboardingPage) {
        router.replace('/dashboard');
      }
    }

  }, [isProfileLoaded, profile, pathname, router]);

  const shouldRenderChildren = () => {
    if (!isProfileLoaded && !PUBLIC_PATHS.includes(pathname)) {
      return false;
    }
    if (PUBLIC_PATHS.includes(pathname)) {
      return true;
    }
    if (!profile.name && pathname === '/onboarding') {
      return true;
    }
    if (profile.name && pathname !== '/onboarding') {
      return true;
    }
    return false;
  };

  return (
    <>
      {shouldRenderChildren() ? children : (
          <div className="flex items-center justify-center h-screen bg-background">
              <p>Loading...</p>
          </div>
      )}
      <Toaster />
    </>
  );
}
