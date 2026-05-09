import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

function isAdminLike(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

const VALID_STATUS = new Set(['scheduled', 'active', 'completed', 'cancelled']);
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

async function getMembership(supabase: any, groupId: string, userId: string) {
  const { data } = await supabase
    .from('study_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const params = await context.params;
    const groupId = params.id;
    const sessionId = params.sessionId;
    const { supabase, userId } = await getSupabaseWithClerkAuth();

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const membership = await getMembership(supabase, groupId, userId);
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isAdminLike(membership.role)) {
      return NextResponse.json({ error: 'Only owner/admin can update sessions' }, { status: 403 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .maybeSingle();
    if (existingError) {
      console.error('PATCH session lookup:', existingError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.title === 'string') updateData.title = body.title.trim();
    if (typeof body.description === 'string' || body.description === null) {
      updateData.description = body.description;
    }
    if (typeof body.session_type === 'string') updateData.session_type = body.session_type;
    if (typeof body.start_time === 'string') {
      if (Number.isNaN(Date.parse(body.start_time))) {
        return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 });
      }
      updateData.start_time = body.start_time;
    }
    if (typeof body.end_time === 'string') {
      if (Number.isNaN(Date.parse(body.end_time))) {
        return NextResponse.json({ error: 'Invalid end_time' }, { status: 400 });
      }
      updateData.end_time = body.end_time;
    }
    if (typeof body.max_participants === 'number') {
      if (body.max_participants < 1) {
        return NextResponse.json({ error: 'max_participants must be >= 1' }, { status: 400 });
      }
      updateData.max_participants = body.max_participants;
    }
    if (body.max_participants === null) updateData.max_participants = null;

    if (typeof body.status === 'string') {
      if (!VALID_STATUS.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const fromStatus = String(existing.status);
      const toStatus = body.status;
      if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) && fromStatus !== toStatus) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 409 });
      }
      updateData.status = toStatus;
    }

    const { data: updated, error: updateError } = await supabase
      .from('study_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .select('*')
      .single();

    if (updateError) {
      console.error('PATCH session update:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('PATCH /api/study-groups/[id]/sessions/[sessionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
