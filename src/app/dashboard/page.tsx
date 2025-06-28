"use client";

import { useRef, useState, useEffect } from "react";
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
// Import achievement system
import { AchievementNotificationSystem } from '@/components/achievements/AchievementNotificationSystem';
import { useAchievementTrigger } from '@/hooks/useAchievementTrigger';
import { AuthAwareSeo } from '@/components/seo/AuthAwareSeo';

export default function DashboardPage() {
  // Widget settings
  const [isWidgetEnabled] = useState(true); // Enable widget for better UX
  const [achievementsInitialized, setAchievementsInitialized] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  // Tier-aware dashboard features
  const { userTier, usage, isLoading, tierLimits } = useTieredAI();
  
  // Achievement system
  const { triggerAchievement } = useAchievementTrigger();

  // Initialize achievements on first load
  useEffect(() => {
    if (!achievementsInitialized) {
      initializeAchievements();
      setAchievementsInitialized(true);
    }
  }, [achievementsInitialized]);

  // Function to populate achievements if they don't exist
  const initializeAchievements = async () => {
    try {
      // First check if achievements exist
      const checkResponse = await fetch('/api/achievements');
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.stats?.total === 0) {
          // No achievements exist, populate them
          console.log('Populating achievements...');
          const populateResponse = await fetch('/api/admin/achievements/populate', {
            method: 'POST'
          });
          if (populateResponse.ok) {
            console.log('✅ Achievements populated successfully!');
          }
        }
      }
      
      // Trigger tutorial/dashboard visit achievements
      await triggerAchievement('tutorial_step', { action: 'dashboard_visited' });
    } catch (error) {
      console.error('Error initializing achievements:', error);
    }
  };

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
    <>
      <AuthAwareSeo
        pageKey="dashboard"
        publicTitle="Student Dashboard"
        publicDescription="Access your personalized study dashboard with AI-powered insights, task management, and progress tracking. Sign in to unlock your full learning potential."
        privateTitle="Your Dashboard"
        privateDescription="Your personalized study dashboard with AI-powered insights, task management, and progress tracking."
        forceNoindex={true}
      />
      <div ref={constraintsRef} className="dashboard-container bg-background">
        {/* Achievement Notification System */}
        <AchievementNotificationSystem 
          maxNotifications={3}
          defaultDuration={6000}
          position="top-right"
        />
        
        {/* ConditionalHeader is now disabled for /dashboard */}
        {/* Integrated header elements for dashboard: Logo, Tier Info, and UserButton */}
        <div className="flex items-center justify-between px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 md:py-3 lg:py-4 xl:py-6 border-b border-border bg-background flex-shrink-0 pt-safe-top">
          <Link href="/" aria-label="MemoSpark Homepage" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
            <MemoSparkLogoSvg height={28} className="sm:h-8 md:h-9 lg:h-10 xl:h-11" /> 
          </Link>
          
          {/* Right side navigation */}
          <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2">
            {!isLoading && (
              <>
                {/* Tier Badge - Icon only on very small screens */}
                <div className={`flex items-center gap-0.5 sm:gap-1 px-1 xs:px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                  userTier === 'free' ? 'bg-gray-100 text-gray-700' :
                  userTier === 'premium' ? 'bg-amber-100 text-amber-700' :
                  'bg-purple-100 text-purple-700'
                }`} title={`${userTier} tier`}>
                  {userTier !== 'free' && <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                  <span className="hidden sm:inline text-xs">{userTier}</span>
                </div>
                
                {/* Usage Indicator - Compact */}
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground px-1">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-xs">{usage.requestsRemaining}</span>
                </div>
              </>
            )}
            
            {/* Profile Button */}
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 p-0"
              onClick={() => triggerAchievement('tutorial_step', { action: 'profile_opened' })}
            >
              <Link href="/profile" aria-label="Profile">
                <UserIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </Link>
            </Button>
            
            {/* Settings Button */}
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 p-0"
              onClick={() => triggerAchievement('tutorial_step', { action: 'settings_opened' })}
            >
              <Link href="/settings" aria-label="Settings">
                <SettingsIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </Link>
            </Button>
            
            {/* Tutorial Trigger */}
            <TutorialTrigger variant="icon" />
            
            {/* Clerk User Button - simple black/white theme */}
            <SignedIn>
              <div className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 flex items-center justify-center">
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
                        width: '20px !important',
                        height: '20px !important',
                        '@media (min-width: 640px)': {
                          width: '24px !important',
                          height: '24px !important',
                        },
                        '@media (min-width: 1024px)': {
                          width: '28px !important',
                          height: '28px !important',
                        },
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
                        width: '20px !important',
                        height: '20px !important',
                        '@media (min-width: 640px)': {
                          width: '24px !important',
                          height: '24px !important',
                        },
                        '@media (min-width: 1024px)': {
                          width: '28px !important',
                          height: '28px !important',
                        },
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

        {/* ARIA live region for status messages */}
        <div aria-live="polite" className="sr-only" id="dashboard-status-message"></div>
      </div>
    </>
  );
}
