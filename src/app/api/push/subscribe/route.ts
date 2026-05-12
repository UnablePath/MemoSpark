import { schedulePushDrain } from "@/lib/notifications/wakePushScheduler";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type PushSubscriptionJson = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServerAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const subUnknown = (await req.json()) as unknown;
  const sub = subUnknown as PushSubscriptionJson;

  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint.trim() : "";
  const p256dh =
    typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh.trim() : "";
  const authKey =
    typeof sub?.keys?.auth === "string" ? sub.keys.auth.trim() : "";

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "Invalid subscription object" },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;

  const subscriptionJson =
    typeof subUnknown === "object" && subUnknown !== null
      ? subUnknown
      : { endpoint, keys: { p256dh, auth: authKey } };

  const { error } = await supabaseServerAdmin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh_key: p256dh,
      auth_key: authKey,
      subscription_json: subscriptionJson as Record<string, unknown>,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[push:subscribe]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: prefErr } = await supabaseServerAdmin
    .from("notification_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  if (prefErr) {
    console.error("[push:subscribe/preferences]", prefErr);
  }

  const { error: rpcErr } = await supabaseServerAdmin.rpc("notify_user", {
    p_user_id: userId,
    p_category: "system",
    p_title: "Notifications enabled!",
    p_body: "You'll be reminded about tasks even when MemoSpark is closed.",
    p_url: "/tasks",
    p_scheduled_for: new Date().toISOString(),
  });

  if (rpcErr) {
    console.error("[push:subscribe/welcome_notify]", rpcErr);
  } else {
    schedulePushDrain();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServerAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { error } = await supabaseServerAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[push:subscribe]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
