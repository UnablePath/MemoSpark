import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { supabase, userId } = await getSupabaseWithClerkAuth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const groupId = params.id;
    const body = await request.json();
    const { newOwnerId } = body ?? {};
    if (!newOwnerId || typeof newOwnerId !== 'string') {
      return NextResponse.json({ error: 'newOwnerId is required' }, { status: 400 });
    }

    const { data: currentOwnerMembership, error: currentOwnerError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (currentOwnerError || !currentOwnerMembership || currentOwnerMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can transfer ownership' }, { status: 403 });
    }

    const { data: newOwnerMembership, error: newOwnerError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', newOwnerId)
      .maybeSingle();
    if (newOwnerError || !newOwnerMembership) {
      return NextResponse.json({ error: 'Target member not found' }, { status: 404 });
    }
    if (newOwnerMembership.role === 'owner') {
      return NextResponse.json({ ok: true });
    }

    const { data: ownerRole, error: ownerRoleError } = await supabase
      .from('group_roles')
      .select('id')
      .eq('name', 'owner')
      .maybeSingle();
    const { data: adminRole, error: adminRoleError } = await supabase
      .from('group_roles')
      .select('id')
      .eq('name', 'admin')
      .maybeSingle();
    if (ownerRoleError || !ownerRole || adminRoleError || !adminRole) {
      return NextResponse.json({ error: 'Required roles not configured' }, { status: 500 });
    }

    const { error: promoteError } = await supabase
      .from('study_group_members')
      .update({ role: 'owner', role_id: ownerRole.id })
      .eq('id', newOwnerMembership.id);
    if (promoteError) {
      return NextResponse.json({ error: 'Failed to promote new owner' }, { status: 500 });
    }

    const { error: demoteError } = await supabase
      .from('study_group_members')
      .update({ role: 'admin', role_id: adminRole.id })
      .eq('id', currentOwnerMembership.id);
    if (demoteError) {
      return NextResponse.json({ error: 'Failed to demote previous owner' }, { status: 500 });
    }

    const { error: groupUpdateError } = await supabase
      .from('study_groups')
      .update({ created_by: newOwnerId })
      .eq('id', groupId);
    if (groupUpdateError) {
      return NextResponse.json({ error: 'Failed to update group owner' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/ownership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
