import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import {
  ANONYMOUS_ID_COOKIE,
  buildSubjectKey,
  chooseWeightedVariant,
  generateAnonymousId,
  hashToBucket,
  HOMEPAGE_CTA_EXPERIMENT_KEY,
  type ExperimentVariantRecord,
} from '@/lib/analytics/experimentRuntime';

function getAnonymousId(request: NextRequest): string {
  const existing = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value;
  if (existing) return existing;

  const userAgent = request.headers.get('user-agent') || 'unknown-agent';
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown-ip';
  return generateAnonymousId(`${userAgent}|${forwardedFor}|${Date.now()}|${Math.random()}`);
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
      const response = NextResponse.json({
        success: true,
        assignment: {
          experimentKey,
          variant: {
            key: 'control',
            name: 'Control',
            config: { ctaText: 'Sign Up Free', ctaClass: 'bg-primary text-primary-foreground' },
          },
          subjectKey,
          source: 'fallback',
        },
      });
      response.cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return response;
    }

    const { data: experiment, error: experimentError } = await supabaseServerAdmin
      .from('experiments')
      .select('id, key, name, rollout_percentage')
      .eq('key', experimentKey)
      .eq('status', 'active')
      .maybeSingle();

    if (experimentError || !experiment) {
      return NextResponse.json({ success: false, error: 'Experiment not found' }, { status: 404 });
    }

    const rolloutBucket = hashToBucket(`${subjectKey}:${experiment.key}`);
    if (rolloutBucket >= experiment.rollout_percentage) {
      return NextResponse.json({
        success: true,
        assignment: {
          experimentKey,
          variant: null,
          subjectKey,
          source: 'rollout_skip',
        },
      });
    }

    const { data: existingAssignment } = await supabaseServerAdmin
      .from('experiment_assignments')
      .select('id, variant_id, experiment_variants(id, key, name, config)')
      .eq('experiment_id', experiment.id)
      .eq('subject_key', subjectKey)
      .maybeSingle();

    if (existingAssignment?.id && existingAssignment.experiment_variants) {
      await supabaseServerAdmin
        .from('experiment_assignments')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingAssignment.id);

      const response = NextResponse.json({
        success: true,
        assignment: {
          experimentKey,
          variant: existingAssignment.experiment_variants,
          subjectKey,
          assignmentId: existingAssignment.id,
          source: 'existing',
        },
      });
      response.cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return response;
    }

    const { data: rawVariants, error: variantsError } = await supabaseServerAdmin
      .from('experiment_variants')
      .select('id, key, name, weight, config')
      .eq('experiment_id', experiment.id)
      .eq('is_active', true);

    if (variantsError || !rawVariants || rawVariants.length === 0) {
      return NextResponse.json({ success: false, error: 'No active variants' }, { status: 404 });
    }

    const variants = rawVariants.map(toVariantRecord);
    const chosen = chooseWeightedVariant(variants, `${subjectKey}:${experiment.id}`);

    const { data: insertedAssignment, error: assignmentError } = await supabaseServerAdmin
      .from('experiment_assignments')
      .insert({
        experiment_id: experiment.id,
        variant_id: chosen.id,
        subject_key: subjectKey,
        user_id: userId,
        anonymous_id: anonymousId,
        context,
      })
      .select('id')
      .single();

    if (assignmentError) {
      return NextResponse.json({ success: false, error: 'Failed to assign variant' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      assignment: {
        experimentKey,
        variant: chosen,
        subjectKey,
        assignmentId: insertedAssignment.id,
        source: 'new',
      },
    });

    response.cookies.set(ANONYMOUS_ID_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Experiment assignment error:', error);
    return NextResponse.json({ success: false, error: 'Assignment failed' }, { status: 500 });
  }
}
