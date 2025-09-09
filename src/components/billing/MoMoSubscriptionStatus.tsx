import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CreditCard,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface MoMoSubscription {
  id: string;
  tier_id: string;
  phone: string;
  amount: number;
  billing_period: 'monthly' | 'yearly';
  network: 'mtn' | 'vodafone' | 'airteltigo';
  status: 'active' | 'cancelled' | 'payment_failed' | 'suspended';
  next_billing_date: string;
  last_payment_date?: string;
  created_at: string;
}

interface MoMoSubscriptionStatusProps {
  clerkUserId: string;
}

export const MoMoSubscriptionStatus: React.FC<MoMoSubscriptionStatusProps> = ({ clerkUserId }) => {
  const [subscriptions, setSubscriptions] = useState<MoMoSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'mtn': return 'bg-yellow-100 text-yellow-800';
      case 'vodafone': return 'bg-red-100 text-red-800';
      case 'airteltigo': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'payment_failed': return 'bg-orange-100 text-orange-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'payment_failed': return <AlertCircle className="h-4 w-4" />;
      case 'suspended': return <X className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/momo/check-due');
      
      if (!response.ok) {
        throw new Error('Failed to load subscriptions');
      }

      const result = await response.json();
      setSubscriptions(result.data.subscriptions || []);
    } catch (error) {
      console.error('Load subscriptions error:', error);
      toast.error('Failed to load subscription status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryPayment = async (subscriptionId: string) => {
    try {
      setIsRetrying(subscriptionId);
      
      const response = await fetch('/api/billing/momo/check-due', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to retry payment');
      }

      const result = await response.json();
      
      if (result.data.paymentUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.data.paymentUrl;
      } else {
        toast.success(result.data.message);
        loadSubscriptions(); // Refresh status
      }
    } catch (error) {
      console.error('Payment retry error:', error);
      toast.error('Failed to retry payment');
    } finally {
      setIsRetrying(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/billing/momo/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      loadSubscriptions(); // Refresh status
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Money Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Money Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Smartphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No MoMo subscriptions found</p>
            <p className="text-sm text-gray-500 mt-1">
              Set up a recurring mobile money subscription for automatic payments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Money Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptions.map((subscription, index) => (
          <div key={subscription.id}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(subscription.status)}>
                      {getStatusIcon(subscription.status)}
                      <span className="ml-1 capitalize">{subscription.status.replace('_', ' ')}</span>
                    </Badge>
                    <Badge variant="outline" className={getNetworkColor(subscription.network)}>
                      {subscription.network.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Phone: {subscription.phone}</p>
                    <p>Amount: {formatCurrency(subscription.amount)} / {subscription.billing_period}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">
                    Next Billing: {formatDate(subscription.next_billing_date)}
                  </p>
                  {subscription.last_payment_date && (
                    <p className="text-xs text-gray-500">
                      Last Payment: {formatDate(subscription.last_payment_date)}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Failed Alert */}
              {subscription.status === 'payment_failed' && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Your last payment failed. Please retry the payment to continue your subscription.
                  </AlertDescription>
                </Alert>
              )}

              {/* Suspended Alert */}
              {subscription.status === 'suspended' && (
                <Alert className="border-red-200 bg-red-50">
                  <X className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Your subscription has been suspended due to multiple failed payments. Please contact support or set up a new payment method.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {subscription.status === 'payment_failed' && (
                  <Button
                    size="sm"
                    onClick={() => handleRetryPayment(subscription.id)}
                    disabled={isRetrying === subscription.id}
                    className="flex items-center gap-2"
                  >
                    {isRetrying === subscription.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <CreditCard className="h-3 w-3" />
                    )}
                    {isRetrying === subscription.id ? 'Processing...' : 'Retry Payment'}
                  </Button>
                )}
                
                {subscription.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this subscription?')) {
                        handleCancelSubscription(subscription.id);
                      }
                    }}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
            
            {index < subscriptions.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscriptions}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
