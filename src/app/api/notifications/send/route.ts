import { NextRequest, NextResponse } from 'next/server';
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
    // Check environment variables first
    if (missingEnvVars.length > 0) {
      console.error('❌ Cannot send notification - missing environment variables:', missingEnvVars);
      return NextResponse.json({ 
        error: 'Server configuration error - missing environment variables',
        missingVars: missingEnvVars
      }, { status: 500 });
    }

    if (!supabase) {
      console.error('❌ Cannot initialize Supabase client');
      return NextResponse.json({ 
        error: 'Database connection error' 
      }, { status: 500 });
    }

    const { 
      userId, 
      notification 
    } = await request.json();

    if (!userId || !notification) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, notification' 
      }, { status: 400 });
    }

    console.log(`📨 Sending immediate OneSignal notification to user: ${userId}`);

    // Get user's OneSignal player ID from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('onesignal_player_id')
      .eq('external_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (subscriptionError) {
      console.error('❌ Error fetching subscription:', subscriptionError);
      return NextResponse.json({ 
        error: 'Failed to fetch user subscription',
        details: subscriptionError.message 
      }, { status: 500 });
    }

    if (!subscription?.onesignal_player_id) {
      console.log(`❌ No active OneSignal subscription found for user: ${userId}`);
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

    console.log(`🚀 Sending immediate notification to OneSignal API:`, {
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
        details: oneSignalResult,
        oneSignalStatus: oneSignalResponse.status,
        sentPayload: oneSignalPayload
      }, { status: 500 });
    }

    console.log('✅ OneSignal notification sent successfully:', oneSignalResult);

    // Store the sent notification in our database for tracking
    const { error: trackingError } = await supabase
      .from('notification_queue')
      .insert({
        clerk_user_id: userId,
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
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 