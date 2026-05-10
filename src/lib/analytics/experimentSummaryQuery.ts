import { HOMEPAGE_CTA_EXPERIMENT_KEY } from "@/lib/analytics/experimentRuntime";
import { supabaseServerAdmin } from "@/lib/supabase/server";

export interface ExperimentVariantStatsSummary {
  variantKey: string;
  variantName: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  liftVsControl: number | null;
}

export interface ExperimentSummaryResult {
  success: true;
  experiment: { key: string; name: string };
  conversionType: string;
  windowDays: number;
  summary: {
    totalExposures: number;
    totalConversions: number;
    totalConversionValue: number;
  };
  variants: ExperimentVariantStatsSummary[];
  generatedAt: string;
}

export interface ExperimentSummaryFailure {
  success: false;
  error: string;
  status: number;
}

/**
 * Loads aggregated exposure/conversion stats for an experiment window.
 * Used by the summary API route and the admin experiments dashboard (service role only).
 */
export async function queryExperimentSummary(params: {
  experimentKey: string;
  conversionType: string;
  days: number;
}): Promise<ExperimentSummaryResult | ExperimentSummaryFailure> {
  if (!supabaseServerAdmin) {
    return { success: false, error: "Database not available", status: 500 };
  }

  const { experimentKey, conversionType, days } = params;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: experiment } = await supabaseServerAdmin
    .from("experiments")
    .select("id, key, name")
    .eq("key", experimentKey)
    .maybeSingle();

  if (!experiment) {
    return { success: false, error: "Experiment not found", status: 404 };
  }

  const { data: variants } = await supabaseServerAdmin
    .from("experiment_variants")
    .select("id, key, name, is_control")
    .eq("experiment_id", experiment.id);

  const { data: exposures } = await supabaseServerAdmin
    .from("experiment_exposures")
    .select("variant_id")
    .eq("experiment_id", experiment.id)
    .gte("exposed_at", startDate.toISOString());

  const { data: conversions } = await supabaseServerAdmin
    .from("experiment_conversions")
    .select("variant_id, conversion_type, value")
    .eq("experiment_id", experiment.id)
    .eq("conversion_type", conversionType)
    .gte("converted_at", startDate.toISOString());

  const exposureCountByVariant = new Map<string, number>();
  const conversionCountByVariant = new Map<string, number>();

  for (const exposure of exposures || []) {
    exposureCountByVariant.set(
      exposure.variant_id,
      (exposureCountByVariant.get(exposure.variant_id) || 0) + 1,
    );
  }

  for (const conversion of conversions || []) {
    conversionCountByVariant.set(
      conversion.variant_id,
      (conversionCountByVariant.get(conversion.variant_id) || 0) + 1,
    );
  }

  const stats: ExperimentVariantStatsSummary[] = (variants || []).map(
    (variant) => {
      const exposuresCount = exposureCountByVariant.get(variant.id) || 0;
      const conversionsCount = conversionCountByVariant.get(variant.id) || 0;
      const rate = exposuresCount === 0 ? 0 : conversionsCount / exposuresCount;

      return {
        variantKey: variant.key,
        variantName: variant.name,
        exposures: exposuresCount,
        conversions: conversionsCount,
        conversionRate: rate,
        liftVsControl: null,
      };
    },
  );

  const control = (variants || []).find((variant) => variant.is_control);
  const controlStats = control
    ? stats.find((stat) => stat.variantKey === control.key)
    : undefined;
  const controlRate = controlStats?.conversionRate || 0;

  const enrichedStats: ExperimentVariantStatsSummary[] = stats.map((stat) => ({
    ...stat,
    liftVsControl:
      controlRate === 0
        ? null
        : (stat.conversionRate - controlRate) / controlRate,
  }));

  return {
    success: true,
    experiment: {
      key: experiment.key,
      name: experiment.name,
    },
    conversionType,
    windowDays: days,
    summary: {
      totalExposures: exposures?.length || 0,
      totalConversions: conversions?.length || 0,
      totalConversionValue: (conversions || []).reduce(
        (sum, item) => sum + Number(item.value || 0),
        0,
      ),
    },
    variants: enrichedStats,
    generatedAt: new Date().toISOString(),
  };
}

export function defaultExperimentSummaryParams(searchParams: URLSearchParams): {
  experimentKey: string;
  conversionType: string;
  days: number;
} {
  return {
    experimentKey:
      searchParams.get("experimentKey") || HOMEPAGE_CTA_EXPERIMENT_KEY,
    conversionType: searchParams.get("conversionType") || "sign_up_started",
    days: Number.parseInt(searchParams.get("days") || "30", 10),
  };
}
