import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabasePushService } from '@/lib/notifications/supabasePushService';
import { productionConfig, isPushEnabled } from '@/lib/notifications/productionConfig';
import type { RichNotification, NotificationType } from '@/lib/notifications/pushTypes';

// Configure web-push with VAPID keys from production config
if (productionConfig) {
  webpush.setVapidDetails(
            `mailto:${productionConfig.vapidEmail}`,
    productionConfig.vapidPublicKey,
    productionConfig.vapidPrivateKey
  );
}

export async function POST(request: NextRequest) {
  try {
    // Check if push notifications are enabled
    if (!isPushEnabled || !productionConfig) {
      return NextResponse.json({ 
        success: false,
        error: 'Push notifications not configured properly.',
        message: 'Check environment variables and configuration'
      }, { status: 500 });
    }

    const body = await request.json();
    const {
      subscriptionId,
      userId,
      notificationType,
      title,
      body: notificationBody,
      icon,
      badge,
      image,
      data,
      actions,
      tag,
      requireInteraction,
      vibrate,
      timestamp
    } = body;

    if (!title || !notificationBody) {
      return NextResponse.json({
        success: false,
        error: 'Title and body are required'
      }, { status: 400 });
    }

    // Get user's push subscriptions from database
    let subscriptions: any[] = [];
    if (userId) {
      try {
        subscriptions = await supabasePushService.getSubscriptions(userId);
      } catch (error) {
        console.warn('Failed to get subscriptions from database:', error);
      }
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active push subscriptions found for user'
      }, { status: 404 });
    }

    // Create rich notification payload
    const notification: RichNotification = {
      title,
      body: notificationBody,
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      image,
      data: {
        ...data,
        timestamp: timestamp || Date.now(),
        notificationType,
        userId
      },
      actions,
      tag: tag || `${notificationType}-${Date.now()}`,
      requireInteraction: requireInteraction || false,
      vibrate: vibrate || [200, 100, 200]
    };

    const payload = JSON.stringify({
      notification
    });

    // Send to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        };

        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 24 * 60 * 60, // 24 hours
          urgency: requireInteraction ? 'high' : 'normal'
        });

        return { success: true, subscriptionId: sub.id };
      } catch (error) {
        console.error(`Failed to send to subscription ${sub.id}:`, error);
        
        // Log failure to database
        if (userId) {
          await supabasePushService.logNotification(
            userId,
            sub.id,
            notification,
            notificationType as NotificationType,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
        
        return { success: false, subscriptionId: sub.id, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Log successful notifications to database
    if (userId && successful > 0) {
      await supabasePushService.logNotification(
        userId,
        subscriptionId || null,
        notification,
        notificationType as NotificationType,
        'sent'
      );
    }



    return NextResponse.json({
      success: successful > 0,
      message: `Push notification sent to ${successful} subscription(s)`,
      results: {
        sent: successful,
        failed: failed,
        total: subscriptions.length,
        details: results
      }
    });

  } catch (error) {
    console.error('Failed to send push notification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send push notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 