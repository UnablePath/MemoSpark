import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { oneSignalService } from '@/lib/notifications/OneSignalService';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [DEBUG] Checking subscription status for user:', userId);

    // Check current status
    const subscriptionStatus = await oneSignalService.getSubscriptionStatus();
    const hasActiveSubscription = await oneSignalService.hasActiveSubscription(userId);

    const result = {
      userId,
      oneSignalStatus: subscriptionStatus,
      hasActiveSubscription,
      guidance: {
        isOptedOut: !subscriptionStatus.isSubscribed,
        solution: !subscriptionStatus.isSubscribed ? 
          'User needs to re-enable notifications in browser or via app settings' :
          'User is properly subscribed',
        nextSteps: [
          'Go to Settings → Notification Settings',
          'Click "Enable Notifications"',
          'Allow when browser prompts',
          'Test with "Send Test Notification"'
        ]
      }
    };

    console.log('📊 [DEBUG] Subscription analysis:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [DEBUG] Error checking subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to check subscription status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'force_resubscribe') {
      console.log('🔄 [DEBUG] Attempting to force re-subscribe user:', userId);
      
      // This will trigger the OneSignal subscription flow
      const playerId = await oneSignalService.subscribeUser(userId);
      
      if (playerId) {
        return NextResponse.json({
          success: true,
          message: 'Successfully re-subscribed',
          playerId,
          instructions: 'You should now be subscribed to push notifications'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to re-subscribe',
          instructions: 'Please try manually enabling notifications in your browser settings'
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ [DEBUG] Error in subscription fix:', error);
    return NextResponse.json({ 
      error: 'Failed to fix subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 