import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const groupId = params.id;

    // Check if group exists and get conversation_id
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('created_by, conversation_id')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (group.created_by === userId) {
      return NextResponse.json({ 
        error: 'Group creator cannot leave. Transfer ownership or delete the group instead.' 
      }, { status: 400 });
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 400 });
    }

    // Remove user from group
    const { error: leaveError } = await supabase
      .from('study_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (leaveError) {
      console.error('Error leaving group:', leaveError);
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 });
    }

    // Remove user from group conversation if it exists
    if (group.conversation_id) {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', group.conversation_id)
        .eq('user_id', userId);
    }

    return NextResponse.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
