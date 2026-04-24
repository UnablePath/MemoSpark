import { type NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

type GroupMembership = {
  role: string | null;
};

function isAdminLike(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'owner';
}

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
    const body = await request.json();
    const { invitee_email, invitee_id } = body;
    // #region agent log
    fetch('http://127.0.0.1:7398/ingest/7639c4aa-a48b-4a9d-a431-e9f3a0abb933',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8f8d91'},body:JSON.stringify({sessionId:'8f8d91',runId:'invite-debug-1',hypothesisId:'H1',location:'src/app/api/study-groups/[id]/invite/route.ts:30',message:'invite request received',data:{groupId,hasInviteeEmail:Boolean(invitee_email),hasInviteeId:Boolean(invitee_id),inviteeEmailDomain:typeof invitee_email==='string'&&invitee_email.includes('@')?invitee_email.split('@')[1]:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!invitee_email && !invitee_id) {
      return NextResponse.json({ 
        error: 'Either invitee_email or invitee_id is required' 
      }, { status: 400 });
    }
    if (invitee_email && typeof invitee_email !== 'string') {
      return NextResponse.json({ error: 'invitee_email must be a string' }, { status: 400 });
    }
    if (invitee_id && typeof invitee_id !== 'string') {
      return NextResponse.json({ error: 'invitee_id must be a string' }, { status: 400 });
    }

    // Check if user is a member and can invite
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle<GroupMembership>();
    // #region agent log
    fetch('http://127.0.0.1:7398/ingest/7639c4aa-a48b-4a9d-a431-e9f3a0abb933',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8f8d91'},body:JSON.stringify({sessionId:'8f8d91',runId:'invite-debug-1',hypothesisId:'H2',location:'src/app/api/study-groups/[id]/invite/route.ts:49',message:'membership check',data:{groupId,userId,membershipRole:membership?.role??null,membershipErrorCode:membershipError?.code??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to invite others' }, { status: 403 });
    }

    // Only admins and creators can invite to private groups
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('metadata, created_by')
      .eq('id', groupId)
      .single();
    // #region agent log
    fetch('http://127.0.0.1:7398/ingest/7639c4aa-a48b-4a9d-a431-e9f3a0abb933',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8f8d91'},body:JSON.stringify({sessionId:'8f8d91',runId:'invite-debug-1',hypothesisId:'H3',location:'src/app/api/study-groups/[id]/invite/route.ts:60',message:'group lookup',data:{groupId,groupFound:Boolean(group),groupErrorCode:groupError?.code??null,createdBy:group?.created_by??null,privacy:group?.metadata?.privacy_level??'public'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (groupError) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const privacyLevel = group.metadata?.privacy_level || 'public';
    if (privacyLevel === 'private' && !isAdminLike(membership.role) && group.created_by !== userId) {
      return NextResponse.json({ 
        error: 'Only admins can invite to private groups' 
      }, { status: 403 });
    }

    let targetUserId = invitee_id;

    // If email provided, find user by email
    if (invitee_email && !invitee_id) {
      const normalizedEmail = invitee_email.trim().toLowerCase();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clerk_user_id')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      // #region agent log
      fetch('http://127.0.0.1:7398/ingest/7639c4aa-a48b-4a9d-a431-e9f3a0abb933',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8f8d91'},body:JSON.stringify({sessionId:'8f8d91',runId:'invite-debug-1',hypothesisId:'H4',location:'src/app/api/study-groups/[id]/invite/route.ts:81',message:'profile lookup by email',data:{inviteeEmailDomain:typeof invitee_email==='string'&&invitee_email.includes('@')?invitee_email.split('@')[1]:null,profileFound:Boolean(profile),profileErrorCode:profileError?.code??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (profileError) {
        return NextResponse.json({ error: 'Failed to resolve invitee' }, { status: 500 });
      }

      if (profile?.clerk_user_id) {
        targetUserId = profile.clerk_user_id;
      } else {
        // Fallback for users who exist in Clerk but are missing a synced profile row.
        try {
          const client = await clerkClient();

          const directLookup = await client.users.getUserList({
            emailAddress: [normalizedEmail],
            limit: 10,
          });
          const directMatch = directLookup.data.find((u) =>
            u.emailAddresses.some(
              (emailAddress) => emailAddress.emailAddress.toLowerCase() === normalizedEmail,
            ),
          );
          if (directMatch?.id) {
            targetUserId = directMatch.id;
          }

          // Some Clerk projects are stricter with the emailAddress filter.
          // Query fallback keeps invite resolution robust.
          if (!targetUserId) {
            const queryLookup = await client.users.getUserList({
              query: normalizedEmail,
              limit: 10,
            });
            const queryMatch = queryLookup.data.find((u) =>
              u.emailAddresses.some(
                (emailAddress) => emailAddress.emailAddress.toLowerCase() === normalizedEmail,
              ),
            );
            if (queryMatch?.id) {
              targetUserId = queryMatch.id;
            }
          }
        } catch (clerkLookupError) {
          console.error('Clerk lookup failed for invite email:', clerkLookupError);
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({
        error: 'User not found with that email address',
      }, { status: 404 });
    }
    if (!targetUserId) {
      return NextResponse.json({ error: 'Unable to resolve invite target' }, { status: 400 });
    }
    if (targetUserId === userId) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
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
    // #region agent log
    fetch('http://127.0.0.1:7398/ingest/7639c4aa-a48b-4a9d-a431-e9f3a0abb933',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8f8d91'},body:JSON.stringify({sessionId:'8f8d91',runId:'invite-debug-1',hypothesisId:'H5',location:'src/app/api/study-groups/[id]/invite/route.ts:136',message:'invitation create attempt',data:{groupId,targetUserId,created:Boolean(invitation),createErrorCode:createInviteError?.code??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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

    // Check group exists first to provide deterministic 404 vs 403.
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('id')
      .eq('id', groupId)
      .maybeSingle();

    if (groupError) {
      console.error('Error checking group existence:', groupError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Members can read invitations, only admins/owners can see full contact fields.
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle<GroupMembership>();

    if (membershipError) {
      console.error('Error checking membership for invitation listing:', membershipError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canSeeSensitive = isAdminLike(membership.role);

    // Get all invitations for this group.
    const { data: invitations, error: invitationsError } = await supabase
      .from('study_group_invitations')
      .select(`
        id,
        group_id,
        inviter_id,
        invitee_id,
        status,
        created_at,
        updated_at
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    const inviterIds = Array.from(new Set((invitations ?? []).map((item: any) => item.inviter_id)));
    const inviteeIds = Array.from(new Set((invitations ?? []).map((item: any) => item.invitee_id)));
    const profileIds = Array.from(new Set([...inviterIds, ...inviteeIds].filter(Boolean)));

    let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', profileIds);
      profileMap = (profiles ?? []).reduce(
        (acc: Record<string, { full_name: string | null; email: string | null }>, row: any) => {
          acc[row.clerk_user_id] = { full_name: row.full_name ?? null, email: row.email ?? null };
          return acc;
        },
        {},
      );
    }

    const safeInvitations = (invitations ?? []).map((item: any) => ({
      id: item.id,
      group_id: item.group_id,
      inviter_id: item.inviter_id,
      invitee_id: item.invitee_id,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      inviter: {
        full_name: profileMap[item.inviter_id]?.full_name ?? null,
        email: canSeeSensitive ? (profileMap[item.inviter_id]?.email ?? null) : null,
      },
      invitee: {
        full_name: profileMap[item.invitee_id]?.full_name ?? null,
        email: canSeeSensitive ? (profileMap[item.invitee_id]?.email ?? null) : null,
      },
    }));

    return NextResponse.json({ invitations: safeInvitations });
  } catch (error) {
    console.error('Error in GET /api/study-groups/[id]/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
