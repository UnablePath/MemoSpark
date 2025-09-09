import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Smartphone, X, Calendar } from 'lucide-react';

interface SimpleMoMoPaymentPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  subscription?: {
    amount: number;
    billing_period: 'monthly' | 'yearly';
    phone: string;
    network: 'mtn' | 'vodafone' | 'airteltigo';
  };
  daysOverdue?: number;
  message?: string;
  isLoading?: boolean;
}

export const SimpleMoMoPaymentPrompt: React.FC<SimpleMoMoPaymentPromptProps> = ({
  isOpen,
  onClose,
  onProceed,
  subscription,
  daysOverdue,
  message,
  isLoading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'mtn': return 'bg-yellow-100 text-yellow-800';
      case 'vodafone': return 'bg-red-100 text-red-800';
      case 'airteltigo': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                daysOverdue && daysOverdue > 0 ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                <Calendar className={`h-5 w-5 ${
                  daysOverdue && daysOverdue > 0 ? 'text-red-600' : 'text-orange-600'
                }`} />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {daysOverdue && daysOverdue > 0 ? 'Payment Overdue' : 'Payment Due'}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">
                  MoMo Subscription
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className={`rounded-lg p-4 ${
            daysOverdue && daysOverdue > 0 ? 'bg-red-50' : 'bg-orange-50'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                daysOverdue && daysOverdue > 0 ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  daysOverdue && daysOverdue > 0 ? 'text-red-800' : 'text-orange-800'
                }`}>
                  {daysOverdue && daysOverdue > 0 
                    ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
                    : 'Subscription renewal required'
                  }
                </p>
                <p className={`text-sm mt-1 ${
                  daysOverdue && daysOverdue > 0 ? 'text-red-700' : 'text-orange-700'
                }`}>
                  {message || 'Your subscription period has ended. Renew to continue enjoying premium features.'}
                </p>
              </div>
            </div>
          </div>

          {subscription && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Amount:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(subscription.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Billing Period:</span>
                <span className="font-medium capitalize">{subscription.billing_period}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{subscription.phone}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network:</span>
                <Badge className={getNetworkColor(subscription.network)}>
                  {subscription.network.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              <span>You'll receive a payment prompt on your phone</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              <span>Complete the payment to reactivate your subscription</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Remind Me Later
            </Button>
            <Button
              onClick={onProceed}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Renew Now'}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Your subscription will remain inactive until payment is completed
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
