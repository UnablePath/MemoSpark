'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, CreditCard } from 'lucide-react';
import type { UserSubscriptionData } from '@/types/subscription';

interface SubscriptionCardProps {
  subscriptionData: UserSubscriptionData | null;
  onUpgrade?: () => void;
  isLoading?: boolean;
}

// Ghana Cedis formatter
const formatGHC = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscriptionData,
  onUpgrade,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tier = subscriptionData?.tier;
  const subscription = subscriptionData?.subscription;
  const isPremium = tier?.id !== 'free';
  const isActive = subscription?.status === 'active';

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-background to-muted/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPremium && <Crown className="h-6 w-6 text-yellow-500" />}
            <div>
              <CardTitle className="text-xl font-bold">
                {tier?.display_name || 'Free Plan'}
              </CardTitle>
              <CardDescription className="mt-1">
                {tier?.description || 'Basic AI assistance with limited requests'}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className={isActive ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Subscription Section */}
        <div className="rounded-lg bg-muted/30 p-4 space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Current Subscription
          </h4>
          
          {/* Pricing Information */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium">Monthly Price:</span>
            <span className="font-bold text-lg">
              {tier?.price_monthly === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                <span className="text-primary">{formatGHC(tier?.price_monthly || 0)}</span>
              )}
            </span>
          </div>

          {/* Billing Information */}
          {subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
              <Calendar className="h-4 w-4" />
              <span>
                Renews on {new Date(subscription.current_period_end).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          )}

          {/* Payment Status */}
          {subscription && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>
                {subscription.cancel_at_period_end 
                  ? 'Subscription will cancel at period end' 
                  : 'Auto-renewal active'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2">
          {tier?.id === 'free' ? (
            <Button 
              onClick={onUpgrade} 
              className="w-full"
              variant="default"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          ) : (
            <Button 
              onClick={onUpgrade} 
              className="w-full"
              variant="outline"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 