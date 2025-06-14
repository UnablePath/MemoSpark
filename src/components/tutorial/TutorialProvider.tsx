'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { TutorialManager, type TutorialProgress } from '@/lib/tutorial';
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
}

export const TutorialProvider: React.FC<TutorialProviderProps> = React.memo(({
  children,
  autoStart = true
}) => {
  const { user, isLoaded } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  const [isActive, setIsActive] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // Auto-start tutorial for new users
        if (autoStart && (!progress || progress.current_step === 'welcome')) {
          // Use requestAnimationFrame for smooth performance
          requestAnimationFrame(() => {
            setTimeout(() => setIsActive(true), 1000); // Small delay for better UX
          });
        }
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tutorialManager, autoStart]);

  // Effect for checking tutorial status
  useEffect(() => {
    if (!isLoaded) return;
    checkTutorialStatus();
  }, [isLoaded, checkTutorialStatus]);

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
      
      {/* Render tutorial overlay when active - memoized */}
      {isActive && (
        <TutorialOverlay
          isVisible={isActive}
          onClose={hideTutorial}
          onComplete={completeTutorial}
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