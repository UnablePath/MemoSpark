import { auth } from "@clerk/nextjs/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_UPDATE_KEYS = new Set([
  "task_reminders",
  "streak_alerts",
  "social_activity",
  "achievements",
  "system_notices",
  "quiet_hours_start",
  "quiet_hours_end",
  "timezone",
]);

export async function GET() {
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

  const { data, error } = await supabaseServerAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[push:preferences]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? {});
}

export async function PATCH(req: Request) {
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

  const updatesUnknown = await req.json() as Record<string, unknown>;

  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updatesUnknown)) {
    if (ALLOWED_UPDATE_KEYS.has(key)) {
      safe[key] = val;
    }
  }

  safe.updated_at = new Date().toISOString();

  const { error } = await supabaseServerAdmin.from("notification_preferences")
    .upsert(
      { user_id: userId, ...safe },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[push:preferences]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
