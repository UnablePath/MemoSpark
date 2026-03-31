import { createSlidingWindowLimiter } from "@/lib/rate-limit-memory";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

/** Per signed-in user: max events per minute (sliding window, in-memory). */
const postEventLimiter = createSlidingWindowLimiter({
  windowMs: 60_000,
  max: 120,
});

/** Reject oversized bodies (abuse / accidental huge payloads). */
const MAX_BODY_BYTES = 65536;

function sanitizeMetadataForStorage(meta: unknown): unknown {
  if (!meta || typeof meta !== "object") return meta;
  const m = { ...(meta as Record<string, unknown>) };
  if (m.finalData) {
    m.finalData = { recorded: true };
  }
  if (m.stepData) {
    m.stepData = { recorded: true };
  }
  if (m.errors) {
    m.errors = { recorded: true };
  }
  return m;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!postEventLimiter.allow(`onboarding-analytics:${userId}`)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    const body = await request.json();

    // Validate the event data
    if (!body.event || body.timestamp === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const row = {
      user_id: userId,
      event: String(body.event),
      step: typeof body.step === "number" ? body.step : null,
      step_name: typeof body.stepName === "string" ? body.stepName : null,
      client_ts: typeof body.timestamp === "number" ? body.timestamp : null,
      metadata: sanitizeMetadataForStorage(body.metadata) as Record<
        string,
        unknown
      > | null,
      user_agent: request.headers.get("user-agent") || null,
    };

    if (supabaseServerAdmin) {
      try {
        await supabaseServerAdmin.from("onboarding_analytics").insert(row);
      } catch (dbError) {
        console.warn(
          "Failed to store onboarding analytics in database:",
          dbError,
        );
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Onboarding Analytics Event:", {
        event: body.event,
        step: body.step,
        stepName: body.stepName,
        userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding analytics error:", error);

    // Return success even on error to prevent breaking the onboarding flow
    return NextResponse.json({ success: true });
  }
}

// GET: current user's onboarding analytics only (not global/admin aggregates).
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Only allow authenticated users to view analytics
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get("days") || "7");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (!supabaseServerAdmin) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 },
      );
    }

    // Scope to the signed-in user only (avoid exposing other users' onboarding events).
    const { data: analytics, error } = await supabaseServerAdmin
      .from("onboarding_analytics")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Process analytics data
    const summary = processAnalyticsData(analytics || []);

    return NextResponse.json({
      success: true,
      data: analytics,
      summary,
    });
  } catch (error) {
    console.error("Error fetching onboarding analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 },
    );
  }
}

interface OnboardingAnalyticsRow {
  event?: string | null;
  step?: number | null;
  metadata?: { sessionId?: string } | null;
}

function processAnalyticsData(analytics: OnboardingAnalyticsRow[]) {
  const summary = {
    totalSessions: 0,
    completedOnboarding: 0,
    dropOffByStep: {} as Record<number, number>,
    averageCompletionTime: 0,
    mostCommonDropOffStep: 0,
    conversionRate: 0,
    stepCompletionRates: {} as Record<
      number,
      { entered: number; completed: number; rate: number }
    >,
  };

  const sessions: Record<string, OnboardingAnalyticsRow[]> = {};
  for (const event of analytics) {
    const sessionId =
      event.metadata && typeof event.metadata.sessionId === "string"
        ? event.metadata.sessionId
        : "unknown";
    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }
    sessions[sessionId].push(event);
  }

  summary.totalSessions = Object.keys(sessions).length;

  for (const sessionEvents of Object.values(sessions)) {
    const completedEvent = sessionEvents.find(
      (e) => e.event === "onboarding_completed",
    );
    const dropOffEvent = sessionEvents.find(
      (e) => e.event === "onboarding_dropped_off",
    );

    if (completedEvent) {
      summary.completedOnboarding++;
    } else if (dropOffEvent?.step != null) {
      const st = dropOffEvent.step;
      summary.dropOffByStep[st] = (summary.dropOffByStep[st] || 0) + 1;
    }

    for (const event of sessionEvents) {
      if (event.step != null && event.event === "step_entered") {
        const step = event.step;
        if (!summary.stepCompletionRates[step]) {
          summary.stepCompletionRates[step] = {
            entered: 0,
            completed: 0,
            rate: 0,
          };
        }
        summary.stepCompletionRates[step].entered++;
      }

      if (event.step != null && event.event === "step_completed") {
        const step = event.step;
        if (!summary.stepCompletionRates[step]) {
          summary.stepCompletionRates[step] = {
            entered: 0,
            completed: 0,
            rate: 0,
          };
        }
        summary.stepCompletionRates[step].completed++;
      }
    }
  }

  for (const step of Object.keys(summary.stepCompletionRates)) {
    const stepData = summary.stepCompletionRates[Number.parseInt(step, 10)];
    stepData.rate =
      stepData.entered > 0 ? (stepData.completed / stepData.entered) * 100 : 0;
  }

  summary.conversionRate =
    summary.totalSessions > 0
      ? (summary.completedOnboarding / summary.totalSessions) * 100
      : 0;

  // Find most common drop-off step
  const dropOffSteps = Object.entries(summary.dropOffByStep);
  if (dropOffSteps.length > 0) {
    const [step] = dropOffSteps.reduce((max, current) =>
      current[1] > max[1] ? current : max,
    );
    summary.mostCommonDropOffStep = Number.parseInt(step);
  }

  return summary;
}
