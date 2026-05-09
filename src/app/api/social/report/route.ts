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
      targetType?: string;
      reportedId?: string;
      reason?: string;
      context?: Record<string, unknown>;
    };
    const targetType = body.targetType?.trim() || 'student';
    if (!['student', 'group', 'message', 'resource'].includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid report target" },
        { status: 400 },
      );
    }

    const reportedId = body.reportedId?.trim();
    if (!reportedId || (targetType === 'student' && reportedId === userId)) {
      return NextResponse.json(
        { error: "Invalid report" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("user_reports").insert({
      reporter_id: userId,
      reported_id: reportedId,
      reason: body.reason?.slice(0, 2000) ?? null,
      context: {
        ...(body.context ?? {}),
        target_type: targetType,
      },
    });
    if (error) {
      console.error("[social:report]", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[social:report]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
