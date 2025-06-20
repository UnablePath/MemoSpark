'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InteractiveStu } from '@/components/stu/InteractiveStu';
import { TutorialManager, type TutorialStep, type TutorialProgress, type TutorialStepConfig } from '@/lib/tutorial';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronLeft, SkipForward, RotateCcw } from 'lucide-react';

interface TutorialOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onTabChange?: (tabIndex: number) => void;
  className?: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = React.memo(({
  isVisible,
  onClose,
  onComplete,
  onTabChange,
  className
}) => {
  const { user } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [currentStepConfig, setCurrentStepConfig] = useState<TutorialStepConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<Element[]>([]);
  const [showContextualHelp, setShowContextualHelp] = useState(false);
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  // Memoize all steps to prevent recalculations
  const allSteps = useMemo(() => tutorialManager.getAllSteps(), [tutorialManager]);

  // Load tutorial progress
  useEffect(() => {
    if (!user?.id || !isVisible) return;

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        let progress = await tutorialManager.getTutorialProgress(user.id);
        
        if (!progress) {
          progress = await tutorialManager.initializeTutorial(user.id);
        }
        
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
        console.error('Error loading tutorial progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user?.id, isVisible, tutorialManager, onTabChange]);

  // Check if current step requires user action
  useEffect(() => {
    if (!user?.id || !currentStepConfig) return;

    const checkActionRequirement = async () => {
      if (currentStepConfig.interactiveMode && currentStepConfig.waitForAction) {
        const { actionCompleted } = await tutorialManager.checkStepActionCompletion(user.id);
        
        if (!actionCompleted) {
          setIsWaitingForAction(true);
          setActionCompleted(false);
        } else {
          setIsWaitingForAction(false);
          setActionCompleted(true);
        }
      } else {
        setIsWaitingForAction(false);
        setActionCompleted(false);
      }
    };

    checkActionRequirement();
  }, [user?.id, currentStepConfig, tutorialManager]);

  // Handle step advancement
  const advanceStep = useCallback(async () => {
    if (!user?.id || !currentProgress?.current_step) return;

    const success = await tutorialManager.advanceToNextStep(user.id, currentProgress.current_step);
    
    if (success) {
      const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
      setCurrentProgress(updatedProgress);
      
      if (updatedProgress?.current_step) {
        if (updatedProgress.current_step === 'completion') {
          // Tutorial completed
          onComplete();
          return;
        }
        
        const stepConfig = tutorialManager.getStepConfig(updatedProgress.current_step);
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
    }
  }, [user?.id, currentProgress, tutorialManager, onComplete, onTabChange]);

  // Listen for action completion events
  useEffect(() => {
    const handleActionCompleted = async () => {
      if (!user?.id || !currentStepConfig) return;
      
      if (currentStepConfig.interactiveMode && currentStepConfig.waitForAction) {
        const { actionCompleted } = await tutorialManager.checkStepActionCompletion(user.id);
        
        if (actionCompleted) {
          setActionCompleted(true);
          setIsWaitingForAction(false);
          
          // Auto-advance to next step after a short delay
          setTimeout(() => {
            advanceStep();
          }, 1500);
        }
      }
    };

    window.addEventListener('tutorialActionCompleted', handleActionCompleted);
    
    return () => {
      window.removeEventListener('tutorialActionCompleted', handleActionCompleted);
    };
  }, [user?.id, currentStepConfig, tutorialManager, advanceStep]);

  // Highlight target elements with performance optimization
  useEffect(() => {
    if (!currentStepConfig?.targetElements) {
      setHighlightedElements([]);
      return;
    }

    // Use requestAnimationFrame for smooth performance
    const updateHighlights = () => {
      const elements: Element[] = [];
      currentStepConfig.targetElements?.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          elements.push(element);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      setHighlightedElements(elements);
    };

    requestAnimationFrame(updateHighlights);

    // Show contextual help after a delay
    const helpTimeout = setTimeout(() => setShowContextualHelp(true), 1000);

    return () => {
      setHighlightedElements([]);
      setShowContextualHelp(false);
      clearTimeout(helpTimeout);
    };
  }, [currentStepConfig]);



  // Handle step skip
  const skipStep = useCallback(async () => {
    if (!user?.id || !currentProgress?.current_step) return;

    const success = await tutorialManager.skipStep(user.id, currentProgress.current_step);
    
    if (success) {
      const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
      setCurrentProgress(updatedProgress);
      
      if (updatedProgress?.current_step) {
        if (updatedProgress.current_step === 'completion') {
          onComplete();
          return;
        }
        
        const stepConfig = tutorialManager.getStepConfig(updatedProgress.current_step);
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
    }
  }, [user?.id, currentProgress, tutorialManager, onComplete]);

  // Handle tutorial skip
  const skipTutorial = useCallback(async () => {
    if (!user?.id) return;

    const success = await tutorialManager.skipTutorial(user.id);
    if (success) {
      onComplete();
    }
  }, [user?.id, tutorialManager, onComplete]);

  // Handle tutorial restart
  const restartTutorial = useCallback(async () => {
    if (!user?.id) return;

    const success = await tutorialManager.restartTutorial(user.id);
    if (success) {
      const updatedProgress = await tutorialManager.getTutorialProgress(user.id);
      setCurrentProgress(updatedProgress);
      
      if (updatedProgress?.current_step) {
        const stepConfig = tutorialManager.getStepConfig(updatedProgress.current_step);
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
    }
  }, [user?.id, tutorialManager, onTabChange]);

  // Get current step index - memoized for performance
  const currentStepIndex = useMemo(() => {
    return currentStepConfig 
      ? allSteps.findIndex(step => step.id === currentStepConfig.id)
      : 0;
  }, [currentStepConfig, allSteps]);

  // Calculate progress percentage - memoized for performance
  const progressPercentage = useMemo(() => {
    return currentStepIndex >= 0 
      ? (currentStepIndex / allSteps.length) * 100
      : 0;
  }, [currentStepIndex, allSteps.length]);

  // Memoize animation variants for performance
  const cardVariants = useMemo(() => ({
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 }
  }), []);

  const backdropVariants = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }), []);

  if (!isVisible || isLoading || !currentStepConfig || !currentProgress) {
    return null;
  }

  // If in interactive mode and waiting for action, show minimal overlay
  if (isWaitingForAction && !actionCompleted) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50 max-w-xs"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {currentStepConfig.actionInstructions || 'Complete the action to continue'}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={skipStep}
                className="text-xs text-white/80 hover:text-white underline"
              >
                Next Step
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      {/* Backdrop with highlighted elements */}
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          // Only close if clicking the backdrop, not highlighted elements
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />

      {/* Tutorial Card - Mobile responsive positioning */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          "fixed z-50",
          // Better mobile positioning - avoid going off screen
          "top-2 left-2 right-2",
          "sm:top-[20%] sm:left-[50%] sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/4",
          "w-auto sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-xl lg:max-w-2xl",
          "max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto",
          className
        )}
      >
        <Card className="bg-background/95 dark:bg-background/95 backdrop-blur-md border border-border shadow-2xl">
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
                  <CardTitle className="text-lg sm:text-xl text-foreground">{currentStepConfig.title}</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground">
                    Step {currentStepIndex + 1} of {allSteps.length}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {currentStepIndex} of {allSteps.length} steps completed
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Stu's Message */}
            <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🐨</div>
                <div>
                  <p className="text-sm sm:text-base font-medium text-primary">Stu says:</p>
                  <p className="text-sm sm:text-base text-foreground/80 mt-1">
                    {currentStepConfig.stuMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Description */}
            <div>
              <p className="text-sm sm:text-base leading-relaxed text-foreground">{currentStepConfig.description}</p>
            </div>

            {/* Contextual Help */}
            <AnimatePresence mode="wait">
              {showContextualHelp && currentStepConfig.contextualHelp && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-blue-500 dark:text-blue-400 text-base">💡</div>
                    <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300">
                      {currentStepConfig.contextualHelp.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-border gap-3 sm:gap-2">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={restartTutorial} className="flex-1 sm:flex-initial border-border text-foreground hover:bg-muted">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restart
                </Button>
                <Button variant="outline" size="sm" onClick={skipTutorial} className="flex-1 sm:flex-initial border-border text-foreground hover:bg-muted">
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip Tutorial
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {currentStepConfig.skipAllowed && (
                  <Button variant="ghost" size="sm" onClick={skipStep} className="flex-1 sm:flex-initial text-foreground hover:bg-muted">
                    Next Step
                  </Button>
                )}
                <Button onClick={advanceStep} size="sm" className="flex-1 sm:flex-initial bg-primary text-primary-foreground hover:bg-primary/90">
                  {currentStepConfig.id === 'completion' ? 'Finish' : 'Next'}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Element Highlights - Optimized rendering */}
      <AnimatePresence mode="popLayout">
        {highlightedElements.map((element, index) => {
          const rect = element.getBoundingClientRect();
          return (
            <motion.div
              key={`${element.tagName}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed z-45 pointer-events-none"
              style={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
              }}
            >
              <div className="w-full h-full border-2 border-primary rounded-lg bg-primary/10 animate-pulse" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </>
  );
}); 