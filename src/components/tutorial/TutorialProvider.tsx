'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef
} from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { TutorialManager } from '@/lib/tutorial/TutorialManager';
import { TutorialActionDetector } from '@/lib/tutorial/TutorialActionDetector';
import { TutorialErrorHandler } from '@/lib/tutorial/TutorialErrorHandler';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';
import { TutorialOverlay } from './TutorialOverlay';
import { 
  TutorialContextValue, 
  TutorialState, 
  TutorialProgress, 
  TutorialError, 
  TutorialResult,
  TutorialStep,
  DEFAULT_TUTORIAL_CONFIG,
  TutorialConfig
} from '@/lib/tutorial/types';

interface TutorialProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
  onTabChange?: (tabIndex: number) => void;
  config?: Partial<TutorialConfig>;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export const TutorialProvider: React.FC<TutorialProviderProps> = React.memo(({
  children,
  autoStart = true,
  onTabChange,
  config = {}
}) => {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const { triggerAchievement } = useDebouncedAchievementTrigger();
  
  // Managers - initialized once and reused
  const tutorialManager = useMemo(() => 
    TutorialManager.getInstance({ ...DEFAULT_TUTORIAL_CONFIG, ...config }), 
    [config]
  );
  const actionDetector = useMemo(() => TutorialActionDetector.getInstance(), []);
  const errorHandler = useMemo(() => TutorialErrorHandler.getInstance(), []);
  
  // State management
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentProgress: null,
    isLoading: true,
    error: null,
    retryCount: 0,
    actionInProgress: false
  });

  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isDashboard, setIsDashboard] = useState(false);
  
  // Refs for cleanup
  const eventListenersRef = useRef<(() => void)[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Check if we're on dashboard
  useEffect(() => {
    setIsDashboard(pathname === '/dashboard');
  }, [pathname]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clean up event listeners
    eventListenersRef.current.forEach(cleanup => cleanup());
    eventListenersRef.current = [];
    
    // Clear timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    // Clean up action detector
    actionDetector.cleanup();
  }, [actionDetector]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (typeof window === 'undefined') return;

    const handleTutorialError = (event: CustomEvent) => {
      const { error, recovery } = event.detail;
      setState(prev => ({ ...prev, error, isLoading: false }));
      
      // Show user-friendly message
      if (recovery?.userMessage) {
        // You could show a toast notification here
        console.info('Tutorial:', recovery.userMessage);
      }
    };

    const handleTutorialActionCompleted = (event: CustomEvent) => {
      setState(prev => ({ ...prev, actionInProgress: false }));
    };

    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (!state.isActive || !config.enableKeyboardNavigation) return;

      switch (event.key) {
        case 'Escape':
          if (event.ctrlKey) {
            hideTutorial();
          }
          break;
        case 'F1':
          event.preventDefault();
          if (!state.isActive) {
            showTutorial();
          }
          break;
        case 'Enter':
          if (event.altKey && state.currentProgress) {
            // Skip current step
            skipStep();
          }
          break;
      }
    };

    // Add event listeners
    window.addEventListener('tutorialError', handleTutorialError as EventListener);
    window.addEventListener('tutorialActionCompleted', handleTutorialActionCompleted as EventListener);
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Store cleanup functions
    eventListenersRef.current = [
      () => window.removeEventListener('tutorialError', handleTutorialError as EventListener),
      () => window.removeEventListener('tutorialActionCompleted', handleTutorialActionCompleted as EventListener),
      () => document.removeEventListener('keydown', handleKeyboardNavigation),
    ];
  }, [state.isActive, state.currentProgress, config.enableKeyboardNavigation]);

  // Check tutorial status - optimized with useCallback
  const checkTutorialStatus = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const progress = await tutorialManager.getTutorialProgress(user.id);
      const shouldShow = await tutorialManager.shouldShowTutorial(user.id);
      
      setState(prev => ({
        ...prev,
        currentProgress: progress,
        isLoading: false,
        error: null
      }));
      
      setShouldShowTutorial(shouldShow);
      
      // Auto-start tutorial if enabled and needed
      if (autoStart && shouldShow && isDashboard) {
        const timeout = setTimeout(() => {
          setState(prev => ({ ...prev, isActive: true }));
        }, 1000); // Small delay to let UI settle
        
        timeoutsRef.current.push(timeout);
      }
    } catch (error) {
      const tutorialError = errorHandler.createError(
        'INITIALIZATION_FAILED',
        `Failed to check tutorial status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { metadata: { userId: user.id } }
      );
      
      setState(prev => ({
        ...prev,
        error: tutorialError,
        isLoading: false
      }));
    }
  }, [user?.id, tutorialManager, errorHandler, autoStart, isDashboard]);

  // Initialize when user is loaded
  useEffect(() => {
    if (!isLoaded) return;
    
    cleanup(); // Clean up any existing listeners
    setupEventListeners();
    checkTutorialStatus();
    
    return cleanup;
  }, [isLoaded, checkTutorialStatus, setupEventListeners, cleanup]);

  // Initialize action detection when tutorial becomes active
  useEffect(() => {
    if (state.isActive && user?.id) {
      console.log('Initializing tutorial action detection for user:', user.id);
      actionDetector.initialize(user.id);
    } else if (!state.isActive) {
      console.log('Cleaning up tutorial action detection');
      actionDetector.cleanup();
    }
  }, [state.isActive, user?.id, actionDetector]);

  // Tutorial control functions
  const showTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true, error: null }));
  }, []);

  const hideTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, retryCount: 0 }));
  }, []);

  const completeTutorial = useCallback(async (): Promise<TutorialResult> => {
    if (!user?.id) {
      const error = errorHandler.createError(
        'INVALID_STATE',
        'No user ID available for tutorial completion',
        { action: 'complete' }
      );
      return { success: false, error };
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      hideTutorial();

      // Trigger the achievement for completing the tutorial
      try {
        await triggerAchievement('TUTORIAL_COMPLETED');
        console.log('TUTORIAL_COMPLETED achievement triggered successfully.');
      } catch (achievementError) {
        console.error('Failed to trigger TUTORIAL_COMPLETED achievement:', achievementError);
      }
      
      // Update progress state locally
      const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
      setState(prev => ({
        ...prev,
        currentProgress: updatedProgress,
        isLoading: false
      }));
      setShouldShowTutorial(false);
      
      // Dispatch a global event for other components to listen to
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('tutorialCompleted', {
          detail: { userId: user.id }
        }));
      });

      return { success: true, data: true };
    } catch (error) {
      const tutorialError = errorHandler.createError(
        'STEP_VALIDATION_FAILED',
        `Failed to complete tutorial: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'complete', metadata: { userId: user.id } }
      );
      
      setState(prev => ({
        ...prev,
        error: tutorialError,
        isLoading: false
      }));
      
      return { success: false, error: tutorialError };
    }
  }, [user?.id, hideTutorial, triggerAchievement, tutorialManager, errorHandler]);

  const skipStep = useCallback(async (step?: TutorialStep): Promise<TutorialResult> => {
    if (!user?.id || !state.currentProgress) {
      const error = errorHandler.createError(
        'INVALID_STATE',
        'Cannot skip step: no user or progress available',
        { action: 'skip_step' }
      );
      return { success: false, error };
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const stepToSkip = step || state.currentProgress.current_step;
      const result = await tutorialManager.skipStep(user.id, stepToSkip);
      
      if (result.success) {
        const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
        setState(prev => ({
          ...prev,
          currentProgress: updatedProgress,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || null,
          isLoading: false
        }));
      }
      
      return result;
    } catch (error) {
      const tutorialError = errorHandler.createError(
        'STEP_VALIDATION_FAILED',
        `Failed to skip step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'skip_step', step, metadata: { userId: user.id } }
      );
      
      setState(prev => ({
        ...prev,
        error: tutorialError,
        isLoading: false
      }));
      
      return { success: false, error: tutorialError };
    }
  }, [user?.id, state.currentProgress, tutorialManager, errorHandler]);

  const restartTutorial = useCallback(async (): Promise<TutorialResult> => {
    if (!user?.id) {
      const error = errorHandler.createError(
        'INVALID_STATE',
        'No user ID available for tutorial restart',
        { action: 'restart' }
      );
      return { success: false, error };
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await tutorialManager.restartTutorial(user.id);
      
      if (result.success) {
        const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
        setState(prev => ({
          ...prev,
          currentProgress: updatedProgress,
          isActive: true,
          isLoading: false
        }));
        setShouldShowTutorial(true);
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || null,
          isLoading: false
        }));
      }
      
      return result;
    } catch (error) {
      const tutorialError = errorHandler.createError(
        'INITIALIZATION_FAILED',
        `Failed to restart tutorial: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'restart', metadata: { userId: user.id } }
      );
      
      setState(prev => ({
        ...prev,
        error: tutorialError,
        isLoading: false
      }));
      
      return { success: false, error: tutorialError };
    }
  }, [user?.id, tutorialManager, errorHandler]);

  const retryCurrentStep = useCallback(async (): Promise<TutorialResult> => {
    if (!user?.id || !state.currentProgress) {
      const error = errorHandler.createError(
        'INVALID_STATE',
        'Cannot retry step: no user or progress available',
        { action: 'retry' }
      );
      return { success: false, error };
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        retryCount: prev.retryCount + 1
      }));
      
      // Re-initialize action detection for current step
      const stepConfig = tutorialManager.getStepConfig(state.currentProgress.current_step);
      if (stepConfig?.actionDetection && stepConfig.waitForAction) {
        await actionDetector.setupActionDetection(stepConfig.waitForAction, stepConfig.actionDetection);
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return { success: true, data: true };
    } catch (error) {
      const tutorialError = errorHandler.createError(
        'STEP_VALIDATION_FAILED',
        `Failed to retry step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'retry', metadata: { userId: user.id, currentStep: state.currentProgress.current_step } }
      );
      
      setState(prev => ({
        ...prev,
        error: tutorialError,
        isLoading: false
      }));
      
      return { success: false, error: tutorialError };
    }
  }, [user?.id, state.currentProgress, state.retryCount, tutorialManager, actionDetector, errorHandler]);

  // Handle tutorial complete callback
  const handleTutorialComplete = useCallback(async () => {
    await completeTutorial();
  }, [completeTutorial]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<TutorialContextValue>(() => ({
    ...state,
    showTutorial,
    hideTutorial,
    completeTutorial,
    skipStep,
    restartTutorial,
    retryCurrentStep,
    shouldShowTutorial,
    clearError
  }), [
    state,
    showTutorial,
    hideTutorial,
    completeTutorial,
    skipStep,
    restartTutorial,
    retryCurrentStep,
    shouldShowTutorial,
    clearError
  ]);

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      
      {/* Render tutorial overlay when active and on dashboard - memoized */}
      {state.isActive && isDashboard && (
        <TutorialOverlay
          isVisible={state.isActive}
          onClose={hideTutorial}
          onComplete={handleTutorialComplete}
          onTabChange={onTabChange}
          error={state.error}
          onRetry={retryCurrentStep}
          onClearError={clearError}
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