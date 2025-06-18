import { NextRequest, NextResponse } from 'next/server';

// Send test notification via OneSignal REST API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, type = 'test', message, title } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
    }

    if (!process.env.ONESIGNAL_REST_API_KEY || !process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
      return NextResponse.json({ error: 'OneSignal configuration missing' }, { status: 500 });
    }

    // Test messages
    const testMessages = {
      test: {
        title: '🧪 Test Notification',
        body: message || 'This is a test notification from StudySpark!'
      },
      task: {
        title: '📋 Task Reminder',
        body: 'Don\'t forget: "Complete your study session" is due soon!'
      },
      achievement: {
        title: '🏆 Achievement Unlocked!',
        body: 'You successfully set up push notifications!'
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
    
    // Allow custom title and message from request
    const finalTitle = title || messageData.title;
    const finalMessage = message || messageData.body;

    // Send notification via OneSignal REST API
    const notification = {
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      headings: { en: finalTitle },
      contents: { en: finalMessage },
      data: { 
        type: 'test_notification',
        testType: type,
        timestamp: new Date().toISOString()
      },
      url: '/dashboard',
      web_buttons: [
        {
          id: 'open_app',
          text: 'Open StudySpark',
          url: '/dashboard'
        }
      ]
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: `Test ${type} notification sent successfully`,
        notificationId: result.id,
        recipients: result.recipients || 1
      });
    } else {
      console.error('OneSignal API error:', result);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send notification',
        error: result.errors || 'Unknown error'
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

// Get test endpoint information
export async function GET() {
  try {
    return NextResponse.json({
      message: 'OneSignal test notification endpoint',
      usage: {
        method: 'POST',
        body: {
          playerId: 'onesignal_player_id',
          type: 'test|task|achievement|break|overdue',
          message: 'Optional custom message'
        }
      },
      example: `
        curl -X POST http://localhost:3000/api/test-notification \\
          -H "Content-Type: application/json" \\
          -d '{"playerId": "your_player_id", "type": "test"}'
      `,
      configured: {
        appId: !!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        restApiKey: !!process.env.ONESIGNAL_REST_API_KEY
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 