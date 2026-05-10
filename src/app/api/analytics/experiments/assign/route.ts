import {
  ANONYMOUS_ID_COOKIE,
  type ExperimentVariantRecord,
  HOMEPAGE_CTA_EXPERIMENT_KEY,
  HOMEPAGE_CTA_VARIANT_COOKIE,
  buildSubjectKey,
  chooseWeightedVariant,
  generateAnonymousId,
  hashToBucket,
} from "@/lib/analytics/experimentRuntime";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

function getAnonymousId(request: NextRequest): string {
  const existing = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value;
  if (existing) return existing;

  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  const forwardedFor = request.headers.get("x-forwarded-for") || "unknown-ip";
  return generateAnonymousId(
    `${userAgent}|${forwardedFor}|${Date.now()}|${Math.random()}`,
  );
}

function toVariantRecord(raw: any): ExperimentVariantRecord {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    weight: raw.weight,
    config: raw.config || {},
  };
}

const CONTROL_CTA_VARIANT = {
  key: "control",
  name: "Control",
  config: {
    ctaText: "Sign Up Free",
    ctaClass: "bg-primary text-primary-foreground",
  },
} as const;

function setAnonymousCookie(response: NextResponse, anonymousId: string) {
  response.cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Lets the browser attribute sign-up even if localStorage was cleared (first-party, not httpOnly). */
function setHomepageCtaVariantClientCookie(
  response: NextResponse,
  experimentKey: string,
  variantKey: string | null,
) {
  if (experimentKey !== HOMEPAGE_CTA_EXPERIMENT_KEY) {
    return;
  }
  if (!variantKey) {
    response.cookies.set(HOMEPAGE_CTA_VARIANT_COOKIE, "", {
      maxAge: 0,
      path: "/",
    });
    return;
  }
  response.cookies.set(HOMEPAGE_CTA_VARIANT_COOKIE, variantKey, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
    path: "/",
  });
}

function attachAssignmentCookies(
  response: NextResponse,
  experimentKey: string,
  anonymousId: string,
  variantKey: string | null,
) {
  setAnonymousCookie(response, anonymousId);
  setHomepageCtaVariantClientCookie(response, experimentKey, variantKey);
}

/**
 * When the experiment is not configured in Postgres yet, or Supabase query fails,
 * return **HTTP 200** with the control variant. Using 404 here made browsers and
 * DevTools report POST /assign as “Not Found” even though the App Router route exists.
 */
function respondControlFallback(
  experimentKey: string,
  anonymousId: string,
  subjectKey: string,
  source:
    | "fallback"
    | "experiment_unavailable"
    | "experiment_not_found"
    | "no_active_variants",
) {
  const response = NextResponse.json({
    success: true,
    assignment: {
      experimentKey,
      variant: { ...CONTROL_CTA_VARIANT },
      subjectKey,
      source,
    },
  });
  attachAssignmentCookies(
    response,
    experimentKey,
    anonymousId,
    CONTROL_CTA_VARIANT.key,
  );
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const experimentKey = body.experimentKey || HOMEPAGE_CTA_EXPERIMENT_KEY;
    const context = body.context || {};

    const { userId } = await auth();
    const anonymousId = getAnonymousId(request);
    const subjectKey = buildSubjectKey(userId, anonymousId);

    // Fallback in local development where service role may not be configured.
    if (!supabaseServerAdmin) {
      return respondControlFallback(
        experimentKey,
        anonymousId,
        subjectKey,
        "fallback",
      );
    }

    const { data: experiment, error: experimentError } =
      await supabaseServerAdmin
        .from("experiments")
        .select("id, key, name, rollout_percentage")
        .eq("key", experimentKey)
        .eq("status", "active")
        .maybeSingle();

    if (experimentError || !experiment) {
      if (experimentError) {
        console.error("[analytics:experiment_assign]", experimentError);
      } else {
        console.warn(
          "[analytics:experiment_assign] No active experiment for key:",
          experimentKey,
        );
      }
      return respondControlFallback(
        experimentKey,
        anonymousId,
        subjectKey,
        experimentError ? "experiment_unavailable" : "experiment_not_found",
      );
    }

    const rolloutBucket = hashToBucket(`${subjectKey}:${experiment.key}`);
    if (rolloutBucket >= experiment.rollout_percentage) {
      const rolloutResponse = NextResponse.json({
        success: true,
        assignment: {
          experimentKey,
          variant: null,
          subjectKey,
          source: "rollout_skip",
        },
      });
      setHomepageCtaVariantClientCookie(rolloutResponse, experimentKey, null);
      return rolloutResponse;
    }

    const { data: existingAssignment } = await supabaseServerAdmin
      .from("experiment_assignments")
      .select("id, variant_id, experiment_variants(id, key, name, config)")
      .eq("experiment_id", experiment.id)
      .eq("subject_key", subjectKey)
      .maybeSingle();

    if (existingAssignment?.id && existingAssignment.experiment_variants) {
      await supabaseServerAdmin
        .from("experiment_assignments")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existingAssignment.id);

      const ev = existingAssignment.experiment_variants as {
        key?: string;
      } | null;
      const response = NextResponse.json({
        success: true,
        assignment: {
          experimentKey,
          variant: existingAssignment.experiment_variants,
          subjectKey,
          assignmentId: existingAssignment.id,
          source: "existing",
        },
      });
      attachAssignmentCookies(
        response,
        experimentKey,
        anonymousId,
        ev?.key ?? null,
      );
      return response;
    }

    const { data: rawVariants, error: variantsError } =
      await supabaseServerAdmin
        .from("experiment_variants")
        .select("id, key, name, weight, config")
        .eq("experiment_id", experiment.id)
        .eq("is_active", true);

    if (variantsError || !rawVariants || rawVariants.length === 0) {
      if (variantsError) {
        console.error("[analytics:experiment_assign]", variantsError);
      }
      return respondControlFallback(
        experimentKey,
        anonymousId,
        subjectKey,
        "no_active_variants",
      );
    }

    const variants = rawVariants.map(toVariantRecord);
    const chosen = chooseWeightedVariant(
      variants,
      `${subjectKey}:${experiment.id}`,
    );

    const { data: insertedAssignment, error: assignmentError } =
      await supabaseServerAdmin
        .from("experiment_assignments")
        .insert({
          experiment_id: experiment.id,
          variant_id: chosen.id,
          subject_key: subjectKey,
          user_id: userId,
          anonymous_id: anonymousId,
          context,
        })
        .select("id")
        .single();

    if (assignmentError) {
      return NextResponse.json(
        { success: false, error: "Failed to assign variant" },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      success: true,
      assignment: {
        experimentKey,
        variant: chosen,
        subjectKey,
        assignmentId: insertedAssignment.id,
        source: "new",
      },
    });

    attachAssignmentCookies(response, experimentKey, anonymousId, chosen.key);

    return response;
  } catch (error) {
    console.error("[analytics:experiment_assign]", error);
    return NextResponse.json(
      { success: false, error: "Assignment failed" },
      { status: 500 },
    );
  }
}
