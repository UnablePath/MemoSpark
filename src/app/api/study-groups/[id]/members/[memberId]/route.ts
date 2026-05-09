import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

function canManage(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const params = await context.params;
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const groupId = params.id;
    const memberId = params.memberId;
    const body = await request.json();
    const { roleId, roleName } = body ?? {};
    const normalizedRoleName =
      typeof roleName === 'string' ? roleName.trim().toLowerCase() : null;
    if (!roleId && !normalizedRoleName) {
      return NextResponse.json({ error: 'roleId or roleName is required' }, { status: 400 });
    }

    const { data: actorMembership, error: actorMembershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (actorMembershipError || !actorMembership || !canManage(actorMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .maybeSingle();
    if (targetMembershipError || !targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    let nextRoleName: string | null = null;
    let nextRoleId: string | null = null;

    if (normalizedRoleName) {
      if (!['admin', 'moderator', 'member'].includes(normalizedRoleName)) {
        return NextResponse.json({ error: 'Invalid role name' }, { status: 400 });
      }
      nextRoleName = normalizedRoleName;
      const { data: roleByName } = await supabase
        .from('group_roles')
        .select('id')
        .eq('name', normalizedRoleName)
        .maybeSingle();
      nextRoleId = roleByName?.id ?? null;
    } else {
      const { data: targetRole, error: targetRoleError } = await supabase
        .from('group_roles')
        .select('id, name')
        .eq('id', roleId)
        .maybeSingle();
      if (targetRoleError || !targetRole) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }
      nextRoleName = targetRole.name;
      nextRoleId = targetRole.id;
    }

    if (nextRoleName === 'owner') {
      return NextResponse.json({ error: 'Use ownership transfer for owner role' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('study_group_members')
      .update({ role: nextRoleName, role_id: nextRoleId })
      .eq('id', targetMembership.id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in PATCH /api/study-groups/[id]/members/[memberId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const params = await context.params;
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const groupId = params.id;
    const memberId = params.memberId;

    const { data: actorMembership, error: actorMembershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (actorMembershipError || !actorMembership || !canManage(actorMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .maybeSingle();
    if (targetMembershipError || !targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove group owner' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('study_group_members')
      .delete()
      .eq('id', targetMembership.id);
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // Also remove them from the conversation if one exists
    const { data: group } = await supabase
      .from('study_groups')
      .select('conversation_id')
      .eq('id', groupId)
      .single();

    if (group?.conversation_id) {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', group.conversation_id)
        .eq('user_id', memberId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in DELETE /api/study-groups/[id]/members/[memberId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
