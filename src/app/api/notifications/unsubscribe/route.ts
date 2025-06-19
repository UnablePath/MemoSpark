import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    // Verify the userId matches the authenticated user
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`🔕 Unsubscribing user: ${userId}`);

    // Update all active subscriptions for this user to inactive
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('external_user_id', userId)
      .eq('is_active', true)
      .select();

    if (error) {
      console.error('❌ Database unsubscribe error:', error);
      return NextResponse.json({ 
        error: 'Failed to unsubscribe',
        details: error.message 
      }, { status: 500 });
    }

    const updatedCount = data?.length || 0;
    console.log(`✅ Unsubscribed ${updatedCount} subscription(s) for user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully unsubscribed ${updatedCount} subscription(s)`,
      updatedCount
    });

  } catch (error) {
    console.error('❌ Unsubscription error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 