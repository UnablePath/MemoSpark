import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
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

    // Get group details with members
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        *,
        study_group_members(
          *,
          profiles(name, email)
        ),
        profiles!study_groups_created_by_fkey(name)
      `)
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Error fetching group:', groupError);
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = group.study_group_members?.some(
      (member: any) => member.user_id === userId
    );

    // Return group with member info
    const groupWithMembers = {
      ...group,
      members: group.study_group_members?.map((member: any) => ({
        ...member,
        name: member.profiles?.name,
        email: member.profiles?.email
      })) || [],
      creator_name: group.profiles?.name || 'Unknown',
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
    const body = await request.json();
    const { name, description, privacy_level } = body;

    // Check if user is admin of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (memberError || membership?.role !== 'admin') {
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

    // Check if user is the creator or admin
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.created_by !== userId) {
      // Check if user is admin
      const { data: membership, error: memberError } = await supabase
        .from('study_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError || membership?.role !== 'admin') {
        return NextResponse.json({ error: 'Only group creator or admin can delete the group' }, { status: 403 });
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
