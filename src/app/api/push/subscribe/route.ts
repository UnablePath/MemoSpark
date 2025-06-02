import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabasePushService } from '@/lib/notifications/supabasePushService';
import { productionConfig, isPushEnabled } from '@/lib/notifications/productionConfig';
import type { PushSubscriptionWithMetadata } from '@/lib/notifications/pushTypes';

export async function POST(request: NextRequest) {
  try {
    // Check if push notifications are enabled
    if (!isPushEnabled || !productionConfig) {
      return NextResponse.json({
        success: false,
        error: 'Push notifications not configured'
      }, { status: 503 });
    }

    // Get user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const subscription: PushSubscriptionWithMetadata = await request.json();
    
    // Validate subscription data
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subscription data'
      }, { status: 400 });
    }

    // Save subscription to database
    const subscriptionId = await supabasePushService.saveSubscription(userId, subscription);

    return NextResponse.json({ 
      success: true, 
      subscriptionId
    });
  } catch (error) {
    console.error('Failed to store push subscription:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to store subscription'
    }, { status: 500 });
  }
}

 