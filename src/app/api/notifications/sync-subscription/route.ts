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

    const { userId, playerId, deviceType = 'web' } = await request.json();

    // Verify the userId matches the authenticated user
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    console.log(`🔄 Syncing subscription: User ${userId} -> Player ${playerId}`);

    // Upsert the subscription record
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        external_user_id: userId, // Clerk user ID
        clerk_user_id: userId, // Also store in clerk_user_id field
        onesignal_player_id: playerId,
        device_type: deviceType,
        is_active: true,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString() // Will be ignored if record exists
      }, {
        onConflict: 'external_user_id,onesignal_player_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('❌ Database sync error:', error);
      return NextResponse.json({ 
        error: 'Failed to sync subscription',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ Subscription synced successfully:', data);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription synced successfully',
      data 
    });

  } catch (error) {
    console.error('❌ Subscription sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 