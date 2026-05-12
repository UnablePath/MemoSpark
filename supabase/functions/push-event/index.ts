import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type NotifyCategory =
  | "task_reminder"
  | "streak"
  | "social"
  | "achievement"
  | "system";

type EventPayload = {
  userId: string;
  category: NotifyCategory;
  title: string;
  body: string;
  url?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  scheduledFor?: string;
  actions?: { action: string; title: string }[];
  extra?: Record<string, unknown> | null;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";

  const isAuthorized =
    authHeader === `Bearer ${supabaseServiceRoleKey}`;
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: EventPayload;

  try {
    payload = (await req.json()) as EventPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload.userId?.trim()) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sourceUuid: string | null = payload.sourceId ?? null;
  if (sourceUuid != null && sourceUuid.trim() === "") {
    sourceUuid = null;
  }

  const { data, error } = await supabase.rpc("notify_user", {
    p_user_id: payload.userId.trim(),
    p_category: payload.category,
    p_title: payload.title,
    p_body: payload.body,
    p_url: payload.url ?? "/",
    p_scheduled_for: payload.scheduledFor ??
      new Date().toISOString(),
    p_source_type: payload.sourceType ?? null,
    p_source_id: sourceUuid,
    p_actions: payload.actions ??
      [{ action: "open", title: "View" }],
    p_extra: payload.extra ?? null,
  });

  if (error != null) {
    console.error("[push-event:rpc]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ notificationId: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
