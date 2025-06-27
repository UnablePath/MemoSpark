import { createHash, createHmac } from 'crypto';

interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

interface PaystackCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customer_code: string;
  phone: string | null;
  metadata: any;
  risk_action: string;
}

interface PaystackTransaction {
  id: number;
  domain: string;
  status: 'success' | 'failed' | 'pending';
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: any;
  log: any;
  fees: number;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: PaystackCustomer;
  plan: any;
}

interface InitializePaymentParams {
  email: string;
  amount: number; // In kobo (smallest currency unit)
  metadata?: {
    clerk_user_id: string;
    tier_id: string;
    billing_period: 'monthly' | 'yearly';
    [key: string]: any;
  };
  callback_url?: string;
  reference?: string;
}

interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  description: string | null;
  amount: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'annually';
  send_invoices: boolean;
  send_sms: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface CreateSubscriptionParams {
  customer: string; // Customer email or customer code
  plan: string; // Plan code
  authorization?: string; // Authorization code for card payments
  start_date?: string; // ISO 8601 date
}

export class PaystackService {
  private config: PaystackConfig;

  constructor() {
    this.config = {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      baseUrl: 'https://api.paystack.co'
    };

    if (!this.config.publicKey || !this.config.secretKey) {
      console.warn('Paystack keys not configured properly');
    }
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(params: InitializePaymentParams): Promise<{
    status: boolean;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          metadata: params.metadata || {},
          callback_url: params.callback_url || `${process.env.NEXTAUTH_URL}/api/billing/paystack/callback`,
          reference: params.reference || this.generateReference(),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      return data;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<{
    status: boolean;
    message: string;
    data: PaystackTransaction;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify payment');
      }

      return data;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  /**
   * Create a customer on Paystack
   */
  async createCustomer(email: string, firstName?: string, lastName?: string, phone?: string): Promise<{
    status: boolean;
    message: string;
    data: PaystackCustomer;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create customer');
      }

      return data;
    } catch (error) {
      console.error('Paystack customer creation error:', error);
      throw error;
    }
  }

  /**
   * Create a subscription plan
   */
  async createPlan(
    name: string,
    amount: number,
    interval: 'monthly' | 'annually',
    description?: string
  ): Promise<{
    status: boolean;
    message: string;
    data: PaystackPlan;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          amount: amount, // Amount in kobo
          interval,
          description,
          currency: 'NGN', // Nigerian Naira - change as needed
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create plan');
      }

      return data;
    } catch (error) {
      console.error('Paystack plan creation error:', error);
      throw error;
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subscription');
      }

      return data;
    } catch (error) {
      console.error('Paystack subscription creation error:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionCode: string): Promise<{
    status: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/subscription/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: subscriptionCode,
          token: subscriptionCode, // Required for cancellation
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      return data;
    } catch (error) {
      console.error('Paystack subscription cancellation error:', error);
      throw error;
    }
  }

  /**
   * Get customer subscriptions
   */
  async getCustomerSubscriptions(customerCode: string): Promise<{
    status: boolean;
    message: string;
    data: any[];
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/customer/${customerCode}/subscriptions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get customer subscriptions');
      }

      return data;
    } catch (error) {
      console.error('Paystack get subscriptions error:', error);
      throw error;
    }
  }

  /**
   * Generate a unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ss_${timestamp}_${random}`;
  }

  /**
   * Convert amount to pesewa (Ghana Cedis smallest currency unit)
   */
  static toPesewa(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from pesewa to Ghana Cedis
   */
  static fromPesewa(amount: number): number {
    return amount / 100;
  }

  /**
   * Convert amount to kobo (for backward compatibility)
   */
  static toKobo(amount: number): number {
    return this.toPesewa(amount);
  }

  /**
   * Convert amount from kobo (for backward compatibility)
   */
  static fromKobo(amount: number): number {
    return this.fromPesewa(amount);
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = createHmac('sha512', this.config.secretKey)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }

  /**
   * Get public key for frontend use
   */
  getPublicKey(): string {
    return this.config.publicKey;
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(transaction: string | number): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to refund transaction');
      }
      return data;
    } catch (error) {
      console.error('Paystack refund error:', error);
      throw error;
    }
  }

  /**
   * Charge a saved authorization for recurring billing
   */
  async chargeAuthorization(params: {
    authorization_code: string;
    email: string;
    amount: number; // In kobo (smallest currency unit)
    metadata?: any;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/transaction/charge_authorization`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorization_code: params.authorization_code,
          email: params.email,
          amount: params.amount,
          metadata: params.metadata || {},
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to charge authorization');
      }
      return data;
    } catch (error) {
      console.error('Paystack charge authorization error:', error);
      throw error;
    }
  }
} 