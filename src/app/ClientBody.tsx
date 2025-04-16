"use client";

import { useEffect, useState } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
  }, []);

  useEffect(() => {
    if (isAuthenticated === null || !isProfileLoaded) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);
    const needsOnboarding = !profile.name;
    const isOnboardingPage = pathname === '/onboarding';

    if (!isAuthenticated && !isPublicPath) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      if (needsOnboarding && !isOnboardingPage && !isPublicPath) {
        router.replace('/onboarding');
      } else if (!needsOnboarding && isOnboardingPage) {
        router.replace('/dashboard');
      }
    }

  }, [isAuthenticated, isProfileLoaded, profile, pathname, router]);

  const shouldRenderChildren = () => {
    if (isAuthenticated === null || (!isProfileLoaded && isAuthenticated)) {
      return false;
    }
    if (!isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
      return true;
    }
    if (isAuthenticated && !profile.name && pathname === '/onboarding') {
      return true;
    }
    if (isAuthenticated && profile.name && !PUBLIC_PATHS.includes(pathname) && pathname !== '/onboarding') {
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
