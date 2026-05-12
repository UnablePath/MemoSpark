import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cronSecret = Deno.env.get("CRON_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const DELIVER_URL = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/push-deliver`;
const BATCH_SIZE = 50;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = req.headers.get("x-cron-secret");
  if (cronSecret == null || secret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("notifications")
    .select(
      "id,user_id,category,title,body,url,icon,image,actions,extra,source_type,source_id",
    )
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .lt("retry_count", 3)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || due == null || due.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const userIds = [...new Set(due.map((row) => row.user_id))];
  const { data: subscribedRows } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", userIds);

  const subscribedSet = new Set(
    (subscribedRows ?? []).map((row) => row.user_id),
  );

  const unsubscribedIds = due
    .filter((row) => !subscribedSet.has(row.user_id))
    .map((row) => row.id);

  if (unsubscribedIds.length > 0) {
    await supabase
      .from("notifications")
      .update({
        status: "cancelled",
        failure_reason: "No push subscription",
      })
      .in("id", unsubscribedIds);
  }

  const toDeliver = due.filter((row) => subscribedSet.has(row.user_id));

  const deliveries = await Promise.allSettled(
    toDeliver.map((row) => {
      const sourceId =
        row.source_id == null ? undefined : String(row.source_id);

      const tagBase = row.source_type ?? "notif";
      const tag = `${tagBase}-${sourceId ?? row.id}`;

      return fetch(DELIVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          "x-cron-secret": cronSecret!,
        },
        body: JSON.stringify({
          userId: row.user_id,
          notificationId: row.id,
          title: row.title,
          body: row.body,
          url: row.url,
          icon: row.icon,
          image: row.image,
          actions: row.actions,
          tag,
          extra: row.extra ?? undefined,
          sourceType: row.source_type,
          sourceId,
        }),
      }).then(async (deliverResponse) => {
        if (!deliverResponse.ok) {
          const errText = await deliverResponse.text();
          throw new Error(
            `[push-scheduler] deliver ${row.id}: ${deliverResponse.status} ${errText}`,
          );
        }
        return deliverResponse;
      });
    }),
  );

  const fulfilled = deliveries.filter((entry) =>
    entry.status === "fulfilled"
  ).length;

  return new Response(
    JSON.stringify({ processed: toDeliver.length, sent: fulfilled }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
