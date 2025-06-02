import { NextRequest, NextResponse } from 'next/server';
import { notificationScheduler } from '@/lib/notifications/notificationScheduler';
import { productionConfig, isPushEnabled } from '@/lib/notifications/productionConfig';

// This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
export async function POST(request: NextRequest) {
  try {
    // Check if push notifications are enabled
    if (!isPushEnabled || !productionConfig) {
      return NextResponse.json({
        success: false,
        error: 'Push notifications not configured'
      }, { status: 503 });
    }

    // Verify cron authorization (optional - add cron secret if needed)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Process pending notifications
    await notificationScheduler.processPendingNotifications();

    return NextResponse.json({
      success: true,
      message: 'Pending notifications processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to process pending notifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process pending notifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 