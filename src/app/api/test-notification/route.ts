import { NextRequest, NextResponse } from 'next/server';
import { oneSignalService } from '@/lib/notifications/OneSignalService';

// Send test notification to a specific user (for testing background notifications)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type = 'test', message } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Test messages
    const testMessages = {
      test: {
        title: '🧪 Background Test',
        body: message || 'This is a background notification test! Your browser can be closed.'
      },
      task: {
        title: '📋 Task Reminder',
        body: 'Don\'t forget: "Complete your study session" is due soon!'
      },
      achievement: {
        title: '🏆 Achievement Unlocked!',
        body: 'You successfully set up background notifications!'
      },
      break: {
        title: '☕ Take a Break',
        body: 'You\'ve been studying hard. Time for a 15-minute break!'
      },
      overdue: {
        title: '⚠️ Overdue Task',
        body: 'Your task "Complete assignment" is now overdue!'
      }
    };

    const messageData = testMessages[type as keyof typeof testMessages] || testMessages.test;

    // Send notification using external user ID (Clerk user ID)
    const result = await oneSignalService.sendNotification({
      contents: { en: messageData.body },
      headings: { en: messageData.title },
      include_external_user_ids: [userId],
      data: { 
        type: 'background_test',
        testType: type,
        timestamp: new Date().toISOString()
      },
      url: '/dashboard',
      android_channel_id: 'background_tests',
      priority: 8,
      buttons: [
        {
          id: 'open_app',
          text: 'Open StudySpark',
          url: '/dashboard'
        },
        {
          id: 'dismiss',
          text: 'Dismiss'
        }
      ]
    });

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `Background ${type} notification sent successfully`,
        notificationId: result.id,
        recipients: result.recipients
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send notification - user may not be subscribed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get current user ID for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testKey = searchParams.get('key');
    
    // Simple security - in production you'd use proper auth
    if (testKey !== 'test123') {
      return NextResponse.json({ error: 'Invalid test key' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Background notification test endpoint',
      usage: {
        method: 'POST',
        body: {
          userId: 'your_clerk_user_id',
          type: 'test|task|achievement|break|overdue',
          message: 'Optional custom message'
        }
      },
      example: `
        curl -X POST http://localhost:3000/api/test-notification \\
          -H "Content-Type: application/json" \\
          -d '{"userId": "user_123", "type": "test"}'
      `
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 