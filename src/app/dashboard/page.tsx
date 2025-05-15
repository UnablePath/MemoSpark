"use client";

import { useRef } from "react";
import Link from 'next/link';
// import { Button } from "@/components/ui/button"; // No longer needed for Profile/Settings icons
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
// import ProfileHeader from "@/components/profile/ProfileHeader"; // To be replaced by UserButton from layout + specific icons
import DashboardSwipeTabs from './DashboardSwipeTabs';
import { SignedIn, UserButton } from "@clerk/nextjs"; // Import SignedIn and UserButton
import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react'; // Import icons for UserButton links
// import { useLocalStorage } from "@/hooks/useLocalStorage"; // Widget temporarily commented out
// import { DraggableWidget } from "@/components/widgets/DraggableWidget";
// import { WidgetContent } from "@/components/widgets/WidgetContent";
// import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react'; // No longer needed here

export default function DashboardPage() {
  // const [isWidgetEnabled] = useLocalStorage('dashboard-widget-enabled', false);
  const constraintsRef = useRef(null);

  return (
    <div ref={constraintsRef} className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* ConditionalHeader is now disabled for /dashboard */}
      {/* Integrated header elements for dashboard: Logo and UserButton */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
        <Link href="/dashboard" aria-label="StudySpark Dashboard Home" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
          <StudySparkLogoSvg height={36} /> 
        </Link>
        <SignedIn>
          <UserButton afterSignOutUrl="/">
            <UserButton.UserProfileLink label="My Profile & Progress" url="/profile" labelIcon={<UserIcon className="h-4 w-4" />} />
            <UserButton.UserProfileLink label="Settings" url="/settings" labelIcon={<SettingsIcon className="h-4 w-4" />} />
          </UserButton>
        </SignedIn>
        </div>
      
      <a href="#main-dashboard-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      
      <main id="main-dashboard-content" className="flex-1 overflow-y-auto">
        {/* Removed pt-4 to reduce space below the now shorter header */}
        <h1 className="sr-only">User Dashboard</h1>
        <DashboardSwipeTabs />
      </main>

      {/* {isWidgetEnabled && (
        <div role="region" aria-label="Draggable Mascot Widget">
          <DraggableWidget
            widgetId="dashboard-widget"
            dragConstraintsRef={constraintsRef}
            initialPosition={{ x: 100, y: 200 }}
          >
            <WidgetContent type="tasks" />
          </DraggableWidget>
        </div>
      )} */}
      {/* ARIA live region for status messages */}
      <div aria-live="polite" className="sr-only" id="dashboard-status-message"></div>
    </div>
  );
}
