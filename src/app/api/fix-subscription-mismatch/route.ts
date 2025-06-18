import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 [FIX] Cleaning up subscription mismatch for user:', userId);

    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not available',
        message: 'Cannot clean subscription data'
      }, { status: 500 });
    }

    // Step 1: Clear any stale subscription records
    const { data: existingSubscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('external_user_id', userId);

    if (fetchError) {
      console.error('❌ [FIX] Error fetching subscriptions:', fetchError);
    } else {
      console.log('📊 [FIX] Found existing subscriptions:', existingSubscriptions?.length || 0);
    }

    // Step 2: Mark all existing subscriptions as inactive
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString(),
        notes: 'Cleaned up due to subscription mismatch'
      })
      .eq('external_user_id', userId);

    if (updateError) {
      console.error('❌ [FIX] Error updating subscriptions:', updateError);
      return NextResponse.json({ 
        error: 'Failed to clean subscription data',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('✅ [FIX] Successfully cleaned up stale subscription data');

    return NextResponse.json({
      success: true,
      message: 'Subscription mismatch fixed',
      action: 'Cleared stale subscription records',
      nextSteps: [
        '1. Refresh the page',
        '2. Check browser notification permission (should be "Allow")',
        '3. Try subscribing again from Settings or OneSignal test page',
        '4. You should see the browser permission prompt again'
      ]
    });

  } catch (error) {
    console.error('❌ [FIX] Error fixing subscription mismatch:', error);
    return NextResponse.json({ 
      error: 'Failed to fix subscription mismatch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 