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
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
            <CardTitle className="text-xl">
              {tier?.display_name || 'Free'} Plan
            </CardTitle>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription>
          {tier?.description || 'Basic AI assistance with limited requests'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pricing Information */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Monthly Price:</span>
          <span className="font-semibold">
            ${tier?.price_monthly?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Billing Period */}
        {subscription?.current_period_end && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Payment Status */}
        {subscription?.stripe_customer_id && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>
              {subscription.cancel_at_period_end ? 'Cancels at period end' : 'Auto-renewal enabled'}
            </span>
          </div>
        )}

        {/* Upgrade Button for Free Users */}
        {tier?.id === 'free' && (
          <Button 
            onClick={onUpgrade} 
            className="w-full mt-4"
            variant="default"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        )}

        {/* Manage Subscription for Premium Users */}
        {isPremium && (
          <Button 
            onClick={onUpgrade} 
            className="w-full mt-4"
            variant="outline"
          >
            Manage Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}; 