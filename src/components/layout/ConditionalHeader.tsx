'use client'; // Mark as a Client Component

import { usePathname, useSearchParams } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import Link from 'next/link';
import { UserAccountHubPanel } from '@/components/clerk/UserAccountHubPanels';

export function ConditionalHeader() {
  const pathname = usePathname();

  // Do not render on homepage, dashboard page, or settings page (has its own header)
  if (pathname === '/' || pathname === '/dashboard' || pathname === '/settings') {
    return null;
  }

  return (
    <header 
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-2 md:px-6 h-14"
      // Reduced height to h-14 (56px) and py to py-2 (8px vertical padding)
    >
      <div className="flex items-center gap-3">
        <Link href={pathname === '/dashboard' ? "/dashboard" : "/"} aria-label="MemoSpark Home" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
          <MemoSparkLogoSvg height={27} /> {/* Slightly reduced logo height to fit new header height */}
        </Link>
        {/* "Tasks & Events" title removed as per new request */}
      </div>
      
      <Show when="signed-in">
        <UserButton userProfileMode="modal">
          <UserButton.UserProfilePage
            label="Profile & progress"
            url="memospark-profile"
            labelIcon={<UserIcon className="size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden />}
          >
            <UserAccountHubPanel
              title="Profile & progress"
              body="Your streaks, achievements, and profile details. Edit here, or open the full page when you want more room."
              href="/profile"
              linkLabel="Open full profile"
              iframeTitle="MemoSpark profile"
            />
          </UserButton.UserProfilePage>
          <UserButton.UserProfilePage
            label="App settings"
            url="memospark-settings"
            labelIcon={<SettingsIcon className="h-4 w-4" aria-hidden />}
          >
            <UserAccountHubPanel
              title="App settings"
              body="Theme, notifications, and preferences: the same as your full settings page, right in this panel."
              href="/settings"
              linkLabel="Open full settings"
              iframeTitle="MemoSpark settings"
            />
          </UserButton.UserProfilePage>
        </UserButton>
      </Show>
      {/* 
      <SignedOut>
        This part is generally not needed if all routes except '/' are protected 
        and redirect to sign-in, as middleware would handle it.
      </SignedOut>
      */}
    </header>
  );
} 