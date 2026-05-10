import {
  defaultExperimentSummaryParams,
  queryExperimentSummary,
} from "@/lib/analytics/experimentSummaryQuery";
import { type NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.EXPERIMENT_ANALYTICS_SECRET?.trim();
  if (!secret) {
    return true;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const params = defaultExperimentSummaryParams(searchParams);

    const result = await queryExperimentSummary({
      experimentKey: params.experimentKey,
      conversionType: params.conversionType,
      days: params.days,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics:experiment_summary]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load summary" },
      { status: 500 },
    );
  }
}
