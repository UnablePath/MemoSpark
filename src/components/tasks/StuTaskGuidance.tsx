'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { KoalaMascot } from '@/components/ui/koala-mascot';
import { cn } from '@/lib/utils';
import type { ExtendedTask } from '@/types/ai';
import { 
  UserContext, 
  getContextualMessage, 
  loadUserContext, 
  saveUserContext, 
  updateUserContext 
} from '@/lib/userContext';

// Context-aware guidance messages for different steps
const stuMessages = {
  quickCapture: [
    "Let's create a great task! What would you like to work on?",
    "I'm here to help you stay organized! Tell me about your task.",
    "What's on your mind today? Let's turn it into an actionable task!",
    "Ready to be productive? Let's start with the basics!",
  ],
  aiSuggestions: [
    "Check out these smart suggestions I found for you!",
    "These recommendations are based on your study patterns!",
    "I analyzed your habits and found some helpful tips!",
    "Here are some ways to make your task even better!",
  ],
  details: [
    "Let's add some details to make this task perfect!",
    "Great progress! Just a few more details to go.",
    "Almost done! These details will help you succeed.",
    "You're doing great! Let's fine-tune your task.",
  ],
  encouragement: [
    "You're building great study habits! Keep it up!",
    "I believe in you! You've got this!",
    "Every task completed is a step towards your goals!",
    "You're on fire! Keep that momentum going!",
  ],
  celebration: [
    "Fantastic! Your task is ready to go!",
    "Well done! That's a perfectly crafted task!",
    "Excellent work! Time to achieve your goals!",
    "Amazing! You're becoming a task management pro!",
  ]
};

interface StuTaskGuidanceProps {
  currentStep: 'quickCapture' | 'aiSuggestions' | 'details' | 'completed';
  taskData?: Partial<ExtendedTask>;
  userContext?: UserContext;
  onGuidanceAction?: (action: string) => void;
  onContextUpdate?: (context: UserContext) => void;
  size?: 'sm' | 'md' | 'lg';
  position?: 'floating' | 'embedded' | 'corner';
  className?: string;
}

