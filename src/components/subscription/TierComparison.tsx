'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Users } from 'lucide-react';
import type { SubscriptionTierConfig, SubscriptionTier } from '@/types/subscription';

interface TierComparisonProps {
  tiers: SubscriptionTierConfig[];
  currentTier?: SubscriptionTier;
  onSelectTier?: (tierId: string) => void;
  isLoading?: boolean;
}

const tierIcons = {
  free: Zap,
  premium: Crown,
  enterprise: Users,
};

const featureLabels = {
  basic_ai: 'Basic AI Assistant',
  task_suggestions: 'Task Suggestions',
  study_planning: 'Study Planning',
  voice_notes: 'Voice Notes',
  premium_features: 'Premium Features',
  priority_support: 'Priority Support',
  analytics: 'Advanced Analytics',
  unlimited_ai: 'Unlimited AI',
};

export const TierComparison: React.FC<TierComparisonProps> = ({
  tiers,
  currentTier,
  onSelectTier,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative">
            <CardHeader>
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Sort tiers by price
  const sortedTiers = [...tiers].sort((a, b) => a.price_monthly - b.price_monthly);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Select the perfect plan to boost your productivity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sortedTiers.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          const isPremium = tier.id === 'premium';
          const Icon = tierIcons[tier.id as keyof typeof tierIcons] || Zap;

          return (
            <Card 
              key={tier.id} 
              className={`relative ${isPremium ? 'border-primary border-2 shadow-lg' : 'border'} ${
                isCurrentTier ? 'ring-2 ring-primary' : ''
              }`}
            >
              {/* Popular Badge */}
              {isPremium && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`h-8 w-8 ${isPremium ? 'text-yellow-500' : 'text-primary'}`} />
                </div>
                <CardTitle className="text-xl">
                  {tier.display_name}
                  {isCurrentTier && (
                    <Badge variant="secondary" className="ml-2">Current</Badge>
                  )}
                </CardTitle>
                <div className="text-3xl font-bold">
                  ${tier.price_monthly.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                {tier.price_yearly > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ${tier.price_yearly.toFixed(2)}/year (save 20%)
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {tier.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* AI Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Daily AI Requests:</span>
                    <span className="font-semibold">
                      {tier.ai_requests_per_day === 1000 ? 'Unlimited' : tier.ai_requests_per_day}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Monthly AI Requests:</span>
                    <span className="font-semibold">
                      {tier.ai_requests_per_month === 30000 ? 'Unlimited' : tier.ai_requests_per_month.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2 pt-2">
                  {Object.entries(featureLabels).map(([key, label]) => {
                    const hasFeature = tier.features[key as keyof typeof tier.features];
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {hasFeature ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={hasFeature ? '' : 'text-muted-foreground'}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {isCurrentTier ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full ${isPremium ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={isPremium ? 'default' : 'outline'}
                      onClick={() => onSelectTier?.(tier.id)}
                    >
                      {tier.price_monthly === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include secure data handling and 24/7 uptime monitoring</p>
      </div>
    </div>
  );
}; 