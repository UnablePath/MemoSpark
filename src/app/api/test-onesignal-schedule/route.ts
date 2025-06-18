import { NextRequest, NextResponse } from 'next/server';
import { oneSignalService } from '@/lib/notifications/OneSignalService';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧪 [TEST] Testing OneSignal scheduling for user:', userId);

    // Check if user has OneSignal subscription
    const hasSubscription = await oneSignalService.hasActiveSubscription(userId);
    console.log('📱 [TEST] Has OneSignal subscription:', hasSubscription);

    if (!hasSubscription) {
      return NextResponse.json({ 
        error: 'No OneSignal subscription found',
        message: 'Please enable notifications first'
      }, { status: 400 });
    }

    // Schedule a test notification for 1 minute from now
    const scheduleTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    
    console.log('⏰ [TEST] Scheduling test notification for:', scheduleTime.toISOString());

    const success = await oneSignalService.scheduleNotification(
      userId,
      {
        contents: { 
          en: '🧪 This is a test scheduled notification from StudySpark!' 
        },
        headings: { 
          en: '🧪 OneSignal Test' 
        },
        data: {
          type: 'test_notification',
          scheduledAt: scheduleTime.toISOString(),
          url: '/dashboard'
        },
        url: '/dashboard',
        android_channel_id: 'test_notifications',
        priority: 5,
      },
      scheduleTime
    );

    if (success) {
      console.log('✅ [TEST] OneSignal notification scheduled successfully');
      return NextResponse.json({
        success: true,
        message: 'Test notification scheduled successfully',
        scheduledFor: scheduleTime.toISOString(),
        note: 'You should receive this notification in about 1 minute'
      });
    } else {
      console.log('❌ [TEST] Failed to schedule OneSignal notification');
      return NextResponse.json({
        success: false,
        error: 'Failed to schedule notification'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [TEST] Error testing OneSignal scheduling:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 