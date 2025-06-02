'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import KoalaMascot from '@/components/ui/koala-mascot';
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

    // Update context to track interaction
    const updatedContext = updateUserContext(localUserContext, 'taskCreated');
    setLocalUserContext(updatedContext);
    saveUserContext(updatedContext);
    onContextUpdate?.(updatedContext);

    setTimeout(() => {
      setStuAnimation('idle');
    }, 2000);

    setTimeout(() => {
      setShowMessage(false);
    }, localUserContext.stuPreferences.messageFrequency === 'minimal' ? 2000 : 4000);
  }, [getPersonalizedMessage, localUserContext, onContextUpdate]);

  // Enhanced celebration with context-aware messages
  const showCelebrationMessage = useCallback(() => {
    let celebrationCategory = 'general';
    let replacements: { [key: string]: string | number } = {};
    
    // Determine celebration type based on context
    if (localUserContext.totalTasks === 0) {
      celebrationCategory = 'firstTask';
    } else if (localUserContext.tasksCompletedToday >= 5) {
      celebrationCategory = 'weeklyMilestone';
      replacements.count = localUserContext.tasksCompletedToday;
    } else if (localUserContext.tasksCompletedToday >= 3) {
      celebrationCategory = 'dailyStreak';
      replacements.count = localUserContext.tasksCompletedToday;
    }
    
    const message = getContextualMessage('celebration', celebrationCategory, localUserContext, replacements) ||
                   getRandomMessage('celebration');
    
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    
    // Trigger celebration effects
    triggerCelebration();

    // Update context for task completion
    const updatedContext = updateUserContext(localUserContext, 'taskCompleted');
    setLocalUserContext(updatedContext);
    saveUserContext(updatedContext);
    onContextUpdate?.(updatedContext);

    setTimeout(() => {
      setShowMessage(false);
    }, 6000);
  }, [getPersonalizedMessage, localUserContext, onContextUpdate, triggerCelebration]);

  const getRandomMessage = (category: keyof typeof stuMessages) => {
    const messages = stuMessages[category];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handleStuClick = useCallback(() => {
    if (!stuReady) return;

    const message = getContextualMessage('encouragement', 'general', localUserContext) ||
                   getRandomMessage('encouragement');
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    setStuAnimation('excited');

    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setTimeout(() => {
      setStuAnimation('idle');
    }, 1500);

    setTimeout(() => {
      setShowMessage(false);
    }, 3000);

    onGuidanceAction?.('clicked');
  }, [stuReady, localUserContext, onGuidanceAction]);

  // Position-specific styling
  const getPositionStyles = () => {
    switch (position) {
      case 'floating':
        return 'fixed bottom-4 right-4 z-50';
      case 'corner':
        return 'absolute top-2 right-2 z-10';
      case 'embedded':
      default:
        return 'relative';
    }
  };

  return (
    <>
      {/* ARIA Live Region for Stu's messages */}
      <div aria-live="polite" className="sr-only">
        {stuMessageForSR}
      </div>

      <div className={cn(
        "flex flex-col items-center justify-center",
        getPositionStyles(),
        className
      )}>
        {/* Interactive Button for Stu */}
        <Button 
          variant="ghost" 
          className={cn(
            "p-0 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-transparent transition-all duration-200",
            config.container,
            celebrationActive && "ring-2 ring-primary/50 bg-primary/10 shadow-lg"
          )}
          onClick={handleStuClick} 
          aria-label={`Interact with Stu, your study mascot. You've completed ${localUserContext.totalTasks} tasks.`}
        >
          <motion.div 
            variants={getDynamicKoalaVariants()} 
            animate={stuReady ? stuAnimation : "loading"} 
            className={cn(
              "w-full h-full flex items-center justify-center cursor-pointer transition-all duration-200",
              celebrationActive && "filter drop-shadow-lg"
            )}
          >
            <KoalaMascot 
              size={config.mascot} 
              className={cn(
                "transition-all duration-200",
                stuAnimation === 'celebrating' && "animate-pulse"
              )}
            />
          </motion.div>
        </Button>

        {/* Celebration Effects Overlay */}
        {celebrationActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full animate-pulse" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-2xl animate-bounce">
              🎉✨🎊
            </div>
          </motion.div>
        )}

        {/* Stu's Message Bubble */}
        {showMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 5, scale: 0.95 }} 
            className={cn(
              "absolute w-auto p-3 bg-background border shadow-lg rounded-lg text-sm text-center z-20",
              config.bubble,
              // Position bubble based on component position
              position === 'floating' || position === 'corner' 
                ? "bottom-full right-0 mb-2" 
                : "bottom-full left-1/2 -translate-x-1/2 mb-2"
            )}
          >
            {/* Message bubble pointer */}
            <div 
              className={cn(
                "absolute w-3 h-3 bg-background border-r border-b rotate-45",
                position === 'floating' || position === 'corner'
                  ? "bottom-[-6px] right-4"
                  : "bottom-[-6px] left-1/2 -translate-x-1/2"
              )}
            />
            <p className="relative z-10 text-foreground font-medium">{stuMessage}</p>
          </motion.div>
        )}

        {/* Loading state message */}
        {!stuReady && size !== 'sm' && (
          <p className="text-xs text-muted-foreground mt-1 absolute bottom-[-20px] left-1/2 -translate-x-1/2 whitespace-nowrap">
            Stu is waking up...
          </p>
        )}
      </div>
    </>
  );
};

