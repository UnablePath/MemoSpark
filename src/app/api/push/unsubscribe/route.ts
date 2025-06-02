import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { productionConfig, isPushEnabled } from '@/lib/notifications/productionConfig';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const body = await request.json();
    const { endpoint, subscriptionId } = body;

    if (!endpoint && !subscriptionId) {
      return NextResponse.json({
        success: false,
        error: 'Either endpoint or subscriptionId is required'
      }, { status: 400 });
    }

    // Remove subscription from database
    let query = supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    } else if (subscriptionId) {
      query = query.eq('id', subscriptionId);
    }

    const { error } = await query;

    if (error) {
      console.error('Database error removing subscription:', error);
      throw error;
    }

    // Log the unsubscription
    await supabase
      .from('push_notification_logs')
      .insert({
        user_id: userId,
        notification_type: 'unsubscribe',
        status: 'success',
        message: 'User unsubscribed from push notifications',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Failed to remove push subscription:', error);
    
    // Log the error
    const { userId } = await auth();
    if (userId) {
      await supabase
        .from('push_notification_logs')
        .insert({
          user_id: userId,
          notification_type: 'unsubscribe',
          status: 'error',
          message: `Failed to unsubscribe: ${error instanceof Error ? error.message : 'Unknown error'}`,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to remove subscription'
    }, { status: 500 });
  }
} 