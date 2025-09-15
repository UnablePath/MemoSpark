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

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*, conversation_id')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check privacy level
    const privacyLevel = group.metadata?.privacy_level || 'public';
    if (privacyLevel === 'private') {
      return NextResponse.json({ 
        error: 'This group is private. You need an invitation to join.' 
      }, { status: 403 });
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 });
    }

    // Add user as member
    const { data: membership, error: joinError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member'
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error joining group:', joinError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    // Add user to group conversation if it exists
    if (group.conversation_id) {
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: group.conversation_id,
          user_id: userId
        });
    }

    return NextResponse.json({ 
      message: 'Successfully joined the group',
      membership 
    });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
