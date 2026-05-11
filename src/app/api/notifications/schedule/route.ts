import { postOneSignalNotification } from "@/lib/notifications/onesignal-rest-client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 },
      );
    }

    const rawAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
    const restKeyConfigured = Boolean(
      process.env.ONESIGNAL_REST_API_KEY?.trim(),
    );

    if (!rawAppId || !restKeyConfigured) {
      return NextResponse.json(
        { error: "OneSignal server configuration is incomplete" },
        { status: 500 },
      );
    }

    const { userId, notification, deliveryTime } = await request.json();

    if (!userId || !notification || !deliveryTime) {
      return NextResponse.json(
        {
          error: "Missing required fields: userId, notification, deliveryTime",
        },
        { status: 400 },
      );
    }

    console.log(
      `📅 Scheduling OneSignal notification for user: ${userId} at ${deliveryTime}`,
    );

    // Get user's OneSignal player ID from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("onesignal_player_id")
      .eq("external_user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (subscriptionError) {
      console.error("❌ Error fetching subscription:", subscriptionError);
      return NextResponse.json(
        {
          error: "Failed to fetch user subscription",
          details: subscriptionError.message,
        },
        { status: 500 },
      );
    }

    if (!subscription?.onesignal_player_id) {
      console.log(
        `❌ No active OneSignal subscription found for user: ${userId}`,
      );
      return NextResponse.json(
        {
          error: "No active OneSignal subscription found for user",
          hasSubscription: false,
        },
        { status: 404 },
      );
    }

    const playerId = subscription.onesignal_player_id;
    console.log(`🎯 Found subscription identifier: ${playerId}`);

    // Prepare notification for Messages API (external_id aligns with SDK OneSignal.login)
    const appId = rawAppId;

    const oneSignalPayload: Record<string, unknown> = {
      app_id: appId,
      include_aliases: { external_id: [String(userId)] },
      contents: notification.contents || { en: "You have a new notification" },
      headings: notification.headings || { en: "MemoSpark" },
      data: notification.data || {},
      url: notification.url,
      send_after: new Date(deliveryTime).toISOString(),
      delayed_option: "timezone", // Respect user's timezone
      priority: notification.priority || 5,
      ttl: 259200, // 3 days in seconds

      // iOS-specific APNS configuration for better delivery
      ios_sound: notification.ios_sound || "default",
      ios_category: notification.ios_category || "STUDYSPARK_NOTIFICATION",
      ios_badgeType: notification.ios_badgeType || "Increase",
      ios_badgeCount: notification.ios_badgeCount,
      ios_interruption_level: notification.ios_interruption_level || "active",
      mutable_content: true, // Enable notification service extensions
      content_available: notification.content_available || false,

      // Enhanced APNS alert configuration
      apns_alert: {
        title: notification.headings?.en || "MemoSpark",
        subtitle: notification.apns_alert?.subtitle,
        body: notification.contents?.en || "You have a new notification",
      },

      ...(notification.buttons && { buttons: notification.buttons }),
    };

    if (notification.android_channel_id) {
      oneSignalPayload.android_channel_id = notification.android_channel_id;
    }

    console.log("🚀 Sending to OneSignal API:", {
      app_id: oneSignalPayload.app_id,
      targeting: oneSignalPayload.include_aliases,
      send_after: oneSignalPayload.send_after,
      contents: oneSignalPayload.contents,
      headings: oneSignalPayload.headings,
      priority: oneSignalPayload.priority,
      android_channel_id: oneSignalPayload.android_channel_id || "not set",
    });

    const oneSignalResponse = await postOneSignalNotification(oneSignalPayload);

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error("❌ OneSignal API error:", {
        status: oneSignalResponse.status,
        response: oneSignalResult,
        payload: oneSignalPayload,
      });
      return NextResponse.json(
        {
          error: "OneSignal API error",
          details: oneSignalResult,
          oneSignalStatus: oneSignalResponse.status,
          sentPayload: oneSignalPayload,
        },
        { status: 500 },
      );
    }

    console.log(
      "✅ OneSignal notification scheduled successfully:",
      oneSignalResult,
    );

    // Store the scheduled notification in our database for tracking
    const { error: trackingError } = await supabase
      .from("notification_queue")
      .insert({
        clerk_user_id: userId,
        onesignal_notification_id: oneSignalResult.id,
        title: notification.headings?.en || "Notification",
        body: notification.contents?.en || "You have a notification",
        scheduled_for: new Date(deliveryTime).toISOString(),
        status: "scheduled",
        data: notification.data || {},
        onesignal_player_id: playerId,
      });

    if (trackingError) {
      console.warn("⚠️ Failed to store notification tracking:", trackingError);
      // Don't fail the request for tracking errors
    }

    return NextResponse.json({
      success: true,
      oneSignalId: oneSignalResult.id,
      recipients: oneSignalResult.recipients,
      playerId,
      scheduledFor: deliveryTime,
      message: "Notification scheduled successfully",
    });
  } catch (error) {
    console.error("❌ Notification scheduling error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
