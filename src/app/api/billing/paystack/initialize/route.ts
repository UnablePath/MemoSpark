import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tierId, billingPeriod, userEmail } = body;

    if (!tierId || !billingPeriod || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, billingPeriod, userEmail' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period. Must be monthly or yearly' },
        { status: 400 }
      );
    }

    // Get subscription tier details
    const tierManager = new SubscriptionTierManager();
    const tiers = await tierManager.getAvailableTiers();
    const selectedTier = tiers.find(tier => tier.id === tierId);

    if (!selectedTier) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Calculate amount based on billing period
    const amount = billingPeriod === 'yearly' 
      ? selectedTier.price_yearly 
      : selectedTier.price_monthly;

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid subscription amount' },
        { status: 400 }
      );
    }

    // Initialize payment with Paystack
    const paystackService = new PaystackService();
    const paymentData = await paystackService.initializePayment({
      email: userEmail,
      amount: PaystackService.toPesewa(amount), // Convert to pesewa (Ghana Cedis)
      metadata: {
        clerk_user_id: clerkUserId,
        tier_id: tierId,
        billing_period: billingPeriod,
        tier_name: selectedTier.display_name,
        amount_ghs: amount
      },
      callback_url: `${process.env.NEXTAUTH_URL}/api/billing/paystack/callback`
    });

    // Store payment record in database
    const { error: dbError } = await supabase
      .from('payment_transactions')
      .insert({
        clerk_user_id: clerkUserId,
        reference: paymentData.data.reference,
        amount: amount,
        currency: 'GHS',
        tier_id: tierId,
        billing_period: billingPeriod,
        status: 'pending',
        payment_provider: 'paystack',
        metadata: {
          access_code: paymentData.data.access_code,
          tier_name: selectedTier.display_name
        }
      });

    if (dbError) {
      console.error('Database error storing payment record:', dbError);
      // Continue anyway - payment can still proceed
    }

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paymentData.data.authorization_url,
        access_code: paymentData.data.access_code,
        reference: paymentData.data.reference,
        amount: amount,
        tier: selectedTier.display_name,
        billing_period: billingPeriod
      }
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 