import { PaystackService } from './PaystackService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MoMoSubscription {
  id: string;
  clerk_user_id: string;
  tier_id: string;
  phone: string;
  email: string;
  amount: number;
  billing_period: 'monthly' | 'yearly';
  network: 'mtn' | 'vodafone' | 'airteltigo';
  status: 'active' | 'cancelled' | 'expired';
  last_payment_date: string;
  created_at: string;
  updated_at: string;
}

interface PaymentTransaction {
  id: string;
  subscription_id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  paystack_reference?: string;
  gateway_response?: string;
  paid_at?: string;
  created_at: string;
}

export class MoMoRecurringService {
  private paystackService: PaystackService;
  
  constructor() {
    this.paystackService = new PaystackService();
  }

  /**
   * Setup a recurring MoMo subscription
   */
  async setupRecurringSubscription(params: {
    clerkUserId: string;
    phone: string;
    email: string;
    tierId: string;
    billingPeriod: 'monthly' | 'yearly';
    amount: number;
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    message: string;
  }> {
    try {
      // Create subscription record
      const { data: subscription, error } = await supabase
        .from('momo_recurring_subscriptions')
        .insert({
          clerk_user_id: params.clerkUserId,
          tier_id: params.tierId,
          phone: params.phone,
          email: params.email,
          amount: params.amount,
          billing_period: params.billingPeriod,
          network: this.detectNetwork(params.phone),
          status: 'active',
          last_payment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      return {
        success: true,
        subscriptionId: subscription.id,
        message: 'Subscription setup successful'
      };
    } catch (error) {
      console.error('Subscription setup error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Setup failed'
      };
    }
  }

  /**
   * Process a recurring charge for a subscription
   */
  async processRecurringCharge(subscriptionId: string): Promise<{
    success: boolean;
    reference?: string;
    message: string;
  }> {
    try {
      // Get subscription details
      const { data: subscription, error } = await supabase
        .from('momo_recurring_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error || !subscription) {
        throw new Error('Subscription not found');
      }

      // Generate unique reference
      const reference = `momo_charge_${subscriptionId}_${Date.now()}`;

      // Create payment transaction record
      await supabase
        .from('momo_payment_transactions')
        .insert({
          subscription_id: subscriptionId,
          reference: reference,
          amount: subscription.amount,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      // Initialize payment with Paystack
      const paymentResult = await this.paystackService.initializePayment({
        email: subscription.email,
        amount: PaystackService.toPesewa(subscription.amount),
        metadata: {
          clerk_user_id: subscription.clerk_user_id,
          tier_id: subscription.tier_id,
          billing_period: subscription.billing_period,
          subscription_id: subscriptionId,
          phone: subscription.phone,
          recurring: true
        },
        reference: reference,
        callback_url: `${process.env.NEXTAUTH_URL}/api/billing/momo/callback`
      });

      // For MoMo, we need to trigger the mobile money payment
      // This would typically involve calling the mobile money API directly
      // For now, we'll simulate this with Paystack's mobile money channel
      
      return {
        success: true,
        reference: reference,
        message: 'Payment initiated. Please check your phone for payment prompt.'
      };
    } catch (error) {
      console.error('Recurring charge error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Charge failed'
      };
    }
  }

  /**
   * Handle successful payment
   */
  async handleSuccessfulPayment(reference: string, transactionData: any): Promise<void> {
    try {
      // Update payment transaction
      const { data: transaction } = await supabase
        .from('momo_payment_transactions')
        .update({
          status: 'success',
          paystack_reference: transactionData.reference,
          gateway_response: transactionData.gateway_response,
          paid_at: new Date().toISOString()
        })
        .eq('reference', reference)
        .select()
        .single();

      if (transaction) {
        // Update subscription last payment date
        await supabase
          .from('momo_recurring_subscriptions')
          .update({
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', transaction.subscription_id);

        // Update user's subscription tier if this was successful
        if (transactionData.metadata?.clerk_user_id && transactionData.metadata?.tier_id) {
          await supabase
            .from('user_subscriptions')
            .upsert({
              clerk_user_id: transactionData.metadata.clerk_user_id,
              tier_id: transactionData.metadata.tier_id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: this.calculatePeriodEnd(transactionData.metadata.billing_period),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'clerk_user_id'
            });
        }

        console.log(`MoMo payment successful: ${reference}`);
      }
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(reference: string, reason: string): Promise<void> {
    try {
      // Update payment transaction
      const { data: transaction } = await supabase
        .from('momo_payment_transactions')
        .update({
          status: 'failed',
          gateway_response: reason
        })
        .eq('reference', reference)
        .select()
        .single();

      if (transaction) {
        // Check if this was the first payment for a subscription
        const { data: subscription } = await supabase
          .from('momo_recurring_subscriptions')
          .select('*')
          .eq('id', transaction.subscription_id)
          .single();

        if (subscription) {
          // If multiple consecutive failures, consider cancelling
          const { data: recentFailures } = await supabase
            .from('momo_payment_transactions')
            .select('*')
            .eq('subscription_id', transaction.subscription_id)
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(3);

          if (recentFailures && recentFailures.length >= 3) {
            // Cancel subscription after 3 consecutive failures
            await this.cancelSubscription(transaction.subscription_id);
            console.log(`Subscription ${transaction.subscription_id} cancelled due to repeated payment failures`);
          }
        }

        console.log(`MoMo payment failed: ${reference} - ${reason}`);
      }
    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      // Update subscription status
      const { error } = await supabase
        .from('momo_recurring_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      // Get subscription to update user tier
      const { data: subscription } = await supabase
        .from('momo_recurring_subscriptions')
        .select('clerk_user_id')
        .eq('id', subscriptionId)
        .single();

      if (subscription) {
        // Downgrade user to free tier
        await supabase
          .from('user_subscriptions')
          .update({
            tier_id: 'free',
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', subscription.clerk_user_id);
      }

      console.log(`Subscription ${subscriptionId} cancelled successfully`);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Detect mobile network from phone number
   */
  private detectNetwork(phone: string): 'mtn' | 'vodafone' | 'airteltigo' {
    // Remove country code and leading zero
    const cleanPhone = phone.replace(/^\+233|^0/, '');
    
    // MTN prefixes
    if (['24', '25', '53', '54', '55', '59'].some(prefix => cleanPhone.startsWith(prefix))) {
      return 'mtn';
    }
    
    // Vodafone prefixes  
    if (['20', '50', '23', '28', '29'].some(prefix => cleanPhone.startsWith(prefix))) {
      return 'vodafone';
    }
    
    // AirtelTigo prefixes
    if (['26', '27', '56', '57'].some(prefix => cleanPhone.startsWith(prefix))) {
      return 'airteltigo';
    }
    
    // Default to MTN if unknown
    return 'mtn';
  }

  /**
   * Calculate period end date based on billing period
   */
  private calculatePeriodEnd(billingPeriod: string): string {
    const now = new Date();
    if (billingPeriod === 'yearly') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  }
}
