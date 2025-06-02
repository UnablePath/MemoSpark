import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabasePushService } from '@/lib/notifications/supabasePushService';
import { productionConfig, isPushEnabled } from '@/lib/notifications/productionConfig';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const subscriptionId = params.id;

    if (!subscriptionId) {
      return NextResponse.json({
        success: false,
        error: 'Subscription ID is required'
      }, { status: 400 });
    }

    // Remove subscription from database
    const success = await supabasePushService.deleteSubscription(subscriptionId);

    return NextResponse.json({ 
      success,
      message: success ? 'Subscription removed successfully' : 'Subscription not found or could not be removed'
    });
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove subscription'
    }, { status: 500 });
  }
} 