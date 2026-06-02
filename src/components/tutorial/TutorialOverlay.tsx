'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InteractiveStu } from '@/components/stu/InteractiveStu';
import { TutorialManager } from '@/lib/tutorial/TutorialManager';
import type {
  TutorialProgress,
  TutorialStepConfig,
  TutorialError,
} from '@/lib/tutorial/types';
import { cn } from '@/lib/utils';
import { useIsMobile, useReducedMotion } from '@/hooks/useMediaQuery';
import {
  X,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  AlertCircle,
  HelpCircle,
  Keyboard,
  RefreshCw,
} from 'lucide-react';

interface TutorialOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onTabChange?: (tabIndex: number) => void;
  error?: TutorialError | null;
  onRetry?: () => Promise<unknown>;
  onClearError?: () => void;
  currentProgress?: TutorialProgress | null;
  className?: string;
}

function TutorialStepDots({
  total,
  currentIndex,
  className,
}: {
  total: number;
  currentIndex: number;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      role="group"
      aria-label={`Tutorial progress: step ${currentIndex + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <span
            key={`tutorial-step-dot-${index}`}
            aria-hidden={!isCurrent}
            className={cn(
              'rounded-full transition-all duration-300',
              isCurrent
                ? 'h-2.5 w-6 bg-primary'
                : isComplete
                  ? 'h-2 w-2 bg-primary/55'
                  : 'h-2 w-2 bg-muted-foreground/25',
            )}
          />
        );
      })}
    </div>
  );
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = React.memo(({
  isVisible,
  onClose,
  onComplete,
  onTabChange,
  error,
  onRetry,
  onClearError,
  currentProgress: propCurrentProgress,
  className,
}) => {
  const { user } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [currentStepConfig, setCurrentStepConfig] = useState<TutorialStepConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<Element[]>([]);
  const [showContextualHelp, setShowContextualHelp] = useState(false);
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allSteps = useMemo(() => tutorialManager.getAllSteps(), [tutorialManager]);

  const currentStepIndex = useMemo(() => {
    if (!currentStepConfig) return 0;
    return allSteps.findIndex((step) => step.id === currentStepConfig.id);
  }, [currentStepConfig, allSteps]);

  const progressPercentage = useMemo(() => {
    if (!currentProgress || allSteps.length === 0) return 0;
    const completedCount = currentProgress.completed_steps?.length || 0;
    return Math.round((completedCount / allSteps.length) * 100);
  }, [currentProgress, allSteps.length]);

  useEffect(() => {
    if (!isVisible) return;

    if (propCurrentProgress) {
      setCurrentProgress(propCurrentProgress);

      if (propCurrentProgress.current_step) {
        const stepConfig = tutorialManager.getStepConfig(propCurrentProgress.current_step);
        setCurrentStepConfig(stepConfig);

        if (stepConfig?.targetTab !== undefined) {
          const tabTimeout = setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('tutorialTabChange', {
                detail: { tabIndex: stepConfig.targetTab },
              }),
            );
            if (onTabChange && stepConfig.targetTab !== undefined) {
              onTabChange(stepConfig.targetTab);
            }
          }, 300);
          timeoutRef.current = tabTimeout;
        }
      }
      setIsLoading(false);
    } else if (user?.id) {
      const initializeProgress = async () => {
        setIsLoading(true);
        try {
          const result = await tutorialManager.initializeTutorial(user.id);
          if (result.success && result.data) {
            setCurrentProgress(result.data);
            const stepConfig = tutorialManager.getStepConfig(result.data.current_step);
            setCurrentStepConfig(stepConfig);
          }
        } catch (initError) {
          console.warn('Tutorial initialization failed:', initError);
        } finally {
          setIsLoading(false);
        }
      };

      void initializeProgress();
    }
  }, [isVisible, propCurrentProgress, user?.id, tutorialManager, onTabChange]);

  useEffect(() => {
    if (!currentStepConfig?.targetElements) {
      setHighlightedElements([]);
      return;
    }

    const highlightElements = () => {
      const elements: Element[] = [];

      currentStepConfig.targetElements?.forEach((selector) => {
        try {
          const found = document.querySelectorAll(selector);
          elements.push(...Array.from(found));
        } catch (selectorError) {
          console.warn(`Invalid selector: ${selector}`, selectorError);
        }
      });

      setHighlightedElements(elements);
      elements.forEach((el) => {
        el.classList.add('tutorial-highlight');
      });
    };

    const timeout = setTimeout(highlightElements, 500);
    timeoutRef.current = timeout;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      highlightedElements.forEach((el) => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStepConfig?.targetElements]);

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
    } catch (advanceError) {
      console.error('Error advancing to next step:', advanceError);
    }
  }, [user?.id, currentStepConfig, tutorialManager, onComplete]);

  useEffect(() => {
    if (!user?.id || !currentStepConfig) return;

    const checkActionStatus = async () => {
      if (currentStepConfig.interactiveMode && currentStepConfig.waitForAction) {
        setIsWaitingForAction(true);

        const actionStatus = await tutorialManager.checkStepActionCompletion(user.id);
        setActionCompleted(actionStatus.actionCompleted);

        if (actionStatus.actionCompleted) {
          setIsWaitingForAction(false);
          const advanceTimeout = setTimeout(() => {
            void handleNextStep();
          }, 1500);
          timeoutRef.current = advanceTimeout;
        }
      } else {
        setIsWaitingForAction(false);
        setActionCompleted(true);
      }
    };

    void checkActionStatus();
  }, [user?.id, currentStepConfig, tutorialManager, handleNextStep]);

  const handlePreviousStep = useCallback(async () => {
    if (!currentProgress || currentStepIndex <= 0) return;

    const previousStepConfig = allSteps[currentStepIndex - 1];
    if (previousStepConfig) {
      setCurrentStepConfig(previousStepConfig);

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
    } catch (skipError) {
      console.error('Error skipping step:', skipError);
    }
  }, [user?.id, currentStepConfig, tutorialManager, handleNextStep]);

  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    setRetrying(true);
    try {
      await onRetry();
      onClearError?.();
    } catch (retryError) {
      console.error('Error retrying step:', retryError);
    } finally {
      setRetrying(false);
    }
  }, [onRetry, onClearError]);

  const handleSkipTutorial = useCallback(async () => {
    if (!user?.id) return;

    try {
      await tutorialManager.skipTutorial(user.id);
      onClose();
    } catch (skipTutorialError) {
      console.error('Error skipping tutorial:', skipTutorialError);
    }
  }, [user?.id, tutorialManager, onClose]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
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
            void handleNextStep();
          }
          break;
        case 'ArrowLeft':
          void handlePreviousStep();
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.altKey) {
            event.preventDefault();
            void handleSkipStep();
          }
          break;
        case 'r':
        case 'R':
          if ((event.ctrlKey || event.altKey) && onRetry) {
            event.preventDefault();
            void handleRetry();
          }
          break;
        case 'h':
        case 'H':
          if (event.ctrlKey || event.altKey) {
            event.preventDefault();
            setShowContextualHelp((prev) => !prev);
          }
          break;
        case '?':
          setShowKeyboardHelp((prev) => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isVisible,
    isWaitingForAction,
    actionCompleted,
    error,
    onClose,
    onClearError,
    onRetry,
    handleNextStep,
    handlePreviousStep,
    handleSkipStep,
    handleRetry,
  ]);

  useEffect(() => {
    if (isVisible && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isVisible, currentStepConfig]);

  if (!isVisible || !currentStepConfig) return null;

  const panelMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isMobile
      ? {
          initial: { y: '100%', opacity: 0.85 },
          animate: { y: 0, opacity: 1 },
          exit: { y: '100%', opacity: 0 },
          transition: { type: 'spring' as const, stiffness: 420, damping: 38 },
        }
      : {
          initial: { scale: 0.94, opacity: 0, y: 12 },
          animate: { scale: 1, opacity: 1, y: 0 },
          exit: { scale: 0.96, opacity: 0, y: 8 },
          transition: { type: 'spring' as const, stiffness: 380, damping: 32 },
        };

  const isLastStep = currentStepIndex === allSteps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-50 bg-black/55 backdrop-blur-sm',
          isMobile ? 'flex flex-col justify-end' : 'flex items-center justify-center p-4 sm:p-6',
          className,
        )}
        role="presentation"
      >
        <motion.button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close tutorial backdrop"
          onClick={onClose}
          tabIndex={-1}
        />

        <motion.div
          ref={panelRef}
          {...panelMotion}
          role="region"
          aria-labelledby="tutorial-title"
          aria-describedby="tutorial-description"
          tabIndex={-1}
          className={cn(
            'relative z-10 flex w-full flex-col overflow-hidden outline-none',
            'border border-border/80 bg-background/98 shadow-2xl backdrop-blur-xl',
            isMobile
              ? 'max-h-[65vh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
              : 'max-h-[min(88vh,720px)] max-w-lg rounded-2xl',
          )}
        >
          {isMobile ? (
            <div
              className="mx-auto mt-2 mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
              aria-hidden
            />
          ) : null}

          <header className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 sm:h-16 sm:w-16">
                  <InteractiveStu
                    size="sm"
                    className="h-11 w-11 sm:h-12 sm:w-12"
                    enableTTS={false}
                    showSpeechBubble={false}
                    messages={[currentStepConfig.stuMessage]}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Step {currentStepIndex + 1} of {allSteps.length}
                </p>
                <h2
                  id="tutorial-title"
                  className="mt-1 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl"
                >
                  {currentStepConfig.title}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close tutorial"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div
              id="tutorial-description"
              className="relative mt-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 before:absolute before:-top-2 before:left-8 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-border/60 before:bg-muted/40"
            >
              <p className="text-base leading-relaxed text-foreground">
                {currentStepConfig.stuMessage}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <TutorialStepDots
                total={allSteps.length}
                currentIndex={currentStepIndex}
              />
              <Progress
                value={progressPercentage}
                className="h-1.5"
                aria-label={`Tutorial progress: ${progressPercentage}%`}
              />
              <p className="text-center text-xs text-muted-foreground">
                {currentProgress?.completed_steps?.length || 0} of {allSteps.length} steps
                completed
              </p>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">{error.message}</span>
                  <div className="flex gap-2">
                    {onRetry && error.retryable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRetry()}
                        disabled={retrying}
                      >
                        <RefreshCw
                          className={cn('mr-1 h-3 w-3', retrying && 'animate-spin')}
                        />
                        Retry
                      </Button>
                    ) : null}
                    {onClearError ? (
                      <Button type="button" variant="outline" size="sm" onClick={onClearError}>
                        Dismiss
                      </Button>
                    ) : null}
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            {isWaitingForAction && currentStepConfig.actionInstructions ? (
              <div className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {actionCompleted ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {actionCompleted ? 'Great job!' : 'Try this on your dashboard'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {actionCompleted
                        ? 'Moving to the next step…'
                        : currentStepConfig.actionInstructions}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {showContextualHelp && currentStepConfig.contextualHelp ? (
              <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Helpful tip</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {currentStepConfig.contextualHelp.message}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {showKeyboardHelp ? (
              <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Keyboard shortcuts
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <kbd className="rounded bg-muted px-1.5 py-0.5">→</kbd> or{' '}
                    <kbd className="rounded bg-muted px-1.5 py-0.5">Enter</kbd> — Next
                  </div>
                  <div>
                    <kbd className="rounded bg-muted px-1.5 py-0.5">←</kbd> — Previous
                  </div>
                  <div>
                    <kbd className="rounded bg-muted px-1.5 py-0.5">Ctrl+S</kbd> — Skip step
                  </div>
                  <div>
                    <kbd className="rounded bg-muted px-1.5 py-0.5">Ctrl+Esc</kbd> — Close
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-border/60 px-4 py-4 sm:px-6">
            <div
              className={cn(
                'flex gap-2',
                isMobile ? 'flex-col-reverse' : 'flex-row items-center justify-between',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2',
                  isMobile && 'justify-between',
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  size={isMobile ? 'default' : 'sm'}
                  onClick={() => void handlePreviousStep()}
                  disabled={currentStepIndex <= 0 || isLoading}
                  className={cn(isMobile && 'h-11 flex-1')}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                {!isMobile && currentStepConfig.contextualHelp ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContextualHelp((prev) => !prev)}
                    title="Toggle helpful tip (Ctrl+H)"
                  >
                    <HelpCircle className="mr-1 h-3 w-3" />
                    {showContextualHelp ? 'Hide tip' : 'Tip'}
                  </Button>
                ) : null}
                {!isMobile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardHelp((prev) => !prev)}
                    title="Keyboard shortcuts (?)"
                    aria-label="Show keyboard shortcuts"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              <div
                className={cn(
                  'flex flex-col gap-2',
                  isMobile ? 'w-full' : 'items-end',
                )}
              >
                <div className={cn('flex gap-2', isMobile && 'w-full')}>
                  {currentStepConfig.skipAllowed ? (
                    <Button
                      type="button"
                      variant="outline"
                      size={isMobile ? 'default' : 'sm'}
                      onClick={() => void handleSkipStep()}
                      disabled={isLoading}
                      className={cn(!isMobile && 'text-xs')}
                    >
                      <SkipForward className="mr-1 h-3 w-3" />
                      Skip step
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={
                      !isWaitingForAction || actionCompleted
                        ? () => void handleNextStep()
                        : undefined
                    }
                    disabled={isLoading || (isWaitingForAction && !actionCompleted)}
                    size={isMobile ? 'lg' : 'sm'}
                    className={cn(
                      'font-semibold',
                      isMobile ? 'h-12 min-h-12 flex-1 text-base' : 'min-w-[7rem]',
                    )}
                  >
                    {isWaitingForAction && !actionCompleted ? (
                      'Waiting…'
                    ) : isLastStep ? (
                      'Finish tutorial'
                    ) : (
                      <>
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSkipTutorial()}
                  className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Skip tutorial
                </button>
              </div>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

TutorialOverlay.displayName = 'TutorialOverlay';
