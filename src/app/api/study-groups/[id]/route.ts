import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

export async function GET(
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

    // Get base group first; avoid relationship-join syntax that depends on schema cache FK hints.
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Error fetching group:', groupError);
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { data: groupMembers, error: membersError } = await supabase
      .from('study_group_members')
      .select('*')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
    }

    const profileIds = Array.from(
      new Set(
        [group.created_by, ...(groupMembers ?? []).map((member: any) => member.user_id)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    );

    let profilesByClerkId: Record<string, { full_name: string | null; email: string | null }> = {};
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', profileIds);

      if (profilesError) {
        console.error('Error fetching profiles for group:', profilesError);
      } else {
        profilesByClerkId = (profiles ?? []).reduce((acc, profile: any) => {
          acc[profile.clerk_user_id] = {
            full_name: profile.full_name ?? null,
            email: profile.email ?? null,
          };
          return acc;
        }, {} as Record<string, { full_name: string | null; email: string | null }>);
      }
    }

    // Check if user is a member
    const isMember = (groupMembers ?? []).some(
      (member: any) => member.user_id === userId
    );
    const isPrivate = (group.privacy_level || group.metadata?.privacy_level) === 'private';
    if (isPrivate && !isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const memberRole = (groupMembers ?? []).find(
      (member: any) => member.user_id === userId,
    )?.role;
    const canSeeEmails = memberRole === 'admin' || memberRole === 'owner' || group.created_by === userId;

    // Return group with member info
    const groupWithMembers = {
      ...group,
      members: (groupMembers ?? []).map((member: any) => ({
        ...member,
        name: profilesByClerkId[member.user_id]?.full_name ?? null,
        email: canSeeEmails ? (profilesByClerkId[member.user_id]?.email ?? null) : null
      })),
      creator_name: profilesByClerkId[group.created_by]?.full_name || 'Unknown',
      is_member: isMember
    };

    return NextResponse.json({ group: groupWithMembers });
  } catch (error) {
    console.error('Error in GET /api/study-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();
    const { name, description, privacy_level } = body;

    // Check if user is admin of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || (membership?.role !== 'admin' && membership?.role !== 'owner')) {
      return NextResponse.json({ error: 'Only group admins can edit the group' }, { status: 403 });
    }

    // Update the group
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (privacy_level) {
      updateData.metadata = { privacy_level };
    }

    const { data: group, error: updateError } = await supabase
      .from('study_groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating group:', updateError);
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Error in PUT /api/study-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if user is the creator/owner (delete is owner-only).
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.created_by !== userId) {
      const { data: membership, error: memberError } = await supabase
        .from('study_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      if (memberError || membership?.role !== 'owner') {
        return NextResponse.json({ error: 'Only the group owner can delete the group' }, { status: 403 });
      }
    }

    // Delete the group (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('study_groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/study-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
