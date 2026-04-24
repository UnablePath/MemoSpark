import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_ONESIGNAL_APP_ID: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
}

// Use service role for database operations (only if available)
const supabase = requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL && requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL,
      requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export async function POST(request: NextRequest) {
  try {
    const { userId: actorId } = await auth();
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables first
    if (missingEnvVars.length > 0) {
      console.error('❌ Cannot send notification - missing environment variables:', missingEnvVars);
      return NextResponse.json({ 
        error: 'Server configuration error'
      }, { status: 500 });
    }

    if (!supabase) {
      console.error('❌ Cannot initialize Supabase client');
      return NextResponse.json({ 
        error: 'Database connection error' 
      }, { status: 500 });
    }

    const { userId, notification } = await request.json();

    if (!userId || !notification) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, notification' 
      }, { status: 400 });
    }
    const targetUserId = String(userId);

    // Authorization guard: sender can notify self, accepted connection, or a user in the same group context.
    let isAuthorized = actorId === targetUserId;
    if (!isAuthorized) {
      const { data: connected } = await supabase
        .from('connections')
        .select('id')
        .or(
          `and(requester_id.eq.${actorId},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${actorId})`,
        )
        .eq('status', 'accepted')
        .maybeSingle();
      isAuthorized = Boolean(connected);
    }

    const groupId = notification?.data?.groupId || notification?.data?.group_id;
    if (!isAuthorized && typeof groupId === 'string') {
      const { data: actorMembership } = await supabase
        .from('study_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', actorId)
        .maybeSingle();
      const { data: targetMembership } = await supabase
        .from('study_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', targetUserId)
        .maybeSingle();
      isAuthorized = Boolean(actorMembership && targetMembership);
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`📨 Sending immediate OneSignal notification to user: ${targetUserId}`);

    // Get user's OneSignal player ID from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('onesignal_player_id')
      .eq('external_user_id', targetUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (subscriptionError) {
      console.error('❌ Error fetching subscription:', subscriptionError);
      return NextResponse.json({ 
        error: 'Failed to fetch user subscription'
      }, { status: 500 });
    }

    if (!subscription?.onesignal_player_id) {
      console.log(`❌ No active OneSignal subscription found for user: ${targetUserId}`);
      return NextResponse.json({ 
        error: 'No active OneSignal subscription found for user',
        hasSubscription: false
      }, { status: 404 });
    }

    const playerId = subscription.onesignal_player_id;
    console.log(`🎯 Found player ID: ${playerId}`);

    // Prepare OneSignal notification payload according to REST API docs
    const oneSignalPayload = {
      app_id: requiredEnvVars.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      include_player_ids: [playerId],
      contents: notification.contents || { en: 'You have a new notification' },
      headings: notification.headings || { en: 'MemoSpark' },
      data: notification.data || {},
      url: notification.url,
      priority: notification.priority || 5,
      ttl: 259200, // 3 days in seconds
      
      // iOS-specific APNS configuration for better delivery
      ios_sound: notification.ios_sound || 'default',
      ios_category: notification.ios_category || 'MEMOSPARK_NOTIFICATION',
      ios_badgeType: notification.ios_badgeType || 'Increase',
      ios_badgeCount: notification.ios_badgeCount,
      ios_interruption_level: notification.ios_interruption_level || 'active',
      mutable_content: true, // Enable notification service extensions
      content_available: notification.content_available || false,
      
      // Enhanced APNS alert configuration
      apns_alert: {
        title: notification.headings?.en || 'MemoSpark',
        subtitle: notification.apns_alert?.subtitle,
        body: notification.contents?.en || 'You have a new notification'
      },
      
      ...(notification.buttons && { buttons: notification.buttons })
    };

    // Only add android_channel_id if specifically provided, otherwise let OneSignal use default
    if (notification.android_channel_id) {
      oneSignalPayload.android_channel_id = notification.android_channel_id;
    }

    console.log("🚀 Sending immediate notification to OneSignal API:", {
      app_id: oneSignalPayload.app_id,
      include_player_ids: oneSignalPayload.include_player_ids,
      contents: oneSignalPayload.contents,
      headings: oneSignalPayload.headings,
      priority: oneSignalPayload.priority,
      android_channel_id: oneSignalPayload.android_channel_id || 'not set'
    });

    // Send to OneSignal REST API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${requiredEnvVars.ONESIGNAL_REST_API_KEY!}`,
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('❌ OneSignal API error:', {
        status: oneSignalResponse.status,
        response: oneSignalResult,
        payload: oneSignalPayload
      });
      return NextResponse.json({ 
        error: 'OneSignal API error',
        oneSignalStatus: oneSignalResponse.status
      }, { status: 502 });
    }

    console.log('✅ OneSignal notification sent successfully:', oneSignalResult);

    // Store the sent notification in our database for tracking
    const { error: trackingError } = await supabase
      .from('notification_queue')
      .insert({
        clerk_user_id: targetUserId,
        onesignal_notification_id: oneSignalResult.id,
        title: notification.headings?.en || 'Notification',
        body: notification.contents?.en || 'You have a notification',
        scheduled_for: new Date().toISOString(),
        status: 'sent',
        data: notification.data || {},
        onesignal_player_id: playerId
      });

    if (trackingError) {
      console.warn('⚠️ Failed to store notification tracking:', trackingError);
      // Don't fail the request for tracking errors
    }

    return NextResponse.json({ 
      success: true,
      oneSignalId: oneSignalResult.id,
      recipients: oneSignalResult.recipients,
      playerId,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('❌ Notification sending error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
    }, { status: 500 });
  }
} 