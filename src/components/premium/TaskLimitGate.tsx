'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, Lock, Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { useUserTier } from '@/hooks/useUserTier';
import { cn } from '@/lib/utils';

interface TaskLimitGateProps {
  currentTaskCount: number;
  onCreateTask?: () => void;
  className?: string;
  variant?: 'inline' | 'modal' | 'banner';
  showProgress?: boolean;
}

// Free tier task limits
const FREE_TIER_TASK_LIMITS = {
  maxTasks: 10,
  warningThreshold: 7,
  urgentThreshold: 9,
};

export const TaskLimitGate: React.FC<TaskLimitGateProps> = ({
  currentTaskCount,
  onCreateTask,
  className,
  variant = 'inline',
  showProgress = true
}) => {
  const { tier } = useUserTier();
  const { showFeatureGatePopup, showGeneralPopup } = usePremiumPopup();
  
  const isPremium = tier === 'premium';
  
  if (isPremium) {
    return (
      <Button onClick={onCreateTask} className={cn("gap-2", className)}>
        <Plus className="h-4 w-4" />
        Create Task
      </Button>
    );
  }
  
  const progress = (currentTaskCount / FREE_TIER_TASK_LIMITS.maxTasks) * 100;
  const remaining = Math.max(0, FREE_TIER_TASK_LIMITS.maxTasks - currentTaskCount);
  const isAtLimit = currentTaskCount >= FREE_TIER_TASK_LIMITS.maxTasks;
  const isWarning = currentTaskCount >= FREE_TIER_TASK_LIMITS.warningThreshold;
  
  const handleCreateTask = () => {
    if (isAtLimit) {
      showFeatureGatePopup('Unlimited Tasks');
      return;
    }
    
    if (isWarning && Math.random() < 0.4) {
      showGeneralPopup();
    }
    
    onCreateTask?.();
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {isWarning && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">
                {currentTaskCount}/{FREE_TIER_TASK_LIMITS.maxTasks} tasks
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => showFeatureGatePopup('Unlimited Tasks')}
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </div>
            {showProgress && (
              <Progress value={progress} className="h-2 [&>div]:bg-yellow-500" />
            )}
          </CardContent>
        </Card>
      )}
      
      <Button
        onClick={handleCreateTask}
        disabled={isAtLimit}
        className={cn("gap-2 w-full", isAtLimit && "opacity-50")}
      >
        {isAtLimit ? (
          <>
            <Lock className="h-4 w-4" />
            Task Limit Reached
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Create Task
          </>
        )}
      </Button>
    </div>
  );
}; 