import { type NextRequest, NextResponse } from 'next/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import { HOMEPAGE_CTA_EXPERIMENT_KEY } from '@/lib/analytics/experimentRuntime';

interface VariantStats {
  variantKey: string;
  variantName: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServerAdmin) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const experimentKey = searchParams.get('experimentKey') || HOMEPAGE_CTA_EXPERIMENT_KEY;
    const conversionType = searchParams.get('conversionType') || 'sign_up_started';
    const days = Number.parseInt(searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: experiment } = await supabaseServerAdmin
      .from('experiments')
      .select('id, key, name')
      .eq('key', experimentKey)
      .maybeSingle();

    if (!experiment) {
      return NextResponse.json({ success: false, error: 'Experiment not found' }, { status: 404 });
    }

    const { data: variants } = await supabaseServerAdmin
      .from('experiment_variants')
      .select('id, key, name, is_control')
      .eq('experiment_id', experiment.id);

    const { data: exposures } = await supabaseServerAdmin
      .from('experiment_exposures')
      .select('variant_id')
      .eq('experiment_id', experiment.id)
      .gte('exposed_at', startDate.toISOString());

    const { data: conversions } = await supabaseServerAdmin
      .from('experiment_conversions')
      .select('variant_id, conversion_type, value')
      .eq('experiment_id', experiment.id)
      .eq('conversion_type', conversionType)
      .gte('converted_at', startDate.toISOString());

    const exposureCountByVariant = new Map<string, number>();
    const conversionCountByVariant = new Map<string, number>();
    const valueByVariant = new Map<string, number>();

    for (const exposure of exposures || []) {
      exposureCountByVariant.set(
        exposure.variant_id,
        (exposureCountByVariant.get(exposure.variant_id) || 0) + 1
      );
    }

    for (const conversion of conversions || []) {
      conversionCountByVariant.set(
        conversion.variant_id,
        (conversionCountByVariant.get(conversion.variant_id) || 0) + 1
      );
      valueByVariant.set(
        conversion.variant_id,
        (valueByVariant.get(conversion.variant_id) || 0) + Number(conversion.value || 0)
      );
    }

    const stats: VariantStats[] = (variants || []).map((variant) => {
      const exposuresCount = exposureCountByVariant.get(variant.id) || 0;
      const conversionsCount = conversionCountByVariant.get(variant.id) || 0;
      const rate = exposuresCount === 0 ? 0 : conversionsCount / exposuresCount;

      return {
        variantKey: variant.key,
        variantName: variant.name,
        exposures: exposuresCount,
        conversions: conversionsCount,
        conversionRate: rate,
      };
    });

    const control = (variants || []).find((variant) => variant.is_control);
    const controlStats = control
      ? stats.find((stat) => stat.variantKey === control.key)
      : undefined;
    const controlRate = controlStats?.conversionRate || 0;

    const enrichedStats = stats.map((stat) => ({
      ...stat,
      liftVsControl: controlRate === 0 ? null : (stat.conversionRate - controlRate) / controlRate,
    }));

    return NextResponse.json({
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
        totalConversionValue: (conversions || []).reduce((sum, item) => sum + Number(item.value || 0), 0),
      },
      variants: enrichedStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Experiment summary error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load summary' }, { status: 500 });
  }
}
