"use server";

import { wrapClerkTokenForSupabase } from "@/lib/clerk/clerkSupabaseToken";
import { schedulePushDrain } from "@/lib/notifications/wakePushScheduler";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/client";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export async function subscribeUser(
  _playerId?: string,
  _userAgent?: string,
): Promise<ActionResult> {
  void _playerId;
  void _userAgent;
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    return {
      success: true,
      data: {
        migrated: true,
        message:
          "Web Push persists through /api/push/subscribe; legacy SDK player ids were removed.",
      },
    };
  } catch (error) {
    console.error("[notifications:subscribe_legacy]", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function unsubscribeUser(
  _playerId?: string,
): Promise<ActionResult> {
  void _playerId;
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    await admin.from("push_subscriptions").delete().eq("user_id", userId);

    revalidatePath("/settings");
    return { success: true, data: { unsubscribed: true } };
  } catch (error) {
    console.error("[notifications:unsubscribe]", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function sendTaskReminder(
  taskId: string,
  taskTitle: string,
  dueDate: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    const { error } = await admin.rpc("notify_user", {
      p_user_id: userId,
      p_category: "task_reminder",
      p_title: "Task reminder",
      p_body: `“${taskTitle}” due ${new Date(dueDate).toLocaleString()}.`,
      p_url: "/tasks",
      p_scheduled_for: new Date().toISOString(),
      p_source_type: "task",
      p_source_id: taskId,
      p_extra: {
        dueDateIso: dueDate,
        taskTitle,
      },
    });

    if (error) {
      console.error("[actions:sendTaskReminder]", error);
      return { success: false, error: "Couldn't queue reminder." };
    }

    schedulePushDrain();

    return { success: true, data: { queued: true } };
  } catch (error) {
    console.error("[actions:sendTaskReminder]", error);
    return { success: false, error: "Failed to enqueue task reminder" };
  }
}

export async function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  dueDate: string,
  reminderOffsetMinutes: number,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    const dueDateObj = new Date(dueDate);
    const reminderTime = new Date(
      dueDateObj.getTime() - reminderOffsetMinutes * 60 * 1000,
    );

    if (reminderTime <= new Date()) {
      return { success: false, error: "Reminder time is in the past" };
    }

    const { error } = await admin.rpc("notify_user", {
      p_user_id: userId,
      p_category: "task_reminder",
      p_title: "Task reminder",
      p_body: `Coming up: ${taskTitle}`,
      p_url: `/tasks?highlight=${taskId}`,
      p_scheduled_for: reminderTime.toISOString(),
      p_source_type: "task",
      p_source_id: taskId,
      p_extra: {
        reminderOffsetMinutes,
        dueDateIso: dueDate,
      },
    });

    if (error) {
      console.error("[actions:scheduleTaskReminder]", error);
      return {
        success: false,
        error: "Couldn't queue scheduled reminder.",
      };
    }

    schedulePushDrain();

    return {
      success: true,
      data: {
        queued: true,
        reminderIso: reminderTime.toISOString(),
      },
    };
  } catch (error) {
    console.error("[actions:scheduleTaskReminder]", error);
    return { success: false, error: "Failed to schedule reminder" };
  }
}

export async function sendAchievementNotification(
  achievementName: string,
  _description?: string,
): Promise<ActionResult> {
  void _description;
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    const { error } = await admin.rpc("notify_user", {
      p_user_id: userId,
      p_category: "achievement",
      p_title: `Badge unlocked: ${achievementName}`,
      p_body: "Open MemoSpark to see what changed.",
      p_url: "/reminders",
      p_scheduled_for: new Date().toISOString(),
      p_actions: [{ action: "open", title: "View" }],
      p_extra: { achievementName },
    });

    if (error) {
      console.error("[actions:achievement_notify]", error);
      return {
        success: false,
        error: "Could not queue achievement notification",
      };
    }

    schedulePushDrain();

    return { success: true, data: { queued: true } };
  } catch (error) {
    console.error("[actions:achievement_notify]", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function sendBreakSuggestion(
  message?: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    const body =
      message ??
      "You have been grinding — take ten minutes offline and hydrate.";

    const { error } = await admin.rpc("notify_user", {
      p_user_id: userId,
      p_category: "system",
      p_title: "Break suggestion",
      p_body: body,
      p_url: "/dashboard",
      p_scheduled_for: new Date().toISOString(),
      p_source_type: "system",
    });

    if (error) {
      console.error("[actions:break_suggestion]", error);
      return { success: false, error: "Could not queue break suggestion." };
    }

    schedulePushDrain();

    return { success: true, data: { queued: true } };
  } catch (error) {
    console.error("[actions:break_suggestion]", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  url?: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: false, error: "Server configuration error" };
    }

    const { error } = await admin.rpc("notify_user", {
      p_user_id: userId,
      p_category: "system",
      p_title: title,
      p_body: body,
      p_url:
        typeof url === "string" && url.trim().length > 0 ? url : "/dashboard",
      p_scheduled_for: new Date().toISOString(),
      p_source_type: "system",
      p_extra: data ?? null,
    });

    if (error) {
      console.error("[actions:send_notification]", error);
      return {
        success: false,
        error: "Could not queue notification.",
      };
    }

    schedulePushDrain();

    return { success: true, data: { queued: true } };
  } catch (error) {
    console.error("[actions:send_notification]", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function trackNotificationClick(
  notificationId: string,
  additionalData?: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    console.log("[notifications:track_click]", {
      notificationId,
      userId,
      additionalData,
    });
    return { success: true, data: { tracked: true } };
  } catch (error) {
    console.error("[notifications:track_click]", error);
    return {
      success: false,
      error: "Could not persist click analytics yet.",
    };
  }
}

export async function trackNotificationDismiss(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    console.log("[notifications:dismiss]", { notificationId, userId });
    return { success: true, data: { tracked: true } };
  } catch (error) {
    console.error("[notifications:dismiss]", error);
    return { success: false, error: "Failed to capture dismiss signal" };
  }
}

export async function getUserNotificationAnalytics(
  days = 30,
): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const admin = supabaseServerAdmin;
    if (!admin) {
      return { success: true, data: { rows: [] } };
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    const { data, error } = await admin
      .from("notifications")
      .select("id, category, title, status, scheduled_for, sent_at, read_at")
      .eq("user_id", userId)
      .gte("created_at", threshold.toISOString());

    if (error) {
      console.error("[notifications:analytics]", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("[notifications:analytics]", error);
    return { success: false, error: "Failed to load notifications" };
  }
}

export async function processNotificationQueue(): Promise<ActionResult> {
  return {
    success: true,
    data: {
      message:
        "Supabase push-scheduler Edge Function drains the pending queue.",
    },
  };
}

export async function getUserNotificationCategories(): Promise<ActionResult> {
  const categories = [
    {
      id: "task_reminders",
      name: "Task reminders",
      description: "Assignments and study blocks",
    },
    {
      id: "achievements",
      name: "Achievements",
      description: "Badges unlocked on MemoSpark",
    },
    {
      id: "study_breaks",
      name: "Break nudges",
      description: "Recovery reminders after marathon sessions",
    },
    {
      id: "streaks",
      name: "Streaks",
      description: "Nightly reminders to defend your streak",
    },
    {
      id: "general",
      name: "System",
      description: "Product updates when we ship something loud",
    },
  ];

  return { success: true, data: categories };
}

const DEFAULT_NOTIF_PREFS: Record<
  string,
  { enabled: boolean; quietHours: boolean }
> = {
  task_reminders: { enabled: true, quietHours: false },
  achievements: { enabled: true, quietHours: false },
  study_breaks: { enabled: true, quietHours: true },
  streaks: { enabled: true, quietHours: false },
  general: { enabled: true, quietHours: true },
  social: { enabled: true, quietHours: false },
};

export async function getUserNotificationPreferences(): Promise<ActionResult> {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const supabase = createAuthenticatedSupabaseClient(
      wrapClerkTokenForSupabase(getToken),
    );
    if (!supabase) {
      return { success: true, data: DEFAULT_NOTIF_PREFS };
    }

    const { data: row, error } = await supabase
      .from("clerk_notification_preferences")
      .select("categories")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (error || !row?.categories) {
      return { success: true, data: { ...DEFAULT_NOTIF_PREFS } };
    }

    const raw = row.categories as Record<
      string,
      { enabled?: boolean; quietHours?: boolean }
    >;
    const merged = { ...DEFAULT_NOTIF_PREFS };
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object") {
        merged[k] = {
          enabled: v.enabled !== false,
          quietHours: Boolean(v.quietHours),
        };
      }
    }
    return { success: true, data: merged };
  } catch (error) {
    console.error("[actions:get_notif_prefs]", error);
    return { success: false, error: "Failed to load notification preferences" };
  }
}

