import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const groupId = params.id;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('id, conversation_id, metadata, privacy_level, max_members, is_archived')
      .eq('id', groupId)
      .maybeSingle();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check privacy level
    const privacyLevel = group.privacy_level || group.metadata?.privacy_level || 'public';
    if (privacyLevel === 'private' || privacyLevel === 'invite_only') {
      return NextResponse.json({ 
        error: 'This group is private. You need an invitation to join.' 
      }, { status: 403 });
    }
    if (group.is_archived) {
      return NextResponse.json({ error: 'This group is archived' }, { status: 409 });
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ message: 'Already a member', membership: existingMembership }, { status: 200 });
    }

    if (group.max_members) {
      const { count, error: countError } = await supabase
        .from('study_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);
      if (countError) {
        console.error('Error checking member capacity:', countError);
        return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
      }
      if ((count ?? 0) >= group.max_members) {
        return NextResponse.json({ error: 'Group is full' }, { status: 409 });
      }
    }

    // Fetch role_id for member
    const { data: roleData } = await supabase
      .from('group_roles')
      .select('id')
      .eq('name', 'member')
      .maybeSingle();

    // Add user as member
    const { data: membership, error: joinError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        role_id: roleData?.id ?? null
      })
      .select()
      .single();

    if (joinError) {
      if ((joinError as any)?.code === '23505') {
        return NextResponse.json({ message: 'Already a member' }, { status: 200 });
      }
      console.error('Error joining group:', joinError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    // Add user to group conversation if it exists
    if (group.conversation_id) {
      const { error: convError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: group.conversation_id,
          user_id: userId
        });

      if (convError && (convError as any).code !== '23505') {
        console.error('Error adding user to conversation:', convError);
        // We don't necessarily want to fail the whole join if the chat sync fails,
        // but for high-end collaborative apps, the chat is essential.
        // We will return a partial success or warning if needed, but here we'll log it.
      }
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
