"use client";

import { useRef } from "react";
import Link from 'next/link';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import DashboardSwipeTabs from './DashboardSwipeTabs';
import { SignedIn, UserButton } from "@clerk/nextjs";
import { User as UserIcon, Settings as SettingsIcon, Crown, Sparkles } from 'lucide-react';
import { useTieredAI } from '@/hooks/useTieredAI';
import { Button } from '@/components/ui/button';
// import { useLocalStorage } from "@/hooks/useLocalStorage"; // Widget temporarily commented out
// import { DraggableWidget } from "@/components/widgets/DraggableWidget";
// import { WidgetContent } from "@/components/widgets/WidgetContent";
// import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react'; // No longer needed here

export default function DashboardPage() {
  // const [isWidgetEnabled] = useLocalStorage('dashboard-widget-enabled', false);
  const constraintsRef = useRef(null);
  
  // Tier-aware dashboard features
  const { userTier, usage, isLoading, tierLimits } = useTieredAI();

  return (
    <div ref={constraintsRef} className="app-container flex flex-col h-screen bg-background">
      {/* ConditionalHeader is now disabled for /dashboard */}
      {/* Integrated header elements for dashboard: Logo, Tier Info, and UserButton */}
      <div className="flex items-center justify-between px-2 py-3 lg:px-4 border-b border-border bg-background flex-shrink-0 pt-safe-top">
        <Link href="/" aria-label="MemoSpark Homepage" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
          <MemoSparkLogoSvg height={42} /> 
        </Link>
        
        {/* Tier and Usage Display */}
        <div className="flex items-center gap-3">
          {!isLoading && (
            <div className="flex items-center gap-2">
              {/* Tier Badge */}
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                userTier === 'free' ? 'bg-gray-100 text-gray-700' :
                userTier === 'premium' ? 'bg-amber-100 text-amber-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {userTier !== 'free' && <Crown className="h-3 w-3" />}
                {userTier}
              </div>
              
              {/* Usage Indicator */}
              <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>{usage.requestsRemaining}</span>
                {userTier === 'free' && <span>/day</span>}
              </div>
              
              {/* Upgrade Button for Free Users */}
              {userTier === 'free' && (
                <Button size="sm" variant="outline" className="hidden md:flex border-amber-300 hover:bg-amber-50">
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade
                </Button>
              )}
            </div>
          )}
          
          <SignedIn>
            <UserButton afterSignOutUrl="/">
              <UserButton.UserProfileLink label="My Profile & Progress" url="/profile" labelIcon={<UserIcon className="h-4 w-4" />} />
              <UserButton.UserProfileLink label="Settings" url="/settings" labelIcon={<SettingsIcon className="h-4 w-4" />} />
            </UserButton>
          </SignedIn>
        </div>
      </div>
      
      <a href="#main-dashboard-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      
      <main id="main-dashboard-content" className="flex-1 overflow-hidden">
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
