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
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { clerkUserId, tierId, billingPeriod } = await request.json();

    // Verify the requesting user matches the user being charged
    if (userId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - user mismatch' },
        { status: 401 }
      );
    }

    if (!clerkUserId || !tierId || !billingPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields (clerkUserId, tierId, billingPeriod)' },
        { status: 400 }
      );
    }

    // Get user's saved authorization
    const { data: authorization, error: authError } = await supabase
      .from('payment_authorizations')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('reusable', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (authError || !authorization) {
      return NextResponse.json(
        { error: 'No saved payment method found for recurring billing' },
        { status: 404 }
      );
    }

    // Get tier details for pricing
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

    // Charge the authorization
    const paystack = new PaystackService();
    const chargeResult = await paystack.chargeAuthorization({
      authorization_code: authorization.authorization_code,
      email: authorization.email,
      amount: PaystackService.toPesewa(amount), // Convert to pesewa
      metadata: {
        clerk_user_id: clerkUserId,
        tier_id: tierId,
        billing_period: billingPeriod,
        tier_name: selectedTier.display_name,
        amount_ghs: amount,
        recurring: true
      }
    });

    if (!chargeResult.status || chargeResult.data.status !== 'success') {
      return NextResponse.json(
        { error: 'Recurring charge failed', details: chargeResult },
        { status: 400 }
      );
    }

    // Update subscription period on success
    const currentDate = new Date();
    const periodEnd = new Date(currentDate);
    
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update subscription
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('clerk_user_id', clerkUserId)
      .eq('status', 'active');

    if (subError) {
      console.error('Failed to update subscription after successful charge:', subError);
    }

    // Log the transaction
    await supabase
      .from('payment_transactions')
      .insert({
        clerk_user_id: clerkUserId,
        reference: chargeResult.data.reference,
        amount: amount,
        currency: 'GHS',
        tier_id: tierId,
        billing_period: billingPeriod,
        status: 'completed',
        payment_provider: 'paystack',
        paid_at: chargeResult.data.paid_at || new Date().toISOString(),
        gateway_response: chargeResult.data.gateway_response,
        metadata: {
          recurring: true,
          tier_name: selectedTier.display_name,
          authorization_code: authorization.authorization_code
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Recurring charge processed successfully',
      transaction: chargeResult.data,
      next_billing_date: periodEnd.toISOString()
    });

  } catch (error) {
    console.error('Recurring charge error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process recurring charge',
        details: error instanceof Error ? error.message : error
      },
      { status: 500 }
    );
  }
} 