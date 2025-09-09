import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MoMoRecurringService } from '@/lib/payments/MoMoRecurringService';
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
    const { tierId, billingPeriod, phone, email } = body;

    // Validate required fields
    if (!tierId || !billingPeriod || !phone || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, billingPeriod, phone, email' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period. Must be monthly or yearly' },
        { status: 400 }
      );
    }

    // Validate phone number format (Ghana)
    const phoneRegex = /^(\+233|0)[2-9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid Ghana phone number format' },
        { status: 400 }
      );
    }

    // Get subscription tier details
    const tierManager = new SubscriptionTierManager(supabase);
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

    // Check if user already has an active MoMo subscription
    const { data: existingSubscription } = await supabase
      .from('momo_recurring_subscriptions')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'You already have an active MoMo recurring subscription' },
        { status: 409 }
      );
    }

    // Setup recurring subscription
    const momoService = new MoMoRecurringService();
    const result = await momoService.setupRecurringSubscription({
      clerkUserId,
      phone,
      email,
      tierId,
      billingPeriod,
      amount
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Process the first payment immediately
    try {
      const firstPayment = await momoService.processRecurringCharge(result.subscriptionId!);
      
      return NextResponse.json({
        success: true,
        message: 'MoMo recurring subscription setup successfully',
        data: {
          subscriptionId: result.subscriptionId,
          firstPaymentReference: firstPayment.reference,
          amount: amount,
          billingPeriod,
          phone,
          tier: selectedTier.display_name,
          instructions: 'Please check your phone for the payment prompt and approve the transaction.'
        }
      });
    } catch (paymentError) {
      // Subscription was created but first payment failed
      return NextResponse.json({
        success: true,
        message: 'Subscription created but first payment failed',
        data: {
          subscriptionId: result.subscriptionId,
          error: paymentError instanceof Error ? paymentError.message : 'Payment failed',
          amount: amount,
          billingPeriod,
          phone,
          tier: selectedTier.display_name
        }
      });
    }

  } catch (error) {
    console.error('MoMo recurring setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup recurring subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

