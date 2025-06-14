'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from './TutorialProvider';
import { HelpCircle, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialTriggerProps {
  variant?: 'button' | 'icon' | 'fab'; // floating action button
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const TutorialTrigger: React.FC<TutorialTriggerProps> = ({
  variant = 'button',
  size = 'default',
  className,
  children
}) => {
  const { showTutorial, shouldShowTutorial, isLoading, currentProgress } = useTutorial();

  if (isLoading) {
    return null;
  }

  const handleClick = () => {
    showTutorial();
  };

  // Determine button content based on tutorial state
  const isCompleted = currentProgress?.is_completed || currentProgress?.is_skipped;
  const icon = isCompleted ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />;
  const text = isCompleted ? 'Replay Tutorial' : 'Start Tutorial';

  if (variant === 'fab') {
    return (
      <Button
        onClick={handleClick}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-200 hover:scale-105",
          className
        )}
        size="icon"
        title={text}
      >
        {icon}
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <Button
        onClick={handleClick}
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        title={text}
      >
        {icon}
        {shouldShowTutorial && !isCompleted && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant={shouldShowTutorial && !isCompleted ? "default" : "outline"}
      size={size}
      className={cn("gap-2", className)}
    >
      {icon}
      {children || text}
      {shouldShowTutorial && !isCompleted && (
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1" />
      )}
    </Button>
  );
}; 