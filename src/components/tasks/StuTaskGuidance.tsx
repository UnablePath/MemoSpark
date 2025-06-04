'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { KoalaMascot } from '@/components/ui/koala-mascot';
import { cn } from '@/lib/utils';
import type { ExtendedTask } from '@/types/ai';
import { 
  type UserContext, 
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
    const replacements: { [key: string]: string | number } = {};
    
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
    
    setTimeout(() => {
      setStuAnimation('idle');
    }, 3000);

    setTimeout(() => {
      setShowMessage(false);
      setStuMessageForSR(''); // Clear screen reader message
    }, 6000);
  }, [getPersonalizedMessage, localUserContext.stuPreferences.messageFrequency]);

  // Show celebration message when task is completed
  const showCelebrationMessage = useCallback(() => {
    const message = getRandomMessage('celebration');
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    triggerCelebration();
    
    setTimeout(() => {
      setShowMessage(false);
      setStuMessageForSR(''); // Clear screen reader message
    }, 4000);
  }, [triggerCelebration]);

  const handleMascotClick = () => {
    if (showMessage) return;
    
    const encouragementMessage = getRandomMessage('encouragement');
    setStuMessage(encouragementMessage);
    setStuMessageForSR(encouragementMessage);
    setShowMessage(true);
    setStuAnimation('excited');
    
    setTimeout(() => {
      setStuAnimation('idle');
    }, 2000);

    setTimeout(() => {
      setShowMessage(false);
      setStuMessageForSR(''); // Clear screen reader message
    }, 4000);
    
    onGuidanceAction?.('mascot_clicked');
  };

  const handleMessageClick = () => {
    setShowMessage(false);
    setStuMessageForSR(''); // Clear screen reader message
    onGuidanceAction?.('message_dismissed');
  };

  const getRandomMessage = (category: keyof typeof stuMessages) => {
    const messages = stuMessages[category];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'floating':
        return {
          container: "fixed top-4 right-4 z-50",
          bubble: "absolute top-full right-0 mt-2"
        };
      case 'corner':
        return {
          container: "absolute top-0 right-0",
          bubble: "absolute top-full right-0 mt-2"
        };
      case 'embedded':
      default:
        return {
          container: "relative",
          bubble: "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20"
        };
    }
  };

  const positionStyles = getPositionStyles();

  if (!stuReady && position !== 'embedded') {
    // For non-embedded, delay rendering until Stu is ready to avoid layout shifts
    return null;
  }
  
  return (
    <div className={cn("flex flex-col items-center", positionStyles.container, className)}>
      {/* ARIA Live Region for Stu's guidance messages */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
        id={`stu-guidance-${currentStep}`}
      >
        {stuMessageForSR}
      </div>

      {/* Interactive Stu Mascot */}
      <Button
        variant="ghost"
        className={cn(
          "rounded-full p-1 hover:bg-accent transition-colors",
          config.container,
          "focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
        onClick={handleMascotClick}
        aria-label={`Stu guidance for ${currentStep} step. Click for tips and encouragement.`}
        aria-describedby={`stu-guidance-${currentStep}`}
      >
        <motion.div
          variants={getDynamicKoalaVariants()}
          animate={celebrationActive ? 'celebrating' : stuAnimation}
          className="flex items-center justify-center"
        >
          <KoalaMascot
            size={size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm'}
            className="drop-shadow-sm"
            aria-hidden="true"
          />
        </motion.div>
      </Button>

      {/* Message Bubble */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-background border shadow-lg rounded-lg p-3 text-sm text-center",
              config.bubble,
              positionStyles.bubble
            )}
            role="tooltip"
            aria-live="assertive"
            aria-atomic="true"
          >
            <button
              onClick={handleMessageClick}
              className="text-left hover:bg-accent/50 rounded p-1 transition-colors w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              aria-label={`Stu says: ${stuMessage}. Click to dismiss.`}
            >
              {stuMessage}
            </button>
            
            {/* Small arrow pointing to mascot */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background border-l border-t rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      <KoalaMascot size="xs" />
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