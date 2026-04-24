import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const params = await context.params;
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const invitationId = params.invitationId;
    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be either "accept" or "decline"' 
      }, { status: 400 });
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('study_group_invitations')
      .select(`
        *,
        study_groups(conversation_id, max_members, is_archived)
      `)
      .eq('id', invitationId)
      .eq('invitee_id', userId)
      .maybeSingle();

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 });
    }
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: 'Invitation already processed', status: invitation.status },
        { status: 200 },
      );
    }

    if (action === 'accept') {
      if (invitation.study_groups?.is_archived) {
        return NextResponse.json({ error: 'Group is archived' }, { status: 409 });
      }
      if (invitation.study_groups?.max_members) {
        const { count } = await supabase
          .from('study_group_members')
          .select('id', { head: true, count: 'exact' })
          .eq('group_id', invitation.group_id);
        if ((count ?? 0) >= invitation.study_groups.max_members) {
          return NextResponse.json({ error: 'Group is full' }, { status: 409 });
        }
      }

      const { data: existingMembership } = await supabase
        .from('study_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', userId)
        .maybeSingle();

      // Add user to group
      const { error: memberError } = existingMembership
        ? { error: null }
        : await supabase
            .from('study_group_members')
            .insert({
              group_id: invitation.group_id,
              user_id: userId,
              role: 'member'
            });

      if (memberError) {
        console.error('Error adding member:', memberError);
        return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
      }

      // Add user to group conversation if it exists
      if (invitation.study_groups?.conversation_id) {
        await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: invitation.study_groups.conversation_id,
            user_id: userId
          });
      }
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('study_group_invitations')
      .update({ 
        status: action === 'accept' ? 'accepted' : 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Invitation ${action}ed successfully` 
    });
  } catch (error) {
    console.error('Error in POST /api/study-groups/invitations/[invitationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
