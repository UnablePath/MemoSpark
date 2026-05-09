import { NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

async function getMembership(supabase: any, groupId: string, userId: string) {
  const { data } = await supabase
    .from('study_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function POST(
  _request: Request,
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

    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('id, status, max_participants')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .maybeSingle();
    if (sessionError) {
      console.error('join session lookup:', sessionError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json({ error: 'Session is not joinable' }, { status: 409 });
    }

    const { count, error: countError } = await supabase
      .from('study_session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .in('status', ['joined', 'active']);
    if (countError) {
      console.error('join session count:', countError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }
    if (session.max_participants && (count ?? 0) >= session.max_participants) {
      return NextResponse.json({ error: 'Session is full' }, { status: 409 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('study_session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'joined')
      .maybeSingle();
    if (existingError) {
      console.error('join session existing lookup:', existingError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }
    if (existing) return NextResponse.json({ joined: true, idempotent: true });

    const { error: insertError } = await supabase
      .from('study_session_participants')
      .insert({
        session_id: sessionId,
        user_id: userId,
        status: 'joined',
      });
    if (insertError) {
      console.error('join session insert:', insertError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    return NextResponse.json({ joined: true });
  } catch (error) {
    console.error('POST /api/study-groups/[id]/sessions/[sessionId]/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
