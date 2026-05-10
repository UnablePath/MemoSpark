import {
  ANONYMOUS_ID_COOKIE,
  HOMEPAGE_CTA_EXPERIMENT_KEY,
  buildSubjectKey,
} from "@/lib/analytics/experimentRuntime";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServerAdmin) {
      return NextResponse.json({ success: true, skipped: "no_database" });
    }

    const body = await request.json();
    const experimentKey = body.experimentKey || HOMEPAGE_CTA_EXPERIMENT_KEY;
    const variantKey = body.variantKey;
    const conversionType = body.conversionType;
    const value = typeof body.value === "number" ? body.value : null;
    const currency = body.currency || null;
    const metadata = body.metadata || {};

    if (!variantKey || !conversionType) {
      return NextResponse.json(
        { success: false, error: "Missing variantKey or conversionType" },
        { status: 400 },
      );
    }

    const { userId } = await auth();
    const anonymousId = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value || null;
    const subjectKey = buildSubjectKey(userId, anonymousId || "unknown");

    const { data: experiment } = await supabaseServerAdmin
      .from("experiments")
      .select("id")
      .eq("key", experimentKey)
      .maybeSingle();

    if (!experiment) {
      return NextResponse.json({
        success: true,
        skipped: "experiment_not_configured",
      });
    }

    const { data: variant } = await supabaseServerAdmin
      .from("experiment_variants")
      .select("id")
      .eq("experiment_id", experiment.id)
      .eq("key", variantKey)
      .maybeSingle();

    if (!variant) {
      return NextResponse.json({
        success: true,
        skipped: "variant_not_configured",
      });
    }

    const { data: assignment } = await supabaseServerAdmin
      .from("experiment_assignments")
      .select("id")
      .eq("experiment_id", experiment.id)
      .eq("subject_key", subjectKey)
      .maybeSingle();

    await supabaseServerAdmin.from("experiment_conversions").insert({
      experiment_id: experiment.id,
      variant_id: variant.id,
      assignment_id: assignment?.id || null,
      user_id: userId,
      anonymous_id: anonymousId,
      conversion_type: conversionType,
      value,
      currency,
      metadata,
      converted_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[analytics:experiment_conversion]", error);
    return NextResponse.json(
      { success: false, error: "Conversion tracking failed" },
      { status: 500 },
    );
  }
}
