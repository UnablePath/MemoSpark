import { createClient } from "jsr:@supabase/supabase-js@2";
import webPush from "npm:web-push@3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cronSecret = Deno.env.get("CRON_SECRET");
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

export type DeliverPayload = {
  userId: string;
  notificationId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  extra?: Record<string, unknown>;
  requireInteraction?: boolean;
  sourceType?: string | null;
  sourceId?: string | null;
};

async function bumpRetry(notificationId: string): Promise<number> {
  const { data: row, error } = await supabase
    .from("notifications")
    .select("retry_count")
    .eq("id", notificationId)
    .single();

  if (error || row == null) {
    console.error("[push-deliver:bumpRetry]", error);
    return 0;
  }

  const next = (typeof row.retry_count === "number" ? row.retry_count : 0) + 1;
  return next;
}

async function markSent(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("[push-deliver:markSent]", error);
}

async function markFailed(id: string, reason: string) {
  const retryCount = await bumpRetry(id);
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "failed",
      failure_reason: reason.slice(0, 900),
      retry_count: retryCount,
    })
    .eq("id", id);

  if (error) console.error("[push-deliver:markFailed]", error);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization");
  const headerCron = req.headers.get("x-cron-secret");
  const matchesCron = cronSecret != null && headerCron === cronSecret;
  const matchesServiceRole =
    authHeader === `Bearer ${supabaseServiceRoleKey}`;

  if (!(matchesCron || matchesServiceRole)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: DeliverPayload;

  try {
    payload = (await req.json()) as DeliverPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId, notificationId } = payload;
  if (!userId?.trim() || !notificationId?.trim()) {
    return new Response(JSON.stringify({ error: "Missing userId or notificationId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subRow, error: subError } = await supabase
    .from("push_subscriptions")
    .select("subscription_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (subError || subRow?.subscription_json == null) {
    console.error("[push-deliver:subscription]", subError);
    await markFailed(notificationId, "No subscription found");
    return new Response(JSON.stringify({ error: "No subscription" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const extra = payload.extra ?? {};
  const mergedSourceType =
    (payload.sourceType as string | undefined) ??
    (typeof extra.sourceType === "string" ? extra.sourceType : undefined) ??
    (typeof extra.source_type === "string" ? extra.source_type : undefined);
  const mergedSourceId =
    (payload.sourceId as string | undefined) ??
    (typeof extra.sourceId === "string"
      ? extra.sourceId
      : typeof extra.taskId === "string"
        ? extra.taskId
        : typeof extra.reminderId === "string"
          ? extra.reminderId
          : undefined);

  const pushPayloadObj: Record<string, unknown> = {
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    image: payload.image,
    tag: payload.tag ?? `notif-${notificationId}`,
    renotify: true,
    requireInteraction: payload.requireInteraction ?? false,
    url: payload.url ?? "/",
    notificationId,
    actions: payload.actions ??
      [{ action: "open", title: "View" }],
    sourceType: mergedSourceType ?? null,
    sourceId: mergedSourceId ?? null,
    ...extra,
  };

  const pushPayload = JSON.stringify(pushPayloadObj);

  const subscription = subRow.subscription_json as webPush.PushSubscription;

  try {
    await webPush.sendNotification(subscription, pushPayload);
    await markSent(notificationId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const wp = err as { statusCode?: number; message?: string };
    const code = wp.statusCode;
    const msg = typeof wp.message === "string"
      ? wp.message
      : "Web push delivery failed";

    if (code === 410 || code === 404) {
      await supabase.from("push_subscriptions").delete().eq(
        "user_id",
        userId,
      );
      await markFailed(notificationId, "Subscription expired");
    } else {
      await markFailed(notificationId, msg);
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
