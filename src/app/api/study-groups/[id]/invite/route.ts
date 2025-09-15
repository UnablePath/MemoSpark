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
    const body = await request.json();
    const { invitee_email, invitee_id } = body;

    if (!invitee_email && !invitee_id) {
      return NextResponse.json({ 
        error: 'Either invitee_email or invitee_id is required' 
      }, { status: 400 });
    }

    // Check if user is a member and can invite
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to invite others' }, { status: 403 });
    }

    // Only admins and creators can invite to private groups
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('metadata, created_by')
      .eq('id', groupId)
      .single();

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const privacyLevel = group.metadata?.privacy_level || 'public';
    if (privacyLevel === 'private' && membership.role !== 'admin' && group.created_by !== userId) {
      return NextResponse.json({ 
        error: 'Only admins can invite to private groups' 
      }, { status: 403 });
    }

    let targetUserId = invitee_id;

    // If email provided, find user by email
    if (invitee_email && !invitee_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clerk_user_id')
        .eq('email', invitee_email)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ 
          error: 'User not found with that email address' 
        }, { status: 404 });
      }

      targetUserId = profile.clerk_user_id;
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      return NextResponse.json({ 
        error: 'User is already a member of this group' 
      }, { status: 400 });
    }

    // Check if invitation already exists
    const { data: existingInvite, error: inviteError } = await supabase
      .from('study_group_invitations')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('invitee_id', targetUserId)
      .single();

    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ 
        error: 'Invitation already sent to this user' 
      }, { status: 400 });
    }

    // Create invitation
    const { data: invitation, error: createInviteError } = await supabase
      .from('study_group_invitations')
      .insert({
        group_id: groupId,
        inviter_id: userId,
        invitee_id: targetUserId,
        status: 'pending'
      })
      .select()
      .single();

    if (createInviteError) {
      console.error('Error creating invitation:', createInviteError);
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      invitation 
    });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Get all invitations for this group
    const { data: invitations, error: invitationsError } = await supabase
      .from('study_group_invitations')
      .select(`
        *,
        inviter:profiles!study_group_invitations_inviter_id_fkey(name, email),
        invitee:profiles!study_group_invitations_invitee_id_fkey(name, email)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error in GET /api/study-groups/[id]/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
