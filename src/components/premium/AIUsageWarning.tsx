'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Crown, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { useUserTier } from '@/hooks/useUserTier';
import { cn } from '@/lib/utils';

interface AIUsageWarningProps {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
  className?: string;
  variant?: 'compact' | 'expanded' | 'banner';
}

export const AIUsageWarning: React.FC<AIUsageWarningProps> = ({
  dailyUsed,
  dailyLimit,
  monthlyUsed = 0,
  monthlyLimit = 150,
  className,
  variant = 'expanded'
}) => {
  const { tier } = useUserTier();
  const { showFeatureGatePopup, showGeneralPopup } = usePremiumPopup();
  
  const isPremium = tier === 'premium';
  
  // Don't show for premium users
  if (isPremium) return null;
  
  const dailyProgress = (dailyUsed / dailyLimit) * 100;
  const monthlyProgress = (monthlyUsed / monthlyLimit) * 100;
  const remaining = Math.max(0, dailyLimit - dailyUsed);
  
  // Determine warning level
  const getWarningLevel = () => {
    if (dailyProgress >= 100) return 'critical';
    if (dailyProgress >= 80) return 'high';
    if (dailyProgress >= 60) return 'medium';
    return 'low';
  };
  
  const warningLevel = getWarningLevel();
  
  // Don't show if usage is too low
  if (warningLevel === 'low' && variant !== 'banner') return null;
  
  const getWarningConfig = () => {
    switch (warningLevel) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'red',
          title: 'Daily AI Limit Reached!',
          message: 'You\'ve used all your daily AI requests. Upgrade to continue using AI features.',
          ctaText: 'Upgrade Now',
          progressColor: 'bg-red-500'
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'orange',
          title: 'Running Low on AI Requests',
          message: `Only ${remaining} AI requests remaining today. Upgrade for unlimited access.`,
          ctaText: 'Get Unlimited',
          progressColor: 'bg-orange-500'
        };
      case 'medium':
        return {
          icon: TrendingUp,
          color: 'yellow',
          title: 'AI Usage Update',
          message: `${remaining} AI requests remaining today. Premium users get 20x more!`,
          ctaText: 'Upgrade to Premium',
          progressColor: 'bg-yellow-500'
        };
      default:
        return {
          icon: Zap,
          color: 'blue',
          title: 'AI Features Available',
          message: `${remaining} AI requests remaining today. See what premium offers!`,
          ctaText: 'View Premium',
          progressColor: 'bg-blue-500'
        };
    }
  };
  
  const config = getWarningConfig();
  const IconComponent = config.icon;
  
  const handleUpgradeClick = () => {
    if (warningLevel === 'critical') {
      showFeatureGatePopup('Unlimited AI Requests');
    } else {
      showGeneralPopup();
    }
  };
  
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("mb-4", className)}
      >
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border-l-4",
          `border-l-${config.color}-500 bg-${config.color}-50/50 dark:bg-${config.color}-950/20`
        )}>
          <div className="flex items-center gap-2">
            <IconComponent className={cn("h-4 w-4", `text-${config.color}-600`)} />
            <span className="text-sm font-medium">
              {remaining} AI requests left
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={handleUpgradeClick}>
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        </div>
      </motion.div>
    );
  }
  
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("mb-6", className)}
      >
        <Card className={cn(
          "border-l-4",
          warningLevel === 'critical' ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" :
          warningLevel === 'high' ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20" :
          warningLevel === 'medium' ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" :
          "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconComponent className={cn(
                  "h-4 w-4",
                  warningLevel === 'critical' ? "text-red-600" :
                  warningLevel === 'high' ? "text-orange-600" :
                  warningLevel === 'medium' ? "text-yellow-600" :
                  "text-blue-600"
                )} />
                <span className="text-sm font-medium">{config.title}</span>
                <Badge variant={warningLevel === 'critical' ? "destructive" : "secondary"}>
                  {dailyUsed}/{dailyLimit} today
                </Badge>
              </div>
              <Button
                size="sm"
                variant={warningLevel === 'critical' ? "default" : "outline"}
                onClick={handleUpgradeClick}
                className={cn(
                  "gap-1 text-xs",
                  warningLevel === 'critical' && "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                <Crown className="h-3 w-3" />
                {config.ctaText}
              </Button>
            </div>
            
            <Progress 
              value={dailyProgress} 
              className={cn(
                "h-2 mb-2",
                `[&>div]:${config.progressColor}`
              )}
            />
            
            <p className="text-xs text-muted-foreground mb-2">
              {config.message}
            </p>
            
            {monthlyUsed > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Monthly usage: {monthlyUsed}/{monthlyLimit}</span>
                  <span>{Math.round(monthlyProgress)}% used</span>
                </div>
                <Progress 
                  value={monthlyProgress} 
                  className="h-1 mt-1 opacity-60"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  // Expanded variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mb-6", className)}
    >
      <Card className="relative overflow-hidden">
        <div className={cn(
          "absolute inset-0 opacity-10",
          warningLevel === 'critical' ? "bg-gradient-to-br from-red-500 to-orange-500" :
          warningLevel === 'high' ? "bg-gradient-to-br from-orange-500 to-yellow-500" :
          warningLevel === 'medium' ? "bg-gradient-to-br from-yellow-500 to-blue-500" :
          "bg-gradient-to-br from-blue-500 to-purple-500"
        )} />
        
        <CardContent className="pt-6 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                warningLevel === 'critical' ? "bg-red-100 dark:bg-red-900/30" :
                warningLevel === 'high' ? "bg-orange-100 dark:bg-orange-900/30" :
                warningLevel === 'medium' ? "bg-yellow-100 dark:bg-yellow-900/30" :
                "bg-blue-100 dark:bg-blue-900/30"
              )}>
                <IconComponent className={cn(
                  "h-6 w-6",
                  warningLevel === 'critical' ? "text-red-600" :
                  warningLevel === 'high' ? "text-orange-600" :
                  warningLevel === 'medium' ? "text-yellow-600" :
                  "text-blue-600"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{config.title}</h3>
                <p className="text-muted-foreground text-sm">{config.message}</p>
              </div>
            </div>
            
            <Button
              onClick={handleUpgradeClick}
              className={cn(
                "gap-2",
                warningLevel === 'critical' 
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              )}
            >
              <Crown className="h-4 w-4" />
              {config.ctaText}
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Daily AI Requests</span>
              <Badge variant="outline">
                {dailyUsed}/{dailyLimit}
              </Badge>
            </div>
            
            <Progress 
              value={dailyProgress} 
              className={cn("h-3", `[&>div]:${config.progressColor}`)}
            />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{remaining} requests remaining today</span>
              <span>Resets at midnight</span>
            </div>
          </div>
          
          {warningLevel === 'critical' && (
            <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                💡 <strong>Tip:</strong> Premium users get 100 AI requests per day (20x more) plus unlimited monthly usage!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}; 