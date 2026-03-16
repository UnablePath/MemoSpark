import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import {
  ANONYMOUS_ID_COOKIE,
  buildSubjectKey,
  HOMEPAGE_CTA_EXPERIMENT_KEY,
} from '@/lib/analytics/experimentRuntime';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServerAdmin) {
      return NextResponse.json({ success: true, skipped: 'no_database' });
    }

    const body = await request.json();
    const experimentKey = body.experimentKey || HOMEPAGE_CTA_EXPERIMENT_KEY;
    const variantKey = body.variantKey;
    const page = body.page || '/';
    const metadata = body.metadata || {};
    const exposureKey = body.exposureKey;

    if (!variantKey || !exposureKey) {
      return NextResponse.json({ success: false, error: 'Missing variantKey or exposureKey' }, { status: 400 });
    }

    const { userId } = await auth();
    const anonymousId = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value || null;
    const subjectKey = buildSubjectKey(userId, anonymousId || 'unknown');

    const { data: experiment } = await supabaseServerAdmin
      .from('experiments')
      .select('id')
      .eq('key', experimentKey)
      .maybeSingle();

    if (!experiment) {
      return NextResponse.json({ success: false, error: 'Experiment not found' }, { status: 404 });
    }

    const { data: variant } = await supabaseServerAdmin
      .from('experiment_variants')
      .select('id')
      .eq('experiment_id', experiment.id)
      .eq('key', variantKey)
      .maybeSingle();

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    }

    const { data: assignment } = await supabaseServerAdmin
      .from('experiment_assignments')
      .select('id')
      .eq('experiment_id', experiment.id)
      .eq('subject_key', subjectKey)
      .maybeSingle();

    await supabaseServerAdmin.from('experiment_exposures').upsert(
      {
        experiment_id: experiment.id,
        variant_id: variant.id,
        assignment_id: assignment?.id || null,
        user_id: userId,
        anonymous_id: anonymousId,
        exposure_key: exposureKey,
        page,
        metadata,
        exposed_at: new Date().toISOString(),
      },
      {
        onConflict: 'experiment_id,exposure_key',
        ignoreDuplicates: true,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Experiment exposure error:', error);
    return NextResponse.json({ success: false, error: 'Exposure tracking failed' }, { status: 500 });
  }
}
