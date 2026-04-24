import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseWithClerkAuth } from "@/lib/supabase/server-auth";

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const body = (await request.json()) as {
      reportedId?: string;
      reason?: string;
      context?: Record<string, unknown>;
    };
    const reportedId = body.reportedId?.trim();
    if (!reportedId || reportedId === userId) {
      return NextResponse.json(
        { error: "Invalid report" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("user_reports").insert({
      reporter_id: userId,
      reported_id: reportedId,
      reason: body.reason?.slice(0, 2000) ?? null,
      context: body.context ?? {},
    });
    if (error) {
      console.error("user_reports insert:", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/social/report:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
