import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get all pending invitations for the current user
    const { data: invitations, error: invitationsError } = await supabase
      .from('study_group_invitations')
      .select(`
        *,
        study_groups(name, description),
        inviter:profiles!study_group_invitations_inviter_id_fkey(full_name, email)
      `)
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching user invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error in GET /api/study-groups/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
