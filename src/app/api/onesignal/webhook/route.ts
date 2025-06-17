import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // OneSignal webhook events
    const { event, notification, player } = body;
    
    console.log('OneSignal webhook received:', { event, notification: notification?.id, player: player?.id });

    // Track notification events in our analytics table
    if (notification?.id && player?.id) {
      // Find user by OneSignal player ID
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('onesignal_player_id', player.id)
        .single();

      if (subscription?.user_id) {
        // Track the event
        await supabase
          .from('notification_analytics')
          .insert({
            user_id: subscription.user_id,
            notification_id: notification.id,
            event_type: event, // 'sent', 'delivered', 'clicked', etc.
            category: notification.custom_data?.type || 'unknown',
            timestamp: new Date().toISOString(),
            metadata: {
              player_id: player.id,
              notification_data: notification.custom_data,
              webhook_event: event,
            }
          });

        console.log(`Tracked ${event} event for user ${subscription.user_id}, notification ${notification.id}`);
      }
    }

    // Handle specific events
    switch (event) {
      case 'notification.sent':
        console.log('Notification sent successfully');
        break;
      
      case 'notification.delivered':
        console.log('Notification delivered to device');
        break;
      
      case 'notification.clicked':
        console.log('User clicked notification');
        break;
      
      case 'notification.dismissed':
        console.log('User dismissed notification');
        break;
      
      default:
        console.log('Unknown webhook event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OneSignal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'OneSignal webhook endpoint active',
    timestamp: new Date().toISOString()
  });
} 