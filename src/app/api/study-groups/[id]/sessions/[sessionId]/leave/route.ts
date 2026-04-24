import { NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

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

    const { data: membership } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: session } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .maybeSingle();
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { error } = await supabase
      .from('study_session_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    if (error) {
      console.error('leave session:', error);
      return NextResponse.json({ error: 'Failed to leave session' }, { status: 500 });
    }

    return NextResponse.json({ left: true });
  } catch (error) {
    console.error('POST /api/study-groups/[id]/sessions/[sessionId]/leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
