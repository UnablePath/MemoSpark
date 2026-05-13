import {
  cancelPendingStreakNotifications,
  enqueueStreakPushNotification,
} from "@/lib/notifications/streakPushSchedule";
import { wakePushScheduler } from "@/lib/notifications/wakePushScheduler";
import { createSlidingWindowLimiter } from "@/lib/rate-limit-memory";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const streakSchedulePostLimiter = createSlidingWindowLimiter({
  windowMs: 60_000,
  max: 20,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!streakSchedulePostLimiter.allow(`push:streak-schedule:${userId}`)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Too many streak reminder updates in a short window. Try again shortly.",
      },
      { status: 429 },
    );
  }

  if (!supabaseServerAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const bodyUnknown = (await req.json()) as {
    action?: string;
    currentStreak?: number;
    timeOfDay?: string;
  };

  const actionRaw =
    typeof bodyUnknown.action === "string" ? bodyUnknown.action : "enable";
  const action = actionRaw.trim().toLowerCase();

  if (action === "disable" || action === "cancel") {
    const cleared = await cancelPendingStreakNotifications(
      supabaseServerAdmin,
      userId,
    );
    if (!cleared.ok) {
      console.error("[push:streak-schedule:disable]", cleared.error);
      return NextResponse.json(
        { success: false, error: cleared.error ?? "Cancel failed" },
        { status: 500 },
      );
    }

    const streakDisableAnalyticsUpsert = await supabaseServerAdmin
      .from("user_analytics")
      .upsert(
        {
          user_id: userId,
          streak_reminder_preferences: {
            enabled: false,
            cancelled_at: new Date().toISOString(),
          },
        },
        { onConflict: "user_id" },
      );
    if (streakDisableAnalyticsUpsert.error) {
      console.error(
        "[push:streak-schedule:disable] user_analytics upsert",
        streakDisableAnalyticsUpsert.error,
      );
    }

    return NextResponse.json({ success: true });
  }

  const currentStreak =
    typeof bodyUnknown.currentStreak === "number"
      ? bodyUnknown.currentStreak
      : 0;

  const timeOfDay =
    typeof bodyUnknown.timeOfDay === "string"
      ? bodyUnknown.timeOfDay.trim()
      : "20:00";

  const enqueue = await enqueueStreakPushNotification(
    supabaseServerAdmin,
    userId,
    currentStreak,
    timeOfDay,
  );

  if (!enqueue.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Couldn't schedule streak reminder. Try again later.",
      },
      { status: 500 },
    );
  }

  const streakEnableAnalyticsUpsert = await supabaseServerAdmin
    .from("user_analytics")
    .upsert(
      {
        user_id: userId,
        last_streak_reminder_scheduled: enqueue.scheduledFor,
        streak_reminder_preferences: {
          enabled: true,
          time_of_day: timeOfDay,
          current_streak: currentStreak,
        },
      },
      { onConflict: "user_id" },
    );
  if (streakEnableAnalyticsUpsert.error) {
    console.error(
      "[push:streak-schedule:enable] user_analytics upsert",
      streakEnableAnalyticsUpsert.error,
    );
  }

  await wakePushScheduler();

  return NextResponse.json({
    success: true,
    scheduledFor: enqueue.scheduledFor,
    currentStreak,
  });
}
