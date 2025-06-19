"use client";

import { useRef, useState } from "react";
import Link from 'next/link';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import DashboardSwipeTabs from './DashboardSwipeTabs';
import { SignedIn, UserButton } from "@clerk/nextjs";
import { User as UserIcon, Settings as SettingsIcon, Crown, Sparkles } from 'lucide-react';
import { useTieredAI } from '@/hooks/useTieredAI';
import { Button } from '@/components/ui/button';
import { InteractiveStu } from '@/components/stu/InteractiveStu';
import { TutorialTrigger } from '@/components/tutorial';
import { useTheme } from 'next-themes';
import { DraggableWidget } from "@/components/widgets/DraggableWidget";
// import { useLocalStorage } from "@/hooks/useLocalStorage"; // Widget temporarily commented out
// import { User as UserIcon, Settings as SettingsIcon } from 'lucide-react'; // No longer needed here

export default function DashboardPage() {
  // Widget settings
  const [isWidgetEnabled] = useState(true); // Enable widget for better UX
  const constraintsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  // Tier-aware dashboard features
  const { userTier, usage, isLoading, tierLimits } = useTieredAI();

  // Determine if current theme is dark
  const isDarkTheme = theme === 'dark' || 
                     theme?.includes('amoled') || 
                     theme?.includes('sea-blue') ||
                     theme?.includes('hello-kitty-pink') ||
                     theme?.includes('hacker-green') ||
                     theme?.includes('void-purple') ||
                     theme?.includes('sunset-orange') ||
                     theme?.includes('midnight-blue') ||
                     theme?.includes('cherry-blossom') ||
                     theme?.includes('carbon');

  return (
    <div ref={constraintsRef} className="app-container flex flex-col h-screen bg-background">
      {/* ConditionalHeader is now disabled for /dashboard */}
      {/* Integrated header elements for dashboard: Logo, Tier Info, and UserButton */}
      <div className="flex items-center justify-between px-2 sm:px-3 lg:px-4 py-3 sm:py-6 border-b border-border bg-background flex-shrink-0 pt-safe-top">
        <Link href="/" aria-label="MemoSpark Homepage" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
          <MemoSparkLogoSvg height={38} className="sm:h-12 md:h-14" /> 
        </Link>
        
        {/* Right side navigation */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
          {!isLoading && (
            <>
              {/* Tier Badge - Icon only on very small screens */}
              <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 xs:px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                userTier === 'free' ? 'bg-gray-100 text-gray-700' :
                userTier === 'premium' ? 'bg-amber-100 text-amber-700' :
                'bg-purple-100 text-purple-700'
              }`} title={`${userTier} tier`}>
                {userTier !== 'free' && <Crown className="h-3 w-3" />}
                <span className="hidden sm:inline">{userTier}</span>
              </div>
              
              {/* Usage Indicator - Compact */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground px-1">
                <Sparkles className="h-3 w-3" />
                <span>{usage.requestsRemaining}</span>
              </div>
            </>
          )}
          
          {/* Profile Button */}
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/profile" aria-label="Profile">
              <UserIcon className="h-4 w-4" />
            </Link>
          </Button>
          
          {/* Settings Button */}
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/settings" aria-label="Settings">
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </Button>
          
          {/* Tutorial Trigger */}
          <TutorialTrigger variant="icon" />
          
          {/* Clerk User Button - simple black/white theme */}
          <SignedIn>
            <div className="h-8 w-8 flex items-center justify-center">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  variables: {
                    colorPrimary: '#22c55e',
                    colorText: isDarkTheme ? '#ffffff' : '#000000',
                    colorTextSecondary: isDarkTheme ? '#a1a1aa' : '#666666',
                    colorBackground: isDarkTheme ? '#1f2937' : '#ffffff',
                    colorInputBackground: isDarkTheme ? '#1f2937' : '#ffffff',
                    colorInputText: isDarkTheme ? '#ffffff' : '#000000',
                    borderRadius: '0.5rem',
                  },
                  elements: {
                    // Kill ALL backgrounds and glass effects
                    userButtonTrigger: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                      width: '28px !important',
                      height: '28px !important',
                      padding: '0 !important',
                      '&:hover': {
                        backgroundColor: 'transparent !important',
                        backdropFilter: 'none !important',
                        WebkitBackdropFilter: 'none !important',
                      },
                      '&:focus': {
                        backgroundColor: 'transparent !important',
                        boxShadow: 'none !important',
                      },
                    },
                    userButtonBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    userButtonOuterBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    userButtonAvatarBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                      width: '28px !important',
                      height: '28px !important',
                    },
                    avatarBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    // Also target other potential containers
                    rootBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    card: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    cardBox: {
                      backgroundColor: 'transparent !important',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                      boxShadow: 'none !important',
                      border: 'none !important',
                    },
                    // Popover card with proper theme colors (but no glass effect)
                    userButtonPopoverCard: {
                      backgroundColor: isDarkTheme ? '#1f2937' : '#ffffff',
                      color: isDarkTheme ? '#ffffff' : '#000000',
                      border: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'none !important',
                      WebkitBackdropFilter: 'none !important',
                    },
                    userButtonPopoverActionButton: {
                      color: isDarkTheme ? '#ffffff' : '#000000',
                      '&:hover': {
                        backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                        color: isDarkTheme ? '#ffffff' : '#000000',
                      },
                    },
                  }
                }}
                userProfileMode="modal"
              />
            </div>
          </SignedIn>
        </div>
      </div>
      
      <a href="#main-dashboard-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      
      <main id="main-dashboard-content" className="flex-1 overflow-hidden">
        <h1 className="sr-only">User Dashboard</h1>
        <DashboardSwipeTabs />
      </main>

      {/* Floating Stu with Lottie Animation */}
      <div className="fixed bottom-14 sm:bottom-4 right-3 sm:right-4 z-40">
        <div className="scale-75 sm:scale-100 transition-transform duration-100">
          <InteractiveStu
            size="md"
            enableTTS={true}
            showSpeechBubble={true}
            messages={[
              "Hi! I'm Stu, your study buddy!",
              "Ready to tackle some tasks together?",
              "You're doing great! Keep it up!",
              "Time for a quick study break?",
              "Let's make learning fun today!",
              "I'm here to help you stay motivated!",
              "Click me anytime you need encouragement!"
            ]}
            className="drop-shadow-lg"
          />
        </div>
      </div>

      {/* Draggable Widget for Task Reminders */}
      {isWidgetEnabled && (
        <div role="region" aria-label="Draggable Task Widget">
          <DraggableWidget
            widgetId="dashboard-widget"
            dragConstraintsRef={constraintsRef}
            initialPosition={{ x: 20, y: 100 }}
            className="lg:block hidden" // Only show on larger screens to avoid clutter
          />
        </div>
      )}
      {/* ARIA live region for status messages */}
      <div aria-live="polite" className="sr-only" id="dashboard-status-message"></div>
    </div>
  );
}