// Context-aware guidance component for different task creation scenarios
export const StuQuickGuidance: React.FC<{
  message?: string;
  onAction?: () => void;
}> = ({ message, onAction }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex-shrink-0">
        <KoalaMascot size={24} />
      </div>
      <p className="text-xs text-muted-foreground flex-1">
        {message || "💡 Tip: Be specific with your task title for better AI suggestions!"}
      </p>
      {onAction && (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onAction}
          className="text-xs h-6 px-2"
        >
          Got it
        </Button>
      )}
    </div>
  );
};

export default StuTaskGuidance; 

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import KoalaMascot from '@/components/ui/koala-mascot';
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

    // Update context to track interaction
    const updatedContext = updateUserContext(localUserContext, 'taskCreated');
    setLocalUserContext(updatedContext);
    saveUserContext(updatedContext);
    onContextUpdate?.(updatedContext);

    setTimeout(() => {
      setStuAnimation('idle');
    }, 2000);

    setTimeout(() => {
      setShowMessage(false);
    }, localUserContext.stuPreferences.messageFrequency === 'minimal' ? 2000 : 4000);
  }, [getPersonalizedMessage, localUserContext, onContextUpdate]);

  // Enhanced celebration with context-aware messages
  const showCelebrationMessage = useCallback(() => {
    let celebrationCategory = 'general';
    let replacements: { [key: string]: string | number } = {};
    
    // Determine celebration type based on context
    if (localUserContext.totalTasks === 0) {
      celebrationCategory = 'firstTask';
    } else if (localUserContext.tasksCompletedToday >= 5) {
      celebrationCategory = 'weeklyMilestone';
      replacements.count = localUserContext.tasksCompletedToday;
    } else if (localUserContext.tasksCompletedToday >= 3) {
      celebrationCategory = 'dailyStreak';
      replacements.count = localUserContext.tasksCompletedToday;
    }
    
    const message = getContextualMessage('celebration', celebrationCategory, localUserContext, replacements) ||
                   getRandomMessage('celebration');
    
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    
    // Trigger celebration effects
    triggerCelebration();

    // Update context for task completion
    const updatedContext = updateUserContext(localUserContext, 'taskCompleted');
    setLocalUserContext(updatedContext);
    saveUserContext(updatedContext);
    onContextUpdate?.(updatedContext);

    setTimeout(() => {
      setShowMessage(false);
    }, 6000);
  }, [getPersonalizedMessage, localUserContext, onContextUpdate, triggerCelebration]);

  const getRandomMessage = (category: keyof typeof stuMessages) => {
    const messages = stuMessages[category];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handleStuClick = useCallback(() => {
    if (!stuReady) return;

    const message = getContextualMessage('encouragement', 'general', localUserContext) ||
                   getRandomMessage('encouragement');
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowMessage(true);
    setStuAnimation('excited');

    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setTimeout(() => {
      setStuAnimation('idle');
    }, 1500);

    setTimeout(() => {
      setShowMessage(false);
    }, 3000);

    onGuidanceAction?.('clicked');
  }, [stuReady, localUserContext, onGuidanceAction]);

  // Position-specific styling
  const getPositionStyles = () => {
    switch (position) {
      case 'floating':
        return 'fixed bottom-4 right-4 z-50';
      case 'corner':
        return 'absolute top-2 right-2 z-10';
      case 'embedded':
      default:
        return 'relative';
    }
  };

  return (
    <>
      {/* ARIA Live Region for Stu's messages */}
      <div aria-live="polite" className="sr-only">
        {stuMessageForSR}
      </div>

      <div className={cn(
        "flex flex-col items-center justify-center",
        getPositionStyles(),
        className
      )}>
        {/* Interactive Button for Stu */}
        <Button 
          variant="ghost" 
          className={cn(
            "p-0 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-transparent transition-all duration-200",
            config.container,
            celebrationActive && "ring-2 ring-primary/50 bg-primary/10 shadow-lg"
          )}
          onClick={handleStuClick} 
          aria-label={`Interact with Stu, your study mascot. You've completed ${localUserContext.totalTasks} tasks.`}
        >
          <motion.div 
            variants={getDynamicKoalaVariants()} 
            animate={stuReady ? stuAnimation : "loading"} 
            className={cn(
              "w-full h-full flex items-center justify-center cursor-pointer transition-all duration-200",
              celebrationActive && "filter drop-shadow-lg"
            )}
          >
            <KoalaMascot 
              size={config.mascot} 
              className={cn(
                "transition-all duration-200",
                stuAnimation === 'celebrating' && "animate-pulse"
              )}
            />
          </motion.div>
        </Button>

        {/* Celebration Effects Overlay */}
        {celebrationActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full animate-pulse" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-2xl animate-bounce">
              🎉✨🎊
            </div>
          </motion.div>
        )}

        {/* Stu's Message Bubble */}
        {showMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 5, scale: 0.95 }} 
            className={cn(
              "absolute w-auto p-3 bg-background border shadow-lg rounded-lg text-sm text-center z-20",
              config.bubble,
              // Position bubble based on component position
              position === 'floating' || position === 'corner' 
                ? "bottom-full right-0 mb-2" 
                : "bottom-full left-1/2 -translate-x-1/2 mb-2"
            )}
          >
            {/* Message bubble pointer */}
            <div 
              className={cn(
                "absolute w-3 h-3 bg-background border-r border-b rotate-45",
                position === 'floating' || position === 'corner'
                  ? "bottom-[-6px] right-4"
                  : "bottom-[-6px] left-1/2 -translate-x-1/2"
              )}
            />
            <p className="relative z-10 text-foreground font-medium">{stuMessage}</p>
          </motion.div>
        )}

        {/* Loading state message */}
        {!stuReady && size !== 'sm' && (
          <p className="text-xs text-muted-foreground mt-1 absolute bottom-[-20px] left-1/2 -translate-x-1/2 whitespace-nowrap">
            Stu is waking up...
          </p>
        )}
      </div>
    </>
  );
};

// Context-aware guidance component for different task creation scenarios
export const StuQuickGuidance: React.FC<{
  message?: string;
  onAction?: () => void;
}> = ({ message, onAction }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex-shrink-0">
        <KoalaMascot size={24} />
      </div>
      <p className="text-xs text-muted-foreground flex-1">
        {message || "💡 Tip: Be specific with your task title for better AI suggestions!"}
      </p>
      {onAction && (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onAction}
          className="text-xs h-6 px-2"
        >
          Got it
        </Button>
      )}
    </div>
  );
};

export default StuTaskGuidance; 