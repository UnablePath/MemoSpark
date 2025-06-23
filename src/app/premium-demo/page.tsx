'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PremiumFeatureWrapper, usePremiumPopup } from '@/components/premium';
import { Crown, Sparkles, Star } from 'lucide-react';

export default function PremiumDemoPage() {
  const { showFeatureGatePopup, showGeneralPopup, showLaunchPopup } = usePremiumPopup();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Premium Popup System Demo</h1>
        <p className="text-muted-foreground">
          Test the different types of premium upgrade popups and feature gating.
        </p>
      </div>

      {/* Manual Popup Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Manual Popup Triggers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => showFeatureGatePopup('Demo Feature')}
              variant="outline"
              className="w-full"
            >
              Show Feature Gate Popup
            </Button>
            
            <Button 
              onClick={showGeneralPopup}
              variant="outline"
              className="w-full"
            >
              Show General Popup
            </Button>
            
            <Button 
              onClick={showLaunchPopup}
              variant="outline"
              className="w-full"
            >
              Show Launch Popup
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            The popup system also shows popups automatically every 3 minutes or when you tab out and back in.
          </p>
        </CardContent>
      </Card>

      {/* Feature Wrapper Examples */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Premium Feature Wrapper Examples</h2>
        
        {/* Example 1: Hidden premium feature */}
        <PremiumFeatureWrapper
          featureName="Advanced Analytics"
          description="Get detailed insights into your study patterns and performance metrics."
          showFallback={false}
        >
          <Card>
            <CardHeader>
              <CardTitle>📊 Advanced Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This premium feature would show detailed analytics and insights.</p>
            </CardContent>
          </Card>
        </PremiumFeatureWrapper>

        {/* Example 2: Visible premium feature with upgrade card */}
        <PremiumFeatureWrapper
          featureName="AI Study Planner"
          description="Let our AI create personalized study schedules based on your goals and availability."
          showFallback={true}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Study Planner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Premium AI-powered study planning interface would be here.</p>
            </CardContent>
          </Card>
        </PremiumFeatureWrapper>

        {/* Example 3: Another premium feature */}
        <PremiumFeatureWrapper
          featureName="Voice Notes & Transcription"
          description="Record voice notes and get automatic transcriptions with AI summarization."
          showFallback={true}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Voice Notes Studio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Voice recording and transcription interface would be displayed here.</p>
            </CardContent>
          </Card>
        </PremiumFeatureWrapper>
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">🚀 Launch Mode</h4>
            <p className="text-sm text-muted-foreground">
              During launch mode, all users get premium features for free. Popups encourage users to secure permanent access.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">🔒 Feature Gating</h4>
            <p className="text-sm text-muted-foreground">
              When free users try to access premium features, they see upgrade popups explaining the specific feature they're trying to access.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">⏰ Automatic Popups</h4>
            <p className="text-sm text-muted-foreground">
              Popups appear every few minutes or when users tab back to the app, with 5 different message variations to prevent fatigue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 