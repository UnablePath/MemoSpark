import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const supabase = getSupabaseAdmin()!;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🔍 Checking subscription for user: ${userId}`);

    // Check if user has active subscription
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('onesignal_player_id, is_active')
      .eq('external_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error checking subscription:', error);
      return NextResponse.json({ 
        error: 'Failed to check subscription',
        details: error.message 
      }, { status: 500 });
    }

    const hasSubscription = !!subscription?.onesignal_player_id;
    console.log(`${hasSubscription ? '✅' : '❌'} Subscription status for ${userId}: ${hasSubscription ? 'Active' : 'None'}`);

    return NextResponse.json({ 
      hasActiveSubscription: hasSubscription,
      playerId: subscription?.onesignal_player_id || null
    });

  } catch (error) {
    console.error('❌ Subscription check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 