'use client';

import React from 'react';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  title?: string;
  description?: string;
  feature?: string;
  className?: string;
  onUpgrade?: () => void;
  variant?: 'default' | 'compact' | 'overlay';
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  title = "Upgrade to Premium",
  description = "Unlock advanced AI features and get unlimited suggestions!",
  feature,
  className,
  onUpgrade,
  variant = 'default'
}) => {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default upgrade action - navigate to subscription page
      window.location.href = '/settings/subscription';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg", className)}>
        <Sparkles className="w-4 h-4 text-purple-600" />
        <span className="text-sm text-purple-700 dark:text-purple-300 flex-1">
          {feature ? `${feature} requires Premium` : 'Premium feature'}
        </span>
        <Button size="sm" variant="default" onClick={handleUpgrade} className="h-6 px-2 text-xs">
          Upgrade
        </Button>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn("absolute inset-0 bg-black/10 dark:bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center", className)}>
        <div className="bg-background/95 border border-border rounded-lg p-4 shadow-lg max-w-sm mx-4">
          <div className="text-center">
            <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{description}</p>
            <Button size="sm" onClick={handleUpgrade} className="w-full">
              <Crown className="w-3 h-3 mr-1" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg", className)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Crown className="w-6 h-6 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">
            {title}
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
            {description}
          </p>
          <Button 
            size="sm" 
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade to Premium
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt; 