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
}

export class SimpleMoMoRecurring {
  private paystackService: PaystackService;
  
  constructor() {
    this.paystackService = new PaystackService();
  }

  /**
   * Setup a simple recurring MoMo subscription
   */
  async setupSubscription(params: {
    clerkUserId: string;
    phone: string;
    email: string;
    tierId: string;
    billingPeriod: 'monthly' | 'yearly';
    amount: number;
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    paymentUrl?: string;
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

      // Initialize first payment
      const reference = `momo_first_${subscription.id}_${Date.now()}`;
      const paymentResult = await this.paystackService.initializePayment({
        email: params.email,
        amount: PaystackService.toPesewa(params.amount),
        metadata: {
          clerk_user_id: params.clerkUserId,
          tier_id: params.tierId,
          billing_period: params.billingPeriod,
          subscription_id: subscription.id,
          phone: params.phone,
          is_recurring: true,
          is_first_payment: true
        },
        reference: reference,
        callback_url: `${process.env.NEXTAUTH_URL}/api/billing/momo/simple-callback`
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        paymentUrl: paymentResult.data.authorization_url,
        message: 'Subscription created! Complete your first payment to activate.'
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
   * Check if user's subscription needs renewal (called when they visit the app)
   */
  async checkSubscriptionStatus(clerkUserId: string): Promise<{
    needsPayment: boolean;
    subscription?: MoMoSubscription;
    paymentUrl?: string;
    daysOverdue?: number;
    message?: string;
  }> {
    try {
      // Get user's active subscription
      const { data: subscription, error } = await supabase
        .from('momo_recurring_subscriptions')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('status', 'active')
        .single();

      if (error || !subscription) {
        return { needsPayment: false };
      }

      // Check if billing period has expired
      const lastPaymentDate = new Date(subscription.last_payment_date);
      const now = new Date();
      
      let nextPaymentDue: Date;
      if (subscription.billing_period === 'yearly') {
        nextPaymentDue = new Date(lastPaymentDate);
        nextPaymentDue.setFullYear(nextPaymentDue.getFullYear() + 1);
      } else {
        nextPaymentDue = new Date(lastPaymentDate);
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
      }

      // If payment is due or overdue
      if (now >= nextPaymentDue) {
        const daysOverdue = Math.floor((now.getTime() - nextPaymentDue.getTime()) / (1000 * 60 * 60 * 24));
        
        // Generate new payment URL
        const reference = `momo_renewal_${subscription.id}_${Date.now()}`;
        const paymentResult = await this.paystackService.initializePayment({
          email: subscription.email,
          amount: PaystackService.toPesewa(subscription.amount),
          metadata: {
            clerk_user_id: subscription.clerk_user_id,
            tier_id: subscription.tier_id,
            billing_period: subscription.billing_period,
            subscription_id: subscription.id,
            phone: subscription.phone,
            is_recurring: true,
            is_renewal: true
          },
          reference: reference,
          callback_url: `${process.env.NEXTAUTH_URL}/api/billing/momo/simple-callback`
        });

        const message = daysOverdue === 0 
          ? `Your ${subscription.billing_period} subscription is due today.`
          : `Your ${subscription.billing_period} subscription is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`;

        return {
          needsPayment: true,
          subscription,
          paymentUrl: paymentResult.data.authorization_url,
          daysOverdue,
          message
        };
      }

      return { needsPayment: false, subscription };
    } catch (error) {
      console.error('Subscription check error:', error);
      return { needsPayment: false };
    }
  }

  /**
   * Handle successful payment and update subscription
   */
  async handleSuccessfulPayment(reference: string, transactionData: any): Promise<void> {
    try {
      const subscriptionId = transactionData.metadata.subscription_id;
      
      if (!subscriptionId) {
        throw new Error('No subscription ID in transaction metadata');
      }

      // Update subscription with new payment date
      await supabase
        .from('momo_recurring_subscriptions')
        .update({
          last_payment_date: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      // Update user's main subscription
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      
      if (transactionData.metadata.billing_period === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await supabase
        .from('user_subscriptions')
        .upsert({
          clerk_user_id: transactionData.metadata.clerk_user_id,
          tier_id: transactionData.metadata.tier_id,
          status: 'active',
          current_period_start: currentDate.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`Subscription renewed successfully: ${subscriptionId}`);
    } catch (error) {
      console.error('Payment success handling error:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, clerkUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('momo_recurring_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      return false;
    }
  }

  /**
   * Get user's subscription info
   */
  async getUserSubscription(clerkUserId: string): Promise<MoMoSubscription | null> {
    try {
      const { data: subscription, error } = await supabase
        .from('momo_recurring_subscriptions')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .in('status', ['active', 'expired'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !subscription) {
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Get subscription error:', error);
      return null;
    }
  }

  /**
   * Calculate days until next payment
   */
  getDaysUntilNextPayment(subscription: MoMoSubscription): number {
    const lastPaymentDate = new Date(subscription.last_payment_date);
    const now = new Date();
    
    let nextPaymentDue: Date;
    if (subscription.billing_period === 'yearly') {
      nextPaymentDue = new Date(lastPaymentDate);
      nextPaymentDue.setFullYear(nextPaymentDue.getFullYear() + 1);
    } else {
      nextPaymentDue = new Date(lastPaymentDate);
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
    }

    const diffTime = nextPaymentDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Detect network from phone number
   */
  private detectNetwork(phone: string): 'mtn' | 'vodafone' | 'airteltigo' {
    const cleanPhone = phone.replace(/^\+233/, '').replace(/^0/, '');
    const prefix = cleanPhone.substring(0, 2);
    
    const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];
    const vodafonePrefixes = ['20', '50'];
    
    if (mtnPrefixes.includes(prefix)) return 'mtn';
    if (vodafonePrefixes.includes(prefix)) return 'vodafone';
    return 'airteltigo';
  }
}
