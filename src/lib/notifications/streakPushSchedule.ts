import type { SupabaseClient } from "@supabase/supabase-js";

export function computeScheduledForUtc(timeOfDay: string): string {
  const parts = timeOfDay.split(":");
  const hour = Number.parseInt(parts[0] ?? "20", 10);
  const minute = Number.parseInt(parts[1] ?? "0", 10);
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  const now = new Date();
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString();
}

export function streakCopy(currentStreak: number): {
  title: string;
  body: string;
} {
  if (currentStreak === 0) {
    return {
      title: "Start your streak!",
      body: "Check in today and Stu will help you lock in momentum.",
    };
  }
  if (currentStreak < 3) {
    return {
      title: `${currentStreak}-day streak`,
      body: "Keep showing up tonight — tap in before the day ends.",
    };
  }
  if (currentStreak < 7) {
    return {
      title: `${currentStreak}-day streak is heating up`,
      body: "You are forming a habit. One more check-in keeps it alive.",
    };
  }
  if (currentStreak < 30) {
    return {
      title: `${currentStreak}-day streak strong`,
      body:
        "You are outpacing procrastination tonight. Confirm your check-in.",
    };
  }
  return {
    title: `${currentStreak}-day legendary streak`,
    body: "Defend your crown tonight. Tap to check in.",
  };
}

export type EnqueueStreakResult =
  | { ok: true; scheduledFor: string }
  | { ok: false; error: string };

/**
 * Upserts streak notification row via Postgres notify_user; mirrors
 * /api/push/streak-schedule so ReminderEngine and API stay aligned.
 */
export async function enqueueStreakPushNotification(
  admin: SupabaseClient,
  userId: string,
  currentStreak: number,
  timeOfDay: string,
): Promise<EnqueueStreakResult> {
  const scheduledFor = computeScheduledForUtc(timeOfDay);
  const { title, body } = streakCopy(currentStreak);
  const extra = {
    stuAnimation: "encouraging",
    streakCount: currentStreak,
  };

  const clearPending = await admin
    .from("notifications")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("category", "streak")
    .eq("status", "pending")
    .eq("source_type", "auto_streak");

  if (clearPending.error) {
    console.warn("[streak-push:clear_pending]", clearPending.error);
  }

  const { error: rpcError } = await admin.rpc("notify_user", {
    p_user_id: userId,
    p_category: "streak",
    p_title: title,
    p_body: body,
    p_url: "/dashboard",
    p_scheduled_for: scheduledFor,
    p_source_type: "auto_streak",
    p_source_id: null,
    p_actions: [{ action: "open", title: "Open MemoSpark" }],
    p_extra: extra,
  });

  if (rpcError) {
    console.error("[streak-push]", rpcError);
    return {
      ok: false,
      error: rpcError.message ?? "notify_user RPC failed",
    };
  }

  const { error: streakAnalyticsError } = await admin.from("user_analytics").upsert(
    {
      user_id: userId,
      last_streak_reminder_scheduled: scheduledFor,
      streak_reminder_preferences: {
        enabled: true,
        time_of_day: timeOfDay,
        current_streak: currentStreak,
      },
    },
    { onConflict: "user_id" },
  );
  if (streakAnalyticsError) {
    console.error("[notifications:scheduleStreak]", streakAnalyticsError);
  }

  return { ok: true, scheduledFor };
}

export async function cancelPendingStreakNotifications(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.from("notifications").update({
    status: "cancelled",
  })
    .eq("user_id", userId)
    .eq("category", "streak")
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: error.message };
  }

  const { error: streakCancelAnalyticsError } = await admin.from("user_analytics").upsert(
    {
      user_id: userId,
      streak_reminder_preferences: {
        enabled: false,
        cancelled_at: new Date().toISOString(),
      },
    },
    { onConflict: "user_id" },
  );
  if (streakCancelAnalyticsError) {
    console.error("[notifications:cancelStreak]", streakCancelAnalyticsError);
  }

  return { ok: true };
}
