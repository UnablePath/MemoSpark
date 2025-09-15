import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { userId } = await auth();
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
        study_groups(conversation_id)
      `)
      .eq('id', invitationId)
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or already processed' 
      }, { status: 404 });
    }

    if (action === 'accept') {
      // Add user to group
      const { error: memberError } = await supabase
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
