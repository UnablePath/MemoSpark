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
  className?: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = React.memo(({
  isVisible,
  onClose,
  onComplete,
  className
}) => {
  const { user } = useUser();
  const tutorialManager = useMemo(() => TutorialManager.getInstance(), []);
  const [currentProgress, setCurrentProgress] = useState<TutorialProgress | null>(null);
  const [currentStepConfig, setCurrentStepConfig] = useState<TutorialStepConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<Element[]>([]);
  const [showContextualHelp, setShowContextualHelp] = useState(false);

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
        }
      } catch (error) {
        console.error('Error loading tutorial progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user?.id, isVisible, tutorialManager]);

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
      }
    }
  }, [user?.id, currentProgress, tutorialManager, onComplete]);

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
      }
    }
  }, [user?.id, tutorialManager]);

  // Calculate progress percentage - memoized for performance
  const progressPercentage = useMemo(() => {
    return currentProgress?.completed_steps.length 
      ? (currentProgress.completed_steps.length / allSteps.length) * 100
      : 0;
  }, [currentProgress?.completed_steps.length, allSteps.length]);

  // Get current step index - memoized for performance
  const currentStepIndex = useMemo(() => {
    return currentStepConfig 
      ? allSteps.findIndex(step => step.id === currentStepConfig.id)
      : 0;
  }, [currentStepConfig, allSteps]);

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

      {/* Tutorial Card - Moved up and to the left */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          "fixed z-50 top-[35%] left-[40%] -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-2xl mx-4",
          className
        )}
      >
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border shadow-2xl">
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
                  <CardTitle className="text-xl">{currentStepConfig.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Step {currentStepIndex + 1} of {allSteps.length}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {currentProgress.completed_steps.length} of {allSteps.length} steps completed
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Stu's Message */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🐨</div>
                <div>
                  <p className="text-sm font-medium text-primary">Stu says:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentStepConfig.stuMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Description */}
            <div>
              <p className="text-sm leading-relaxed">{currentStepConfig.description}</p>
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
                    <div className="text-blue-500 text-sm">💡</div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {currentStepConfig.contextualHelp.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={restartTutorial}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restart
                </Button>
                <Button variant="outline" size="sm" onClick={skipTutorial}>
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip Tutorial
                </Button>
              </div>

              <div className="flex gap-2">
                {currentStepConfig.skipAllowed && (
                  <Button variant="ghost" size="sm" onClick={skipStep}>
                    Skip Step
                  </Button>
                )}
                <Button onClick={advanceStep} size="sm">
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