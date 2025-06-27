'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { Calendar, CreditCard, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager';
import { supabase } from '@/lib/supabase/client';
import type { SubscriptionTierConfig, UserSubscriptionData } from '@/types/subscription';

interface PaymentHistory {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  tier_name: string;
  billing_period: string;
  status: string;
  paid_at: string;
  gateway_response: string;
}

interface BillingPortalProps {
  className?: string;
}

export const BillingPortal: React.FC<BillingPortalProps> = ({ className }) => {
  const { user, isLoaded } = useUser();
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [availableTiers, setAvailableTiers] = useState<SubscriptionTierConfig[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      loadBillingData();
    }
  }, [isLoaded, user]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is available
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const tierManager = new SubscriptionTierManager(supabase);
      
      // Load subscription data and available tiers
      const [userData, tiers] = await Promise.all([
        tierManager.getUserSubscriptionData(user!.id),
        tierManager.getAvailableTiers()
      ]);

      setSubscriptionData(userData);
      setAvailableTiers(tiers);

      // Load payment history
      await loadPaymentHistory();
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await fetch('/api/billing/payment-history');
      if (response.ok) {
        const history = await response.json();
        setPaymentHistory(history);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  const handleUpgrade = async (tierId: string, billingPeriod: 'monthly' | 'yearly') => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error('Email address not found');
      return;
    }

    try {
      setIsUpgrading(true);
      
      const response = await fetch('/api/billing/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingPeriod,
          userEmail: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack checkout
      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade process');
    } finally {
      setIsUpgrading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Please sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You need to be signed in to access the billing portal.</p>
        </CardContent>
      </Card>
    );
  }

  const currentTier = availableTiers.find(tier => tier.id === subscriptionData?.subscription?.tier_id) || availableTiers[0];
  const isPremiumUser = subscriptionData?.subscription?.tier_id !== 'free';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your MemoSpark subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{currentTier?.display_name} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {currentTier?.description}
              </p>
            </div>
            <Badge variant={isPremiumUser ? 'default' : 'secondary'}>
              {isPremiumUser ? 'Active' : 'Free'}
            </Badge>
          </div>

          {subscriptionData?.subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscriptionData.subscription.cancel_at_period_end 
                  ? `Expires on ${formatDate(subscriptionData.subscription.current_period_end)}`
                  : `Renews on ${formatDate(subscriptionData.subscription.current_period_end)}`
                }
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      {!isPremiumUser && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Choose a plan that fits your needs and unlock premium features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 space-y-0 sm:grid-cols-1 md:grid-cols-2">
              {availableTiers.filter(tier => tier.id !== 'free' && tier.id !== 'enterprise').map((tier) => (  
                <div key={tier.id} className="border rounded-lg p-4 min-h-[260px] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold break-words">{tier.display_name}</h3>
                      {tier.id === 'premium' && (
                        <Badge variant="outline" className="text-xs w-fit">
                          7-day free trial
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 break-words">
                      {tier.description}
                    </p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Monthly:</span>
                      <span className="font-semibold">
                        {formatCurrency(tier.price_monthly)}/mo
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yearly:</span>
                      <span className="font-semibold">
                        {formatCurrency(tier.price_yearly)}/yr
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleUpgrade(tier.id, 'monthly')}
                      disabled={isUpgrading}
                      className="w-full"
                      variant="outline"
                    >
                      {isUpgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {tier.id === 'premium' ? 'Start Free Trial' : 'Upgrade Monthly'}
                    </Button>
                    <Button
                      onClick={() => handleUpgrade(tier.id, 'yearly')}
                      disabled={isUpgrading}
                      className="w-full"
                    >
                      {isUpgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Upgrade Yearly (Save 20%)
                    </Button>
                    {/* Money-back guarantee */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
                      <AlertCircle className="h-3 w-3" />
                      <span>7 day refund</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Coming Soon Enterprise Tier */}
              <div className="border rounded-lg p-4 min-h-[260px] flex flex-col justify-between space-y-4 opacity-75 bg-muted/20">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold break-words">Enterprise</h3>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 break-words">
                    Unlimited AI with advanced analytics and priority support
                  </p>
                </div>
                <div className="space-y-2 mb-4 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Monthly:</span>
                    <span>{formatCurrency(29.99)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unlimited AI:</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Advanced Analytics:</span>
                    <span>✓</span>
                  </div>
                </div>
                <Button
                  disabled
                  className="w-full"
                  variant="outline"
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            View your past transactions and download receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                  <div>
                    <div className="font-semibold">
                      {payment.tier_name} - {payment.billing_period}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payment.paid_at)} • {payment.reference}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </div>
                    <Badge variant="default" className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history found</p>
              <p className="text-sm">Your transactions will appear here after your first payment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 