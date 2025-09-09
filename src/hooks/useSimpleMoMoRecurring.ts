import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface SubscriptionStatus {
  needsPayment: boolean;
  paymentUrl?: string;
  daysOverdue?: number;
  daysUntilPayment?: number;
  message?: string;
  subscription?: {
    id: string;
    tier_id: string;
    phone: string;
    amount: number;
    billing_period: 'monthly' | 'yearly';
    network: 'mtn' | 'vodafone' | 'airteltigo';
    status: 'active' | 'cancelled' | 'expired';
    last_payment_date: string;
  };
}

export const useSimpleMoMoRecurring = () => {
  const { user, isLoaded } = useUser();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || !isLoaded) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/momo/check-status');
      
      if (!response.ok) {
        throw new Error('Failed to check subscription status');
      }

      const result = await response.json();
      setSubscriptionStatus(result.data);

      // Show payment prompt if payment is needed
      if (result.data.needsPayment) {
        setShowPaymentPrompt(true);
      }

    } catch (error) {
      console.error('Subscription status check error:', error);
      toast.error('Failed to check subscription status');
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoaded]);

  const proceedWithPayment = useCallback(() => {
    if (subscriptionStatus?.paymentUrl) {
      window.location.href = subscriptionStatus.paymentUrl;
    }
  }, [subscriptionStatus]);

  const dismissPaymentPrompt = useCallback(() => {
    setShowPaymentPrompt(false);
  }, []);

  // Check subscription status when user loads or becomes active
  useEffect(() => {
    if (isLoaded && user) {
      checkSubscriptionStatus();
    }
  }, [isLoaded, user, checkSubscriptionStatus]);

  // Check when user returns to the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLoaded && user) {
        checkSubscriptionStatus();
      }
    };

    const handleFocus = () => {
      if (isLoaded && user) {
        checkSubscriptionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isLoaded, user, checkSubscriptionStatus]);

  return {
    subscriptionStatus,
    isLoading,
    showPaymentPrompt,
    checkSubscriptionStatus,
    proceedWithPayment,
    dismissPaymentPrompt,
  };
};
