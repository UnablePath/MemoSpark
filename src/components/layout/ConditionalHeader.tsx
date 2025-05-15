'use client'; // Mark as a Client Component

import { usePathname } from "next/navigation";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { StudySparkLogoSvg } from '@/components/ui/StudySparkLogoSvg';
import Link from 'next/link';
// Link component might not be needed here if UserButton.UserProfileLink handles navigation

export function ConditionalHeader() {
  const pathname = usePathname();

  // Do not render on homepage OR dashboard page
  if (pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  return (
    <header 
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-2 md:px-6 h-14"
      // Reduced height to h-14 (56px) and py to py-2 (8px vertical padding)
    >
      <div className="flex items-center gap-3">
        <Link href={pathname === '/dashboard' ? "/dashboard" : "/"} aria-label="StudySpark Home" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
          <StudySparkLogoSvg height={28} /> {/* Slightly reduced logo height to fit new header height */}
        </Link>
        {/* "Tasks & Events" title removed as per new request */}
      </div>
      
      <SignedIn>
        <UserButton afterSignOutUrl="/">
          {/* Check Clerk docs for the exact prop name if /user-profile is the default manage account page */}
          {/* UserButton.UserProfilePage might be for overriding the entire page, 
             UserButton.User членыПрофиляLink is for adding links. 
             Clerk's default "Manage Account" might already be there or accessible via UserProfilePage if not customized deeply.
          */}
          <UserButton.UserProfileLink label="My Profile & Progress" url="/profile" labelIcon={<UserIcon className="h-4 w-4" />} />
          <UserButton.UserProfileLink label="Settings" url="/settings" labelIcon={<SettingsIcon className="h-4 w-4" />} />
          {/* Clerk typically adds a "Manage account" and "Sign out" by default. 
              If you use UserProfilePage, it might replace these. 
              If you only add UserProfileLinks, they are added to the existing menu. 
          */}
        </UserButton>
      </SignedIn>
      {/* 
      <SignedOut>
        This part is generally not needed if all routes except '/' are protected 
        and redirect to sign-in, as middleware would handle it.
      </SignedOut>
      */}
    </header>
  );
} 