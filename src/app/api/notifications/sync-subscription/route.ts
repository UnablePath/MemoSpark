import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const supabase = getSupabaseAdmin()!;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.log('Subscription sync: Empty request body received');
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Subscription sync: Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { userId, playerId, deviceType = 'web' } = body;

    // Verify the userId matches the authenticated user
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    console.log(`🔄 Syncing subscription: User ${userId} -> Player ${playerId}`);

    // Verify the user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('clerk_user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to find user profile:', profileError);
      return NextResponse.json({ 
        error: 'User profile not found',
        details: 'Please ensure your profile is properly set up'
      }, { status: 404 });
    }

    // First check if a subscription already exists for this user
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, onesignal_player_id')
      .eq('external_user_id', userId)
      .maybeSingle(); // Use maybeSingle to avoid error when no record found

    if (fetchError) {
      console.error('❌ Error checking existing subscription:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to check existing subscription',
        details: fetchError.message 
      }, { status: 500 });
    }

    let data, error;

    if (existingSubscription) {
      // Update existing subscription
      console.log(`🔄 Updating existing subscription ID: ${existingSubscription.id}`);
      const updateResult = await supabase
        .from('push_subscriptions')
        .update({
          onesignal_player_id: playerId,
          device_type: deviceType,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id)
        .select();
      
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Create new subscription
      console.log(`🆕 Creating new subscription for user: ${userId}`);
      const insertResult = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId, // Clerk user ID (now references profiles.clerk_user_id)
          external_user_id: userId, // Clerk user ID
          onesignal_player_id: playerId,
          device_type: deviceType,
          is_active: true,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select();
      
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('❌ Database sync error:', error);
      
      // Handle duplicate key constraint specifically
      if (error.code === '23505' && error.message.includes('unique_external_user_id')) {
        console.log('⚠️ Subscription already exists, attempting to update instead...');
        
        // Try to update the existing record
        const { data: updateData, error: updateError } = await supabase
          .from('push_subscriptions')
          .update({
            onesignal_player_id: playerId,
            device_type: deviceType,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('external_user_id', userId)
          .select();
        
        if (updateError) {
          console.error('❌ Failed to update existing subscription:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update subscription',
            details: updateError.message 
          }, { status: 500 });
        }
        
        console.log('✅ Subscription updated successfully:', updateData);
        return NextResponse.json({ 
          success: true, 
          message: 'Subscription updated successfully',
          data: updateData 
        });
      }
      
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