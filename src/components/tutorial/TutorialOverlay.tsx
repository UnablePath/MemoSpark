'use client';

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  KeyboardEvent
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InteractiveStu } from '@/components/stu/InteractiveStu';
import { TutorialManager } from '@/lib/tutorial/TutorialManager';
import { 
  TutorialProgress, 
  TutorialStepConfig, 
  TutorialError,
  TutorialStep 
} from '@/lib/tutorial/types';
import { cn } from '@/lib/utils';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  SkipForward, 
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Keyboard,
  RefreshCw
} from 'lucide-react';

interface TutorialOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onTabChange?: (tabIndex: number) => void;
  error?: TutorialError | null;
  onRetry?: () => Promise<any>;
  onClearError?: () => void;
  className?: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = React.memo(({
  isVisible,
  onClose,
  onComplete,
  onTabChange,
  error,
  onRetry,
  onClearError,
  className
}) => {
  const { user } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  
  // State
  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [currentStepConfig, setCurrentStepConfig] = useState<TutorialStepConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<Element[]>([]);
  const [showContextualHelp, setShowContextualHelp] = useState(false);
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize all steps to prevent recalculations
  const allSteps = useMemo(() => tutorialManager.getAllSteps(), [tutorialManager]);

  // Calculate current step index and progress
  const currentStepIndex = useMemo(() => {
    if (!currentStepConfig) return 0;
    return allSteps.findIndex(step => step.id === currentStepConfig.id);
  }, [currentStepConfig, allSteps]);

  const progressPercentage = useMemo(() => {
    if (!currentProgress || allSteps.length === 0) return 0;
    const completedCount = currentProgress.completed_steps?.length || 0;
    return Math.round((completedCount / allSteps.length) * 100);
  }, [currentProgress, allSteps.length]);

  // Load tutorial progress with timeout protection
  useEffect(() => {
    if (!user?.id || !isVisible) return;

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        // Add timeout protection for overlay loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Tutorial overlay loading timed out'));
          }, 4000); // 4 second timeout for overlay
        });

        const progressPromise = (async () => {
          let progress = await tutorialManager.getTutorialProgress(user.id);
          
          if (!progress) {
            const result = await tutorialManager.initializeTutorial(user.id);
            if (result.success) {
              progress = result.data!;
            }
          }
          
          return progress;
        })();

        const progress = await Promise.race([progressPromise, timeoutPromise]);
        
        setCurrentProgress(progress);
        
        if (progress?.current_step) {
          const stepConfig = tutorialManager.getStepConfig(progress.current_step);
          setCurrentStepConfig(stepConfig);
          
          // Automatically navigate to the target tab for this step
          if (stepConfig?.targetTab !== undefined) {
            setTimeout(() => {
              // Dispatch custom event for tab change
              window.dispatchEvent(new CustomEvent('tutorialTabChange', {
                detail: { tabIndex: stepConfig.targetTab }
              }));
              
              // Also call the callback if provided (for backward compatibility)
              if (onTabChange) {
                onTabChange(stepConfig.targetTab!);
              }
            }, 300); // Small delay for smooth transition
          }
        }
      } catch (error) {
        console.warn('Error loading tutorial progress:', error);
        // Set safe defaults on error
        setCurrentProgress(null);
        setCurrentStepConfig(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user?.id, isVisible, tutorialManager, onTabChange]);

  // Check if current step requires user action
  useEffect(() => {
    if (!user?.id || !currentStepConfig) return;

    const checkActionStatus = async () => {
      if (currentStepConfig.interactiveMode && currentStepConfig.waitForAction) {
        setIsWaitingForAction(true);
        
        const actionStatus = await tutorialManager.checkStepActionCompletion(user.id);
        setActionCompleted(actionStatus.actionCompleted);
        
        if (actionStatus.actionCompleted) {
          setIsWaitingForAction(false);
          // Auto-advance if action is completed
          setTimeout(() => {
            handleNextStep();
          }, 1500);
        }
      } else {
        setIsWaitingForAction(false);
        setActionCompleted(true);
      }
    };

    checkActionStatus();
  }, [user?.id, currentStepConfig]);

  // Highlight target elements
  useEffect(() => {
    if (!currentStepConfig?.targetElements) {
      setHighlightedElements([]);
      return;
    }

    const highlightElements = () => {
      const elements: Element[] = [];
      
      currentStepConfig.targetElements?.forEach(selector => {
        try {
          const found = document.querySelectorAll(selector);
          elements.push(...Array.from(found));
        } catch (error) {
          console.warn(`Invalid selector: ${selector}`, error);
        }
      });

      setHighlightedElements(elements);
      
      // Add highlight class
      elements.forEach(el => {
        el.classList.add('tutorial-highlight');
      });
    };

    // Delay highlighting to ensure DOM is ready
    const timeout = setTimeout(highlightElements, 500);
    timeoutRef.current = timeout;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Remove highlight class
      highlightedElements.forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStepConfig?.targetElements]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          if (event.ctrlKey) {
            onClose();
          } else if (error && onClearError) {
            onClearError();
          }
          break;
        case 'ArrowRight':
        case 'Enter':
          if (!isWaitingForAction || actionCompleted) {
            handleNextStep();
          }
          break;
        case 'ArrowLeft':
          handlePreviousStep();
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.altKey) {
            event.preventDefault();
            handleSkipStep();
          }
          break;
        case 'r':
        case 'R':
          if ((event.ctrlKey || event.altKey) && onRetry) {
            event.preventDefault();
            handleRetry();
          }
          break;
        case 'h':
        case 'H':
          if (event.ctrlKey || event.altKey) {
            event.preventDefault();
            setShowContextualHelp(prev => !prev);
          }
          break;
        case '?':
          setShowKeyboardHelp(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown as any);
    return () => document.removeEventListener('keydown', handleKeyDown as any);
  }, [isVisible, isWaitingForAction, actionCompleted, error, onClose, onClearError, onRetry]);

  // Focus management for accessibility
  useEffect(() => {
    if (isVisible && cardRef.current) {
      // Focus the card for screen readers
      cardRef.current.focus();
    }
  }, [isVisible, currentStepConfig]);

  // Event handlers
  const handleNextStep = useCallback(async () => {
    if (!user?.id || !currentStepConfig) return;

    try {
      const result = await tutorialManager.advanceToNextStep(user.id, currentStepConfig.id);
      if (result.success) {
        const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
        setCurrentProgress(updatedProgress);
        
        if (updatedProgress?.current_step === 'completion') {
          onComplete();
        } else if (updatedProgress?.current_step) {
          const nextStepConfig = tutorialManager.getStepConfig(updatedProgress.current_step);
          setCurrentStepConfig(nextStepConfig);
        }
      }
    } catch (error) {
      console.error('Error advancing to next step:', error);
    }
  }, [user?.id, currentStepConfig, tutorialManager, onComplete]);

  const handlePreviousStep = useCallback(async () => {
    if (!currentProgress || currentStepIndex <= 0) return;
    
    const previousStepConfig = allSteps[currentStepIndex - 1];
    if (previousStepConfig) {
      setCurrentStepConfig(previousStepConfig);
      
      // Navigate to previous step's tab if needed
      if (previousStepConfig.targetTab !== undefined && onTabChange) {
        onTabChange(previousStepConfig.targetTab);
      }
    }
  }, [currentProgress, currentStepIndex, allSteps, onTabChange]);

  const handleSkipStep = useCallback(async () => {
    if (!user?.id || !currentStepConfig) return;

    try {
      const result = await tutorialManager.skipStep(user.id, currentStepConfig.id);
      if (result.success) {
        await handleNextStep();
      }
    } catch (error) {
      console.error('Error skipping step:', error);
    }
  }, [user?.id, currentStepConfig, tutorialManager, handleNextStep]);

  const handleRetry = useCallback(async () => {
    if (!onRetry) return;
    
    setRetrying(true);
    try {
      await onRetry();
      if (onClearError) {
        onClearError();
      }
    } catch (error) {
      console.error('Error retrying step:', error);
    } finally {
      setRetrying(false);
    }
  }, [onRetry, onClearError]);

  const handleSkipTutorial = useCallback(async () => {
    if (!user?.id) return;

    try {
      await tutorialManager.skipTutorial(user.id);
      onClose();
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  }, [user?.id, tutorialManager, onClose]);

  // Don't render if not visible or no step config
  if (!isVisible || !currentStepConfig) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm",
          "flex items-center justify-center p-4",
          className
        )}
        role="dialog"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card 
            ref={cardRef}
            className="bg-background/95 dark:bg-background/95 backdrop-blur-md border border-border shadow-2xl"
            tabIndex={-1}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12">
                    <InteractiveStu
                      size="sm"
                      className="w-full h-full"
                      enableTTS={false}
                      showSpeechBubble={false}
                      messages={[currentStepConfig.stuMessage]}
                    />
                  </div>
                  <div>
                    <CardTitle 
                      id="tutorial-title"
                      className="text-lg sm:text-xl text-foreground"
                    >
                      {currentStepConfig.title}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-muted-foreground">
                      Step {currentStepIndex + 1} of {allSteps.length}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                    title="Keyboard shortcuts (Press ?)"
                    aria-label="Show keyboard shortcuts"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="text-foreground hover:bg-muted"
                    aria-label="Close tutorial"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <Progress 
                  value={progressPercentage} 
                  className="h-2" 
                  aria-label={`Tutorial progress: ${progressPercentage}%`}
                />
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  {currentProgress?.completed_steps?.length || 0} of {allSteps.length} steps completed
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error.message}</span>
                    <div className="flex gap-2 ml-4">
                      {onRetry && error.retryable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          disabled={retrying}
                          className="text-xs"
                        >
                          <RefreshCw className={cn("h-3 w-3 mr-1", retrying && "animate-spin")} />
                          Retry
                        </Button>
                      )}
                      {onClearError && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClearError}
                          className="text-xs"
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Stu's Message */}
              <div 
                id="tutorial-description"
                className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary"
              >
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {currentStepConfig.stuMessage}
                </p>
              </div>

              {/* Action Instructions */}
              {isWaitingForAction && currentStepConfig.actionInstructions && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {actionCompleted ? (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {actionCompleted ? 'Great job!' : 'Action Required'}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {actionCompleted 
                          ? 'You completed the required action. Moving to the next step...'
                          : currentStepConfig.actionInstructions
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contextual Help */}
              {showContextualHelp && currentStepConfig.contextualHelp && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Helpful Tip
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {currentStepConfig.contextualHelp.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyboard Help */}
              {showKeyboardHelp && (
                <div className="bg-gray-50 dark:bg-gray-950/50 rounded-lg p-4 border">
                  <h4 className="text-sm font-medium mb-3">Keyboard Shortcuts</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">→</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Enter</kbd> Next step</div>
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">←</kbd> Previous step</div>
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Ctrl+S</kbd> Skip step</div>
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Ctrl+R</kbd> Retry</div>
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Ctrl+H</kbd> Toggle help</div>
                    <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Ctrl+Esc</kbd> Close</div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex <= 0 || isLoading}
                    className="text-xs"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Previous
                  </Button>
                  
                  {currentStepConfig.contextualHelp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContextualHelp(!showContextualHelp)}
                      className="text-xs"
                      title="Toggle helpful tip (Ctrl+H)"
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      {showContextualHelp ? 'Hide' : 'Help'}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkipTutorial}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Skip Tutorial
                  </Button>
                  
                  {currentStepConfig.skipAllowed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSkipStep}
                      disabled={isLoading}
                      className="text-xs"
                      title="Skip this step (Ctrl+S)"
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip Step
                    </Button>
                  )}

                  <Button
                    onClick={(!isWaitingForAction || actionCompleted) ? handleNextStep : undefined}
                    disabled={isLoading || (isWaitingForAction && !actionCompleted)}
                    size="sm"
                    className="text-xs"
                  >
                    {isWaitingForAction && !actionCompleted ? (
                      'Waiting for action...'
                    ) : currentStepIndex === allSteps.length - 1 ? (
                      'Complete'
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

TutorialOverlay.displayName = 'TutorialOverlay';
