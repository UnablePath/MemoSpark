'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Lock } from 'lucide-react';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { useUserTier } from '@/hooks/useUserTier';

interface PremiumFeatureWrapperProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
  showFallback?: boolean; // Whether to show a premium upgrade card instead of hiding
  requiredTier?: 'premium'; // Future-proofing for multiple tiers
  className?: string;
}

// Determine if we're in launch mode
const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';

export const PremiumFeatureWrapper: React.FC<PremiumFeatureWrapperProps> = ({
  children,
  featureName,
  description = "This feature is available to premium users only.",
  showFallback = true,
  requiredTier = 'premium',
  className = ''
}) => {
  const { tier } = useUserTier();
  const { showFeatureGatePopup } = usePremiumPopup();

  // Check if user has access
  const hasAccess = tier === 'premium' || isLaunchMode;

  const handleUpgradeClick = () => {
    showFeatureGatePopup(featureName);
  };

  // If user has access, render the feature
  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // If no fallback should be shown, render nothing
  if (!showFallback) {
    return null;
  }

  // Show premium upgrade card
  return (
    <div className={className}>
      <Card className="border-2 border-dashed border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-yellow-600" />
            Premium Feature: {featureName}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {description}
          </p>
          
          {isLaunchMode && (
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                🚀 Currently available during launch mode! Secure permanent access by upgrading to premium.
              </p>
            </div>
          )}
          
          <Button
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
            size="lg"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
          
          <p className="text-xs text-muted-foreground">
            ✨ Unlock this and many more premium features
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 