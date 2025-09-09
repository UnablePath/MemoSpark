import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

interface MoMoRecurringSetupProps {
  selectedTier: {
    id: string;
    display_name: string;
    price_monthly: number;
    price_yearly: number;
  };
  onSuccess?: (subscriptionId: string) => void;
  onCancel?: () => void;
}

export const MoMoRecurringSetup: React.FC<MoMoRecurringSetupProps> = ({
  selectedTier,
  onSuccess,
  onCancel
}) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'vodafone' | 'airteltigo'>('mtn');
  const [setupComplete, setSetupComplete] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const detectNetworkFromPhone = (phoneNumber: string): 'mtn' | 'vodafone' | 'airteltigo' => {
    const cleanPhone = phoneNumber.replace(/^\+233/, '').replace(/^0/, '');
    const prefix = cleanPhone.substring(0, 2);
    
    const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];
    const vodafonePrefixes = ['20', '50'];
    const airteltigoPrefixes = ['26', '27', '56', '57'];
    
    if (mtnPrefixes.includes(prefix)) return 'mtn';
    if (vodafonePrefixes.includes(prefix)) return 'vodafone';
    return 'airteltigo';
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (value.length >= 10) {
      const detectedNetwork = detectNetworkFromPhone(value);
      setNetwork(detectedNetwork);
    }
  };

  const validatePhoneNumber = (phoneNumber: string): boolean => {
    const phoneRegex = /^(\+233|0)[2-9][0-9]{8}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handleSetupRecurring = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) {
      toast.error('Email address is required');
      return;
    }

    if (!validatePhoneNumber(phone)) {
      toast.error('Please enter a valid Ghana phone number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/billing/momo/setup-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId: selectedTier.id,
          billingPeriod,
          phone,
          email: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup recurring subscription');
      }

      setSubscriptionId(data.data.subscriptionId);
      setSetupComplete(true);
      
      toast.success('Recurring subscription setup successfully!');
      
      if (onSuccess) {
        onSuccess(data.data.subscriptionId);
      }

    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentAmount = billingPeriod === 'yearly' 
    ? selectedTier.price_yearly 
    : selectedTier.price_monthly;

  const yearlyDiscount = selectedTier.price_yearly < (selectedTier.price_monthly * 12);
  const discountPercentage = yearlyDiscount 
    ? Math.round(((selectedTier.price_monthly * 12 - selectedTier.price_yearly) / (selectedTier.price_monthly * 12)) * 100)
    : 0;

  if (setupComplete) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Setup Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your recurring MoMo subscription has been set up successfully.
          </p>
          
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Payment Instructions</span>
            </div>
            <p className="text-sm text-blue-800">
              Check your phone ({phone}) for the payment prompt and approve the first payment.
              Future payments will be processed automatically.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{selectedTier.display_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">{formatCurrency(currentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Billing:</span>
              <span className="font-medium capitalize">{billingPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span>Phone:</span>
              <span className="font-medium">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="font-medium uppercase">{network}</span>
            </div>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full">
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Setup MoMo Recurring Payment
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{selectedTier.display_name}</span>
          <Badge variant="secondary">
            {formatCurrency(currentAmount)}/{billingPeriod === 'yearly' ? 'year' : 'month'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Billing Period Selection */}
        <div className="space-y-2">
          <Label>Billing Period</Label>
          <Select value={billingPeriod} onValueChange={(value: 'monthly' | 'yearly') => setBillingPeriod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">
                Monthly - {formatCurrency(selectedTier.price_monthly)}
              </SelectItem>
              <SelectItem value="yearly">
                <div className="flex items-center justify-between w-full">
                  <span>Yearly - {formatCurrency(selectedTier.price_yearly)}</span>
                  {yearlyDiscount && (
                    <Badge variant="secondary" className="ml-2">
                      Save {discountPercentage}%
                    </Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {billingPeriod === 'yearly' && yearlyDiscount && (
            <p className="text-xs text-green-600">
              Save {formatCurrency(selectedTier.price_monthly * 12 - selectedTier.price_yearly)} per year!
            </p>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile Money Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+233 24 123 4567"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter your Ghana mobile money number (MTN, Vodafone, or AirtelTigo)
          </p>
        </div>

        {/* Network Selection */}
        <div className="space-y-2">
          <Label>Mobile Network</Label>
          <Select value={network} onValueChange={(value: 'mtn' | 'vodafone' | 'airteltigo') => setNetwork(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mtn">MTN Mobile Money</SelectItem>
              <SelectItem value="vodafone">Vodafone Cash</SelectItem>
              <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Warning Message */}
        <div className="rounded-lg bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="space-y-1">
                <li>• You'll receive a payment prompt on your phone for approval</li>
                <li>• Future payments will be processed automatically</li>
                <li>• You can cancel anytime from your account settings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSetupRecurring}
            disabled={isLoading || !phone || !validatePhoneNumber(phone)}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Setup Recurring Payment'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

