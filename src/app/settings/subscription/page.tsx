'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { TierComparison } from '@/components/subscription/TierComparison';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager';
import type { UserSubscriptionData, SubscriptionTierConfig } from '@/types/subscription';
import Link from 'next/link';

export default function SubscriptionPage() {
  const { user, isLoaded } = useUser();
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [availableTiers, setAvailableTiers] = useState<SubscriptionTierConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isLoaded && user) {
      loadSubscriptionData();
    }
  }, [isLoaded, user]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      const tierManager = new SubscriptionTierManager();
      
      // Load subscription data and available tiers in parallel
      const [userData, tiers] = await Promise.all([
        tierManager.getUserSubscriptionData(user!.id),
        tierManager.getAvailableTiers()
      ]);

      setSubscriptionData(userData);
      setAvailableTiers(tiers);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      // This would normally redirect to Clerk's billing portal
      // For now, we'll show a toast
      toast.info('Redirecting to billing portal...');
      
      // Simulated upgrade flow - in production this would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhook callbacks
      // 4. Update user subscription in database
      
      console.log('Upgrade flow initiated for user:', user?.id);
    } catch (error) {
      console.error('Error initiating upgrade:', error);
      toast.error('Failed to initiate upgrade');
    }
  };

  const handleTierSelection = async (tierId: string) => {
    try {
      toast.info(`Selecting ${tierId} plan...`);
      
      // This would normally:
      // 1. Create or update Stripe subscription
      // 2. Handle payment processing
      // 3. Update user subscription in database
      // 4. Redirect to success page
      
      console.log('Tier selection:', tierId, 'for user:', user?.id);
    } catch (error) {
      console.error('Error selecting tier:', error);
      toast.error('Failed to select plan');
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Please sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to be signed in to manage your subscription.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your StudySpark subscription and AI usage
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
          <TabsTrigger value="plans">Compare Plans</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Card */}
            <SubscriptionCard
              subscriptionData={subscriptionData}
              onUpgrade={handleUpgrade}
              isLoading={isLoading}
            />

            {/* Quick Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Usage Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : subscriptionData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Daily AI Requests:</span>
                      <span className="font-semibold">
                        {subscriptionData.limits.daily_used} / {subscriptionData.limits.daily_ai_requests}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Monthly AI Requests:</span>
                      <span className="font-semibold">
                        {subscriptionData.limits.monthly_used} / {subscriptionData.limits.monthly_ai_requests.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Plan:</span>
                      <span className="font-semibold capitalize">
                        {subscriptionData.tier.display_name}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setActiveTab('usage')}
                    >
                      View Detailed Usage
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unable to load usage data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <UsageDashboard
            subscriptionData={subscriptionData}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <TierComparison
            tiers={availableTiers}
            currentTier={subscriptionData?.tier.id as any}
            onSelectTier={handleTierSelection}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Need help?</h3>
              <p className="text-sm text-muted-foreground">
                Contact our support team for assistance with your subscription
              </p>
            </div>
            <Button variant="outline">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 