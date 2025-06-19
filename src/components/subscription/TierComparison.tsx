'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Users, Sparkles } from 'lucide-react';
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

// Ghana Cedis formatter
const formatGHC = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const TierComparison: React.FC<TierComparisonProps> = ({
  tiers,
  currentTier,
  onSelectTier,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

  // Sort tiers by price and add enterprise tier
  const allTiers = [...tiers];
  
  // Add enterprise tier if not present
  if (!allTiers.find(t => t.id === 'enterprise')) {
    allTiers.push({
      id: 'enterprise',
      name: 'enterprise',
      display_name: 'Enterprise',
      description: 'Unlimited AI with advanced analytics',
      price_monthly: 29.99,
      price_yearly: 299.99,
      ai_requests_per_day: 1000,
      ai_requests_per_month: 30000,
      features: {
        basic_ai: true,
        task_suggestions: true,
        study_planning: true,
        voice_notes: true,
        premium_features: true,
        priority_support: true,
        analytics: true,
        unlimited_ai: true,
      },
      is_active: true,
      created_at: '',
      updated_at: '',
    });
  }

  const sortedTiers = allTiers.sort((a, b) => a.price_monthly - b.price_monthly);

  return (
    <div className="space-y-6">
      <div className="text-center px-4">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Select the perfect plan to boost your productivity
        </p>
      </div>

      {/* Mobile-first responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {sortedTiers.map((tier) => {
          const isCurrentTier = tier.id === currentTier;
          const isPremium = tier.id === 'premium';
          const isEnterprise = tier.id === 'enterprise';
          const Icon = tierIcons[tier.id as keyof typeof tierIcons] || Sparkles;

          return (
            <Card 
              key={tier.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isPremium ? 'border-primary border-2 shadow-lg scale-105' : 'border'
              } ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}
            >
              {/* Popular Badge */}
              {isPremium && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`h-8 w-8 ${
                    isPremium ? 'text-yellow-500' : 
                    isEnterprise ? 'text-purple-500' : 'text-primary'
                  }`} />
                </div>
                <CardTitle className="text-xl flex flex-col items-center gap-2">
                  <span>{tier.display_name}</span>
                  {isCurrentTier && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </CardTitle>
                
                {/* Pricing */}
                <div className="space-y-1">
                <div className="text-3xl font-bold">
                    {isEnterprise ? 'Coming Soon' :
                     tier.price_monthly === 0 ? 'Free' : formatGHC(tier.price_monthly)}
                    {tier.price_monthly > 0 && !isEnterprise && (
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                    )}
                </div>
                  {tier.price_yearly > 0 && !isEnterprise && (
                  <p className="text-sm text-muted-foreground">
                      {formatGHC(tier.price_yearly)}/year (save 20%)
                  </p>
                )}
                </div>

                <p className="text-sm text-muted-foreground mt-2 px-2">
                  {tier.description}
                </p>

                {/* Free Trial Badge */}
                {tier.id === 'premium' && (
                  <Badge variant="outline" className="mt-2">
                    7-day free trial
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* AI Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Daily AI Requests:</span>
                    <span className="font-semibold">
                      {tier.ai_requests_per_day === 1000 ? 'Unlimited' : tier.ai_requests_per_day}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
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
                        <span className={hasFeature ? '' : 'text-muted-foreground line-through'}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Button */}
                <div className="pt-4 space-y-2">
                  {isCurrentTier ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  ) : (
                    <>
                    <Button 
                      className={`w-full ${isPremium ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={isPremium ? 'default' : 'outline'}
                      onClick={() => onSelectTier?.(tier.id)}
                    >
                        {tier.price_monthly === 0 ? 'Downgrade' : 
                         tier.id === 'premium' ? 'Start Free Trial' : 'Upgrade'}
                    </Button>
                      
                      {/* Refund guarantee for paid plans */}
                      {tier.price_monthly > 0 && (
                        <p className="text-xs text-center text-muted-foreground">
                          30-day money-back guarantee
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional info */}
      <div className="text-center text-sm text-muted-foreground space-y-2 px-4">
        <p>All plans include secure data handling and 24/7 uptime monitoring</p>
        <p>Need a refund? <button className="text-primary hover:underline">Contact our support team</button></p>
      </div>
    </div>
  );
}; 