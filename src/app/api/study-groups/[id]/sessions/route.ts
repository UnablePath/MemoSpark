import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

function isAdminLike(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

async function getMembership(
  supabase: any,
  groupId: string,
  userId: string,
): Promise<{ role: string } | null> {
  const { data } = await supabase
    .from('study_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const groupId = params.id;
    const { supabase, userId } = await getSupabaseWithClerkAuth();

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const membership = await getMembership(supabase, groupId, userId);
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('GET sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    console.error('GET /api/study-groups/[id]/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const groupId = params.id;
    const { supabase, userId } = await getSupabaseWithClerkAuth();

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const membership = await getMembership(supabase, groupId, userId);
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!isAdminLike(membership.role)) {
      return NextResponse.json({ error: 'Only owner/admin can create sessions' }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const startTime = typeof body.start_time === 'string' ? body.start_time : null;
    const endTime = typeof body.end_time === 'string' ? body.end_time : null;
    const maxParticipants =
      typeof body.max_participants === 'number' ? body.max_participants : null;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'title, start_time and end_time are required' },
        { status: 400 },
      );
    }
    if (Number.isNaN(Date.parse(startTime)) || Number.isNaN(Date.parse(endTime))) {
      return NextResponse.json({ error: 'Invalid date values' }, { status: 400 });
    }
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
    }
    if (maxParticipants !== null && maxParticipants < 1) {
      return NextResponse.json({ error: 'max_participants must be >= 1' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        group_id: groupId,
        created_by: userId,
        title,
        description: typeof body.description === 'string' ? body.description : null,
        session_type: typeof body.session_type === 'string' ? body.session_type : 'general',
        start_time: startTime,
        end_time: endTime,
        max_participants: maxParticipants,
        status: 'scheduled',
        metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
      })
      .select('*')
      .single();

    if (error) {
      console.error('POST sessions:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/study-groups/[id]/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
