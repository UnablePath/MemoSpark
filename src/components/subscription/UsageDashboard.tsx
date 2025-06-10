'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import type { UserSubscriptionData } from '@/types/subscription';

interface UsageDashboardProps {
  subscriptionData: UserSubscriptionData | null;
  isLoading?: boolean;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({
  subscriptionData,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const limits = subscriptionData?.limits;
  const tier = subscriptionData?.tier;
  const usage = subscriptionData?.usage;

  if (!limits || !tier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load usage data</p>
        </CardContent>
      </Card>
    );
  }

  const dailyPercentage = Math.round((limits.daily_used / limits.daily_ai_requests) * 100);
  const monthlyPercentage = Math.round((limits.monthly_used / limits.monthly_ai_requests) * 100);
  
  const isDailyLimitReached = limits.daily_used >= limits.daily_ai_requests;
  const isMonthlyLimitReached = limits.monthly_used >= limits.monthly_ai_requests;
  const isCloseToLimit = dailyPercentage >= 80 || monthlyPercentage >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Usage Dashboard
          </CardTitle>
          <Badge variant={limits.can_use_ai ? 'default' : 'destructive'}>
            {tier.display_name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Daily Usage</span>
              {isDailyLimitReached && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.daily_used} / {limits.daily_ai_requests === 1000 ? '∞' : limits.daily_ai_requests}
            </span>
          </div>
          <Progress 
            value={limits.daily_ai_requests === 1000 ? 0 : dailyPercentage} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{dailyPercentage}% used</span>
            <span>Resets daily at midnight</span>
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Monthly Usage</span>
              {isMonthlyLimitReached && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.monthly_used} / {limits.monthly_ai_requests === 30000 ? '∞' : limits.monthly_ai_requests.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={limits.monthly_ai_requests === 30000 ? 0 : monthlyPercentage} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{monthlyPercentage}% used</span>
            <span>Resets monthly</span>
          </div>
        </div>

        {/* Feature Usage Breakdown */}
        {usage?.feature_usage && Object.keys(usage.feature_usage).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Feature Usage Today
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(usage.feature_usage).map(([feature, count]) => (
                count && count > 0 ? (
                  <div key={feature} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm capitalize">{feature.replace('_', ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Status Messages */}
        <div className="space-y-2">
          {isDailyLimitReached && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Daily limit reached. Resets in {limits.days_until_reset} days.</span>
            </div>
          )}
          
          {isCloseToLimit && !isDailyLimitReached && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">You're approaching your usage limit. Consider upgrading for more requests.</span>
            </div>
          )}

          {tier.id === 'free' && !isCloseToLimit && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Upgrade to Premium for {tier.ai_requests_per_day * 10}x more daily requests and unlimited features!</span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{limits.daily_used}</div>
            <div className="text-xs text-muted-foreground">Requests Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {limits.daily_ai_requests === 1000 ? '∞' : limits.daily_ai_requests - limits.daily_used}
            </div>
            <div className="text-xs text-muted-foreground">Remaining Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{limits.days_until_reset}</div>
            <div className="text-xs text-muted-foreground">Days Until Reset</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 