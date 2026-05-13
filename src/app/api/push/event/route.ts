import { assertSocialPushAllowed } from "@/lib/notifications/assertSocialPushAllowed";
import { wakePushScheduler } from "@/lib/notifications/wakePushScheduler";
import { createSlidingWindowLimiter } from "@/lib/rate-limit-memory";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type NotifyCategory =
  | "task_reminder"
  | "streak"
  | "social"
  | "achievement"
  | "system";

type PushEventBody = {
  recipientUserId?: string;
  category?: NotifyCategory;
  title?: string;
  body?: string;
  url?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  scheduledFor?: string;
  actions?: { action: string; title: string }[];
  extra?: Record<string, unknown> | null;
};

const VALID_CATEGORIES: ReadonlySet<NotifyCategory> = new Set([
  "task_reminder",
  "streak",
  "social",
  "achievement",
  "system",
]);

/** Caps enqueue + scheduler wakes per signed-in student (in-memory per instance). */
const pushEventPostLimiter = createSlidingWindowLimiter({
  windowMs: 60_000,
  max: 45,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pushEventPostLimiter.allow(`push:event:${userId}`)) {
    return NextResponse.json(
      {
        error:
          "Too many notifications queued in a short window. Wait a minute and try again.",
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

  const body = (await req.json()) as PushEventBody;

  const recipientUserId =
    typeof body.recipientUserId === "string" ? body.recipientUserId.trim() : "";

  if (!recipientUserId) {
    return NextResponse.json(
      { error: "recipientUserId is required" },
      { status: 400 },
    );
  }

  if (recipientUserId !== userId && body.category !== "social") {
    return NextResponse.json(
      { error: "Forbidden — can only enqueue for yourself" },
      { status: 403 },
    );
  }

  if (!body.category || !VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const category = body.category;

  if (
    category === "social" &&
    recipientUserId !== userId &&
    !(await assertSocialPushAllowed(
      supabaseServerAdmin,
      userId,
      recipientUserId,
    ))
  ) {
    console.error("[push:event]", "social_enqueue_forbidden", {
      sender: userId,
      recipient: recipientUserId,
    });
    return NextResponse.json(
      {
        error:
          "Message couldn't send. Add them as a connection or join the same private or invite-only study group.",
      },
      { status: 403 },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";

  if (!title || !bodyText) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 },
    );
  }

  let sourceUuid: string | null = null;
  if (typeof body.sourceId === "string" && body.sourceId.trim()) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(body.sourceId.trim())) {
      sourceUuid = body.sourceId.trim();
    }
  }

  const actions =
    Array.isArray(body.actions) &&
    body.actions.length > 0 &&
    typeof body.actions[0]?.action === "string"
      ? body.actions
      : [{ action: "open", title: "View" }];

  const extra =
    typeof body.extra === "object" && body.extra !== null ? body.extra : null;

  const { data: notificationUuid, error } = await supabaseServerAdmin.rpc(
    "notify_user",
    {
      p_user_id: recipientUserId,
      p_category: category,
      p_title: title,
      p_body: bodyText,
      p_url:
        typeof body.url === "string" && body.url.trim() ? body.url.trim() : "/",
      p_scheduled_for:
        typeof body.scheduledFor === "string" && body.scheduledFor.trim()
          ? body.scheduledFor.trim()
          : new Date().toISOString(),
      p_source_type: body.sourceType ?? null,
      p_source_id: sourceUuid,
      p_actions: actions,
      p_extra: extra,
    },
  );

  if (error) {
    console.error("[push:event]", error);
    return NextResponse.json(
      {
        error: "Couldn't queue notification. Try again in a moment.",
      },
      { status: 500 },
    );
  }

  await wakePushScheduler();

  return NextResponse.json(
    { notificationId: notificationUuid ?? null },
    {
      status: 200,
    },
  );
}
