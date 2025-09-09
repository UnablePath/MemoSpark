import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MoMoRecurringService } from '@/lib/payments/MoMoRecurringService';
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
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }

    // Verify the subscription belongs to the user
    const { data: subscription, error } = await supabase
      .from('momo_recurring_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or access denied' },
        { status: 404 }
      );
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    // Cancel the subscription
    const momoService = new MoMoRecurringService();
    await momoService.cancelSubscription(subscriptionId);

    return NextResponse.json({
      success: true,
      message: 'MoMo recurring subscription cancelled successfully'
    });

  } catch (error) {
    console.error('MoMo subscription cancellation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

