import { NextRequest, NextResponse } from 'next/server';

// OneSignal API configuration
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1';

interface SendNotificationRequest {
  player_ids?: string[];
  include_external_user_ids?: string[];
  headings: { [key: string]: string };
  contents: { [key: string]: string };
  data?: Record<string, any>;
  url?: string;
  send_after?: string;
  delayed_option?: 'timezone' | 'last-active';
  delivery_time_of_day?: string;
  ttl?: number;
  priority?: number;
  small_icon?: string;
  large_icon?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal configuration missing');
      return NextResponse.json(
        { error: 'OneSignal configuration missing' },
        { status: 500 }
      );
    }

    const body: SendNotificationRequest = await request.json();

    // Validate required fields
    if (!body.contents || !body.headings) {
      return NextResponse.json(
        { error: 'Contents and headings are required' },
        { status: 400 }
      );
    }

    if (!body.player_ids && !body.include_external_user_ids) {
      return NextResponse.json(
        { error: 'Either player_ids or include_external_user_ids must be provided' },
        { status: 400 }
      );
    }

    // Prepare OneSignal notification payload
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      contents: body.contents,
      headings: body.headings,
      data: body.data || {},
      url: body.url || '/dashboard',
      ...(body.player_ids && { include_player_ids: body.player_ids }),
      ...(body.include_external_user_ids && { include_external_user_ids: body.include_external_user_ids }),
      ...(body.send_after && { send_after: body.send_after }),
      ...(body.delayed_option && { delayed_option: body.delayed_option }),
      ...(body.delivery_time_of_day && { delivery_time_of_day: body.delivery_time_of_day }),
      ...(body.ttl && { ttl: body.ttl }),
      ...(body.priority && { priority: body.priority }),
      ...(body.small_icon && { small_icon: body.small_icon }),
      ...(body.large_icon && { large_icon: body.large_icon }),
    };

    console.log('📤 Sending OneSignal notification:', {
      app_id: ONESIGNAL_APP_ID,
      recipients: body.player_ids?.length || body.include_external_user_ids?.length || 0,
      heading: body.headings.en,
      content: body.contents.en,
    });

    // Send notification to OneSignal
    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OneSignal API error:', response.status, errorData);
      return NextResponse.json(
        { 
          error: 'Failed to send notification',
          details: errorData,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ OneSignal notification sent successfully:', {
      id: result.id,
      recipients: result.recipients,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Notification sent successfully',
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 