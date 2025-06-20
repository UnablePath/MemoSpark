'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { TutorialManager, type TutorialProgress } from '@/lib/tutorial';
import { TutorialActionDetector } from '@/lib/tutorial/TutorialActionDetector';
import { TutorialOverlay } from './TutorialOverlay';

interface TutorialContextValue {
  isActive: boolean;
  currentProgress: TutorialProgress | null;
  showTutorial: () => void;
  hideTutorial: () => void;
  completeTutorial: () => void;
  shouldShowTutorial: boolean;
  isLoading: boolean;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: React.ReactNode;
  autoStart?: boolean; // Whether to auto-start tutorial for new users
  onTabChange?: (tabIndex: number) => void; // Function to change dashboard tabs
}

export const TutorialProvider: React.FC<TutorialProviderProps> = React.memo(({
  children,
  autoStart = true,
  onTabChange
}) => {
  const { user, isLoaded } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  const actionDetector = useMemo(() => TutorialActionDetector.getInstance(), []);
  const [isActive, setIsActive] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboard, setIsDashboard] = useState(false);

  // Check if user needs to see tutorial - optimized with useCallback
  const checkTutorialStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const shouldShow = await tutorialManager.shouldShowTutorial(user.id);
      setShouldShowTutorial(shouldShow);
      
      if (shouldShow) {
        const progress = await tutorialManager.getTutorialProgress(user.id);
        setCurrentProgress(progress);
        
        // Auto-start tutorial for new users on dashboard
        if (autoStart && (!progress || progress.current_step === 'welcome')) {
          // Check if we're on the dashboard page
          const isDashboardPage = window.location.pathname === '/dashboard';
          setIsDashboard(isDashboardPage);
          
          if (isDashboardPage) {
            // Use requestAnimationFrame for smooth performance
            requestAnimationFrame(() => {
              setTimeout(() => {
                console.log('Auto-starting tutorial for new user on dashboard');
                setIsActive(true);
              }, 1500); // Slightly longer delay to let dashboard load
            });
          }
        } else {
          setIsDashboard(window.location.pathname === '/dashboard');
        }
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tutorialManager, autoStart]);

  // Monitor route changes to pause tutorial when leaving dashboard
  useEffect(() => {
    const handleRouteChange = () => {
      const isDashboardPage = window.location.pathname === '/dashboard';
      setIsDashboard(isDashboardPage);
      
      // If tutorial is active and user leaves dashboard, pause it
      if (isActive && !isDashboardPage) {
        console.log('Tutorial paused: User left dashboard');
        setIsActive(false);
      }
      
      // If user returns to dashboard and tutorial was in progress, resume it
      if (!isActive && isDashboardPage && shouldShowTutorial && currentProgress && !currentProgress.is_completed) {
        console.log('Tutorial resumed: User returned to dashboard');
        setIsActive(true);
      }
    };

    // Listen for browser navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for Next.js route changes (if using Next.js router)
    if (typeof window !== 'undefined') {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function(...args) {
        originalPushState.apply(this, args);
        setTimeout(handleRouteChange, 100);
      };

      window.history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        setTimeout(handleRouteChange, 100);
      };

      return () => {
        window.removeEventListener('popstate', handleRouteChange);
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    }
  }, [isActive, shouldShowTutorial, currentProgress]);

  // Effect for checking tutorial status
  useEffect(() => {
    if (!isLoaded) return;
    checkTutorialStatus();
  }, [isLoaded, checkTutorialStatus]);

  // Initialize action detection when tutorial becomes active
  useEffect(() => {
    if (isActive && user?.id) {
      console.log('Initializing tutorial action detection for user:', user.id);
      actionDetector.initialize(user.id);
    } else if (!isActive) {
      console.log('Cleaning up tutorial action detection');
      actionDetector.cleanup();
    }

    return () => {
      actionDetector.cleanup();
    };
  }, [isActive, user?.id, actionDetector]);

  const showTutorial = useCallback(() => {
    setIsActive(true);
  }, []);

  const hideTutorial = useCallback(() => {
    setIsActive(false);
  }, []);

  const completeTutorial = useCallback(async () => {
    setIsActive(false);
    setShouldShowTutorial(false);
    
    // Update progress
    if (user?.id) {
      const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
      setCurrentProgress(updatedProgress);
    }
    
    // Trigger celebration or other completion effects
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('tutorialCompleted', {
        detail: { userId: user?.id }
      }));
    });
  }, [user?.id, tutorialManager]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<TutorialContextValue>(() => ({
    isActive,
    currentProgress,
    showTutorial,
    hideTutorial,
    completeTutorial,
    shouldShowTutorial,
    isLoading
  }), [isActive, currentProgress, showTutorial, hideTutorial, completeTutorial, shouldShowTutorial, isLoading]);

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      
      {/* Render tutorial overlay when active and on dashboard - memoized */}
      {isActive && isDashboard && (
        <TutorialOverlay
          isVisible={isActive}
          onClose={hideTutorial}
          onComplete={completeTutorial}
          onTabChange={onTabChange}
        />
      )}
    </TutorialContext.Provider>
  );
});

TutorialProvider.displayName = 'TutorialProvider';

export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}; 