export async function updateNotificationPreferences(
  categoryId: string,
  preferences: {
    enabled?: boolean;
    quietHours?: boolean;
  },
): Promise<ActionResult> {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const supabase = createAuthenticatedSupabaseClient(
      wrapClerkTokenForSupabase(getToken),
    );
    if (!supabase) {
      return { success: false, error: "Database not configured" };
    }

    const { data: row } = await supabase
      .from("clerk_notification_preferences")
      .select("categories")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    const prev =
      (row?.categories as Record<
        string,
        { enabled: boolean; quietHours: boolean }
      >) ?? {};
    const next = {
      ...DEFAULT_NOTIF_PREFS,
      ...prev,
      [categoryId]: {
        enabled: preferences.enabled !== false,
        quietHours: Boolean(preferences.quietHours),
      },
    };

    const { error } = await supabase
      .from("clerk_notification_preferences")
      .upsert(
        {
          clerk_user_id: userId,
          categories: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" },
      );

    if (error) {
      console.error("[actions:patch_notif_prefs]", error);
      return {
        success: false,
        error: "Failed to save notification preferences",
      };
    }

    revalidatePath("/settings");
    return {
      success: true,
      data: { updated: true, message: "Preferences saved" },
    };
  } catch (error) {
    console.error("[actions:patch_notif_prefs]", error);
    return {
      success: false,
      error: "Failed to update notification preferences",
    };
  }
}
