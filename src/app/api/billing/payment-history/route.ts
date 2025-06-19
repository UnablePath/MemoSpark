import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch payment history for the user
    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select(`
        id,
        reference,
        amount,
        currency,
        tier_id,
        billing_period,
        status,
        paid_at,
        gateway_response,
        created_at,
        metadata
      `)
      .eq('clerk_user_id', clerkUserId)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching payment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    // Get tier names for the payments
    const tierIds = [...new Set(payments?.map(p => p.tier_id) || [])];
    const { data: tiers } = await supabase
      .from('subscription_tiers')
      .select('id, display_name')
      .in('id', tierIds);

    const tierMap = new Map(tiers?.map(tier => [tier.id, tier.display_name]) || []);

    // Enhance payment data with tier names
    const enhancedPayments = payments?.map(payment => ({
      ...payment,
      tier_name: tierMap.get(payment.tier_id) || payment.tier_id
    })) || [];

    return NextResponse.json(enhancedPayments);

  } catch (error) {
    console.error('Payment history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 