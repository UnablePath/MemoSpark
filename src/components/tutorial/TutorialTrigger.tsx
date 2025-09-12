'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from './TutorialProvider';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, Loader2 } from 'lucide-react';

type TriggerVariant = 'button' | 'fab' | 'icon';
type TriggerSize = 'sm' | 'default' | 'lg';

interface TutorialTriggerProps {
  variant?: TriggerVariant;
  size?: TriggerSize;
  className?: string;
  children?: React.ReactNode;
  showIndicator?: boolean;
  disabled?: boolean;
}

export const TutorialTrigger: React.FC<TutorialTriggerProps> = memo(({
  variant = 'button',
  size = 'default',
  className,
  children,
  showIndicator = true,
  disabled = false
}) => {
  const { 
    showTutorial, 
    shouldShowTutorial, 
    isLoading, 
    currentProgress,
    error,
    isActive
  } = useTutorial();

  // Memoize computed values
  const tutorialState = useMemo(() => {
    const isCompleted = currentProgress?.is_completed || currentProgress?.is_skipped;
    const hasError = !!error;
    const needsAttention = shouldShowTutorial && !isCompleted && !isActive;
    
    // If we're showing fallback, treat as if tutorial is available but not started
    const isFallback = showFallback && isLoading && !currentProgress;
    
    return {
      isCompleted,
      hasError,
      needsAttention: isFallback || needsAttention,
      icon: isCompleted ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />,
      text: isCompleted ? 'Replay Tutorial' : 'Start Tutorial',
      loadingIcon: <Loader2 className="h-4 w-4 animate-spin" />
    };
  }, [currentProgress, error, shouldShowTutorial, isActive, showFallback, isLoading]);

  const handleClick = React.useCallback(() => {
    if (!isLoading && !disabled) {
      showTutorial();
    }
  }, [showTutorial, isLoading, disabled]);

  // Don't render if loading and no current state, but add timeout fallback
  const [showFallback, setShowFallback] = React.useState(false);
  
  React.useEffect(() => {
    if (isLoading && !currentProgress) {
      // If still loading after 3 seconds, show fallback UI
      const fallbackTimer = setTimeout(() => {
        setShowFallback(true);
      }, 3000);
      
      return () => clearTimeout(fallbackTimer);
    } else {
      setShowFallback(false);
    }
  }, [isLoading, currentProgress]);
  
  // Show fallback after timeout or don't render at all if still loading
  if (isLoading && !currentProgress && !showFallback) {
    return null;
  }

  // Floating Action Button variant
  if (variant === 'fab') {
    return (
      <Button
        onClick={handleClick}
        disabled={isLoading || disabled}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-200 hover:scale-105",
          tutorialState.needsAttention && "animate-pulse",
          tutorialState.hasError && "bg-destructive hover:bg-destructive/90",
          className
        )}
        size="icon"
        title={tutorialState.text}
        aria-label={`${tutorialState.text}${tutorialState.needsAttention ? ' (Recommended)' : ''}`}
      >
        {isLoading ? tutorialState.loadingIcon : tutorialState.icon}
        
        {/* Attention indicator */}
        {showIndicator && tutorialState.needsAttention && !isLoading && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping" />
          </div>
        )}
      </Button>
    );
  }

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <Button
        onClick={handleClick}
        disabled={isLoading || disabled}
        variant="ghost"
        size="icon"
        className={cn(
          "relative",
          tutorialState.needsAttention && "text-primary",
          className
        )}
        title={tutorialState.text}
        aria-label={`${tutorialState.text}${tutorialState.needsAttention ? ' (Recommended)' : ''}`}
      >
        {isLoading ? tutorialState.loadingIcon : tutorialState.icon}
        
        {/* Attention indicator */}
        {showIndicator && tutorialState.needsAttention && !isLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  // Default button variant
  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || disabled}
      variant={tutorialState.needsAttention && !tutorialState.isCompleted ? "default" : "outline"}
      size={size}
      className={cn(
        "gap-2",
        tutorialState.hasError && "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
        className
      )}
      aria-label={`${tutorialState.text}${tutorialState.needsAttention ? ' (Recommended)' : ''}`}
    >
      {isLoading ? tutorialState.loadingIcon : tutorialState.icon}
      
      {children || (
        <>
          {tutorialState.text}
          {tutorialState.hasError && ' (Error)'}
        </>
      )}
      
      {/* Attention indicator */}
      {showIndicator && tutorialState.needsAttention && !tutorialState.isCompleted && !isLoading && (
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1" />
      )}
    </Button>
  );
});

TutorialTrigger.displayName = 'TutorialTrigger';