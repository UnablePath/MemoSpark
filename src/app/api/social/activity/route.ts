import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseWithClerkAuth } from "@/lib/supabase/server-auth";
import { supabaseServerAdmin } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const CONNECTION_VERBS = [
  "connection_requested",
  "connection_accepted",
  "connection_formed",
] as const;

function encodeCursor(createdAt: string): string {
  return Buffer.from(createdAt, "utf-8").toString("base64url");
}

function decodeCursor(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return Buffer.from(raw, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Returns social feed events with cursor pagination.
 * If refresh=1, run maintain_social_activity_feed before reading.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("refresh") === "1" && supabaseServerAdmin) {
      const { error: rpcErr } = await supabaseServerAdmin.rpc(
        "maintain_social_activity_feed",
      );
      if (rpcErr) {
        console.warn("maintain_social_activity_feed:", rpcErr.message);
      }
    }

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
      ),
    );
    const scope = searchParams.get("scope") || "all";
    const cursorTime = decodeCursor(searchParams.get("cursor"));

    let q = supabase
      .from("social_activity_events")
      .select(
        "id, actor_id, verb, object_type, object_id, group_id, metadata, actor_display_name, group_display_name, created_at",
      );

    if (scope === "connections") {
      q = q.in("verb", [...CONNECTION_VERBS]);
    } else if (scope === "groups") {
      q = q.not("group_id", "is", null);
    }

    if (cursorTime) {
      q = q.lt("created_at", cursorTime);
    }

    const { data: rows, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error("social_activity_events:", error);
      return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
    }

    const list = rows ?? [];
    const hasMore = list.length > limit;
    const page = hasMore ? list.slice(0, limit) : list;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last?.created_at
        ? encodeCursor(last.created_at as string)
        : null;

    return NextResponse.json({
      events: page,
      nextCursor,
      hasMore: Boolean(nextCursor),
    });
  } catch (e) {
    console.error("GET /api/social/activity:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