export const StuTaskGuidance: React.FC<StuTaskGuidanceProps> = ({
  currentStep,
  taskData,
  userContext,
  onGuidanceAction,
  onContextUpdate,
  size = 'md',
  position = 'embedded',
  className
}) => {
  const [showMessage, setShowMessage] = useState(false);
  const [stuMessage, setStuMessage] = useState('');
  const [stuMessageForSR, setStuMessageForSR] = useState('');
  const [stuAnimation, setStuAnimation] = useState<'idle' | 'talking' | 'excited' | 'thinking' | 'celebrating' | 'sleeping'>('idle');
  const [stuReady, setStuReady] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [localUserContext, setLocalUserContext] = useState<UserContext>(() => 
    userContext || loadUserContext()
  );
  const prefersReducedMotion = useReducedMotion();

  // Size configurations
  const sizeConfig = {
    sm: { mascot: 40, container: 'w-12 h-12', bubble: 'max-w-xs' },
    md: { mascot: 60, container: 'w-16 h-16', bubble: 'max-w-sm' },
    lg: { mascot: 80, container: 'w-20 h-20', bubble: 'max-w-md' }
  };

  const config = sizeConfig[size];

  // Enhanced animation variants for Stu with celebration effects
  const koalaVariants = {
    idle: {
      y: [0, -2, 0],
      transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as const }
    },
    talking: {
      y: [0, -5, 0, -3, 0],
      transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as const }
    },
    excited: {
      y: [0, -10, 0, -8, 0],
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 0.5, repeat: 3, repeatType: "loop" as const }
    },
    celebrating: {
      scale: [1, 1.3, 1.1, 1.3, 1],
      rotate: [0, -10, 10, -5, 0],
      y: [0, -15, 0, -10, 0],
      transition: { duration: 2, repeat: 2, repeatType: "loop" as const }
    },
    thinking: {
      rotate: [-3, 3, -3],
      y: [0, -2, 0],
      transition: { duration: 1.5, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as const }
    },
    sleeping: {
      y: 0,
      rotate: [0, 2, 0],
      transition: { duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as const }
    },
    loading: {
      opacity: [0.3, 1],
      scale: [0.9, 1],
      transition: { duration: 1, repeat: 0 }
    }
  };

  // Reduced motion variants
  const getDynamicKoalaVariants = () => {
    if (prefersReducedMotion) {
      return {
        idle: { opacity: 1 },
        talking: { opacity: 1 },
        excited: { 
          scale: [1, 1.05, 1],
          transition: { duration: 0.3, repeat: 1 }
        },
        sleeping: { opacity: 0.7 },
        loading: { opacity: [0.3, 1], scale: [0.9, 1], transition: { duration: 0.5 } }
      };
    }
    return koalaVariants;
  };

  // Celebration effects with confetti
  const triggerCelebration = useCallback(async () => {
    if (!localUserContext.stuPreferences.showCelebrations) return;
    
    try {
      const confetti = await import('canvas-confetti');
      confetti.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac'] // StudySpark green variants
      });
    } catch (error) {
      console.warn('Failed to load confetti:', error);
    }
    
    setCelebrationActive(true);
    setStuAnimation('celebrating');
    
    setTimeout(() => {
      setCelebrationActive(false);
      setStuAnimation('idle');
    }, 4000);
  }, [localUserContext.stuPreferences.showCelebrations]);

  // Context-aware message selection
  const getPersonalizedMessage = useCallback((step: string) => {
    const context = localUserContext;
    const currentHour = new Date().getHours();
    
    // Determine message subcategory based on context
    let subcategory = 'returning'; // default
    let replacements: { [key: string]: string | number } = {};
    
    if (step === 'quickCapture') {
      if (context.isFirstTimeUser || context.totalTasks === 0) {
        subcategory = 'firstTime';
      } else if (context.currentStreak >= 3) {
        subcategory = 'streak';
        replacements.days = context.currentStreak;
      } else if (context.tasksCompletedToday >= 3) {
        subcategory = 'productive';
        replacements.count = context.tasksCompletedToday + 1;
      } else if (currentHour < 10) {
        subcategory = 'morning';
      } else if (currentHour >= 18) {
        subcategory = 'evening';
      }
    } else if (step === 'aiSuggestions') {
      const avgConfidence = context.averageSuggestionConfidence;
      if (avgConfidence >= 0.8) {
        subcategory = 'highConfidence';
      } else if (avgConfidence >= 0.6) {
        subcategory = 'mediumConfidence';
      } else if (avgConfidence >= 0.3) {
        subcategory = 'lowConfidence';
      } else {
        subcategory = 'noSuggestions';
      }
    }
    
    return getContextualMessage(step, subcategory, context, replacements);
  }, [localUserContext]);

  // Initialize Stu
  useEffect(() => {
    const timer = setTimeout(() => {
      setStuReady(true);
      setStuAnimation('idle');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Update local context when prop changes
  useEffect(() => {
    if (userContext) {
      setLocalUserContext(userContext);
    }
  }, [userContext]);

  // Auto-show contextual message based on step changes
  useEffect(() => {
    if (stuReady && currentStep !== 'completed') {
      showContextualTip(currentStep);
    }
  }, [currentStep, stuReady, getPersonalizedMessage]);

  // Show celebration message when task is completed
  useEffect(() => {
    if (currentStep === 'completed') {
      showCelebrationMessage();
    }
  }, [currentStep, triggerCelebration]);

  // Enhanced contextual tip with personalized messaging
  const showContextualTip = useCallback((step: 'quickCapture' | 'aiSuggestions' | 'details') => {
    const message = getPersonalizedMessage(step) || getRandomMessage(step);
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    
    // Use different animations based on message frequency preference
    if (localUserContext.stuPreferences.messageFrequency === 'frequent') {
      setStuAnimation('excited');
    } else {
      setStuAnimation('talking');
    }

    // Hide message after a delay, unless high interactivity is preferred
    if ((localUserContext.stuPreferences.messageDuration || 'medium') !== 'long') {
      const duration = (localUserContext.stuPreferences.messageDuration || 'medium') === 'medium' ? 8000 : 5000;
      setTimeout(() => {
        setShowMessage(false);
        setStuAnimation('idle');
      }, duration);
    }
  }, [getPersonalizedMessage, localUserContext.stuPreferences.messageFrequency, localUserContext.stuPreferences.messageDuration]);

  const showCelebrationMessage = useCallback(() => {
    const message = getRandomMessage('celebration');
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    triggerCelebration(); // Trigger confetti and animation

    if ((localUserContext.stuPreferences.messageDuration || 'medium') !== 'long') {
      setTimeout(() => {
        setShowMessage(false);
        setStuAnimation('idle');
      }, 8000);
    }
  }, [triggerCelebration, localUserContext.stuPreferences.messageDuration]);

  const handleMascotClick = () => {
    if (currentStep === 'completed') {
      showCelebrationMessage();
    } else {
      showContextualTip(currentStep);
    }
    if (onGuidanceAction) onGuidanceAction('mascot_click');
  };
  
  const handleMessageClick = () => {
    setShowMessage(false);
    setStuAnimation('idle');
    if (onGuidanceAction) onGuidanceAction('message_dismiss');
  };

  // Helper to get a random message from a category
  const getRandomMessage = (category: keyof typeof stuMessages) => {
    const messages = stuMessages[category];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Dynamic styles based on position prop
  const getPositionStyles = () => {
    switch (position) {
      case 'floating':
        return 'fixed bottom-4 right-4 z-50';
      case 'corner':
        return 'absolute top-2 right-2 z-30';
      case 'embedded':
      default:
        return 'relative';
    }
  };

  if (!stuReady && position !== 'embedded') {
    // For non-embedded, delay rendering until Stu is ready to avoid layout shifts
    return null;
  }
  
  return (
    <motion.div 
      className={cn("flex items-end", getPositionStyles(), className)}
      initial={!prefersReducedMotion && position !== 'embedded' ? { opacity: 0, y: 20 } : false}
      animate={!prefersReducedMotion && position !== 'embedded' ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Screen reader only message announcement */}
      {stuMessageForSR && (
        <div className="sr-only" role="alert" aria-live="assertive">
          {`Stu says: ${stuMessageForSR}`}
        </div>
      )}

      {/* Message Bubble */}
      <motion.div
        initial={!prefersReducedMotion ? { opacity: 0, y: 10, scale: 0.9 } : { opacity: 0 }}
        animate={!prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
        exit={!prefersReducedMotion ? { opacity: 0, y: 10, scale: 0.9 } : { opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.3 }}
        className={cn(
          "absolute bottom-full mb-2 p-3 rounded-lg shadow-lg max-w-xs text-sm",
          "bg-background border border-border",
          "dark:bg-zinc-800 dark:border-zinc-700",
          config.bubble,
          position === 'corner' ? 'right-0' : 'left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0'
        )}
        style={{ pointerEvents: 'auto' }} // Ensure clicks are registered
        onClick={handleMessageClick}
        role="tooltip"
      >
        <p className="text-foreground dark:text-zinc-100">{stuMessage}</p>
        <div 
          className={cn(
            "absolute w-3 h-3 bg-background border-b border-r border-border transform rotate-45",
            "dark:bg-zinc-800 dark:border-zinc-700",
            position === 'corner' ? 'bottom-[-7px] right-4' : 'bottom-[-7px] left-1/2 -translate-x-1/2'
          )}
        />
        {(localUserContext.stuPreferences.messageDuration || 'medium') === 'long' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleMessageClick(); 
            }}
            className="mt-2 w-full text-xs"
          >
            Dismiss
          </Button>
        )}
      </motion.div>

      {/* Koala Mascot */}
      <motion.div
        className={cn("relative cursor-pointer", config.container)}
        variants={getDynamicKoalaVariants()}
        animate={celebrationActive ? 'celebrating' : stuAnimation} 
        initial={!prefersReducedMotion ? 'loading' : 'idle'}
        onClick={handleMascotClick}
        aria-label={`Stu the Koala, currently ${stuAnimation}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMascotClick(); }}
      >
        <KoalaMascot className="w-full h-full" />
        {celebrationActive && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0}}
            animate={{ opacity: 1}}
            exit={{ opacity: 0}}
          >
            {/* Simplified celebration particles for when canvas-confetti fails or is not desired */}
            {[...Array(5)].map((_, i) => (
              <motion.div 
                key={i}
                className="absolute bg-primary rounded-full"
                initial={{ opacity: 0, scale: 0, y:0, x:0}}
                animate={{
                  opacity: [0,1,0],
                  scale: [0,1,0],
                  y: [0, Math.random() * -80 - 20, Math.random() * -100 -50],
                  x: [0, Math.random() * 60 - 30, Math.random() * 80 - 40],
                }}
                transition={{
                  duration: Math.random() * 1 + 1,
                  delay: i * 0.1,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 2,
                }}
                style={{
                  width: Math.random()*8+4,
                  height: Math.random()*8+4,
                  left: '50%',
                  top: '50%',
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Minimal version for quick tips without full context or animation complexity
export const StuQuickGuidance: React.FC<{
  message?: string;
  onAction?: () => void;
}> = ({ message, onAction }) => {
  const prefersReducedMotion = useReducedMotion();
  if (!message) return null;

  return (
    <motion.div 
      className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary-foreground/80"
      initial={!prefersReducedMotion ? { opacity: 0, y: 5 } : false}
      animate={!prefersReducedMotion ? { opacity: 1, y: 0 } : false}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 5 }}
      transition={{ duration: 0.2 }}
    >
      <KoalaMascot className="w-6 h-6" />
      <span className="flex-1">{message}</span>
      {onAction && (
        <Button variant="ghost" size="sm" onClick={onAction} className="text-primary/70 hover:text-primary">
          Got it
        </Button>
      )}
    </motion.div>
  );
};

export default StuTaskGuidance; 