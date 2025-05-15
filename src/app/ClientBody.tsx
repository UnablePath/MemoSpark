"use client";

// import { useEffect } from 'react';
// import { useUser } from '@/lib/user-context'; // Old context, to be removed or replaced if necessary
import { usePathname } from 'next/navigation'; // useRouter might not be needed anymore here
import { Toaster } from "@/components/ui/sonner";
// If we need to check Clerk's auth status for loading, import useUser from Clerk
// import { useUser as useClerkUser } from '@clerk/nextjs'; 

interface ClientBodyProps {
  children: React.ReactNode;
}

// const ALLOWED_INITIAL_PATHS = ['/', '/login', '/signup']; // This might be handled by middleware or Clerk components

export default function ClientBody({ children }: ClientBodyProps) {
  // const { profile, isProfileLoaded } = useUser(); // From old context
  // const router = useRouter();
  // const pathname = usePathname();
  // const { isLoaded: isClerkLoaded } = useClerkUser(); // Example if using Clerk's loading state

  /*
  useEffect(() => {
    // All redirection logic related to custom onboarding / profile.name is removed.
    // Middleware now handles redirection to /clerk-onboarding based on Clerk's metadata.
  }, [isProfileLoaded, profile, pathname, router]);
  */

  // Simplified rendering logic. 
  // The middleware and Clerk components should manage access and loading states for routes.
  // If a global loading spinner is desired before Clerk loads, it can be added here based on useClerkUser().isLoaded
  /*
  if (!isClerkLoaded && !ALLOWED_INITIAL_PATHS.includes(pathname)) { // Example condition
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p>Loading...</p>
      </div>
    );
  }
  */

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
