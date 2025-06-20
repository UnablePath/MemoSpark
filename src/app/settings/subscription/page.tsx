'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { TierComparison } from '@/components/subscription/TierComparison';
import { BillingPortal } from '@/components/billing/BillingPortal';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager';
import { supabase } from '@/lib/supabase/client';
import type { UserSubscriptionData, SubscriptionTierConfig } from '@/types/subscription';
import Link from 'next/link';

export default function SubscriptionPage() {
  const { user, isLoaded } = useUser();
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [availableTiers, setAvailableTiers] = useState<SubscriptionTierConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refundReason, setRefundReason] = useState('');
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      loadSubscriptionData();
    }
  }, [isLoaded, user]);

  // Handle URL parameters for payment success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const tier = urlParams.get('tier');

    if (success === 'payment_completed') {
      toast.success(
        tier 
          ? `Payment successful! Welcome to ${tier} plan.`
          : 'Payment successful! Your subscription has been updated.'
      );
      setActiveTab('overview');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      let errorMessage = 'Payment failed. Please try again.';
      switch (error) {
        case 'payment_failed':
          errorMessage = 'Payment was not successful. Please try again.';
          break;
        case 'missing_reference':
          errorMessage = 'Payment reference is missing. Please contact support.';
          break;
        case 'callback_failed':
          errorMessage = 'Payment processing failed. Please contact support.';
          break;
      }
      toast.error(errorMessage);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is available
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const tierManager = new SubscriptionTierManager(supabase);
      
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
    // This now redirects to the billing portal with Paystack integration
    setActiveTab('billing');
  };

  const handleTierSelection = async (tierId: string) => {
    // This now redirects to the billing portal for payment processing
    setActiveTab('billing');
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund request');
      return;
    }

    try {
      setIsRequestingRefund(true);
      
      const response = await fetch('/api/billing/request-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          reason: refundReason,
          subscriptionId: subscriptionData?.subscription?.id,
        }),
      });

      if (response.ok) {
        toast.success('Refund request submitted successfully. Our team will review and respond within 24 hours.');
        setIsRefundModalOpen(false);
        setRefundReason('');
      } else {
        throw new Error('Failed to submit refund request');
      }
    } catch (error) {
      console.error('Refund request error:', error);
      toast.error('Failed to submit refund request. Please contact support directly.');
    } finally {
      setIsRequestingRefund(false);
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

  const isPremiumUser = subscriptionData?.subscription?.tier_id !== 'free';

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
            Manage your MemoSpark subscription and AI usage
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
          <TabsTrigger value="plans">Compare Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
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

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <BillingPortal />
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Contact Support */}
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
            
            {/* Request Refund - Only for premium users */}
            {isPremiumUser && (
              <>
                <hr className="border-muted" />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Request Refund</h3>
                    <p className="text-sm text-muted-foreground">
                      Need a refund? We offer a 7 day refund
                    </p>
                  </div>
                  <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Request Refund
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request Refund</DialogTitle>
                        <DialogDescription>
                          Tell us why you'd like a refund and we'll process your request within 24 hours.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Reason for refund</label>
                          <Textarea
                            placeholder="Please explain why you're requesting a refund..."
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setIsRefundModalOpen(false)}
                            disabled={isRequestingRefund}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRefundRequest}
                            disabled={isRequestingRefund || !refundReason.trim()}
                          >
                            {isRequestingRefund ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Submit Request
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 