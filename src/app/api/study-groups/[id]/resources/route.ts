import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';

const ALLOWED_RESOURCE_TYPES = new Set(['link', 'file', 'note', 'past_question', 'document']);

function isAdminLike(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
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

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to view resources' }, { status: 403 });
    }

    // Get group resources
    const { data: resources, error: resourcesError } = await supabase
      .from('study_group_resources')
      .select(`
        *,
        profiles(full_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    const resourcesWithUser = resources?.map(resource => ({
      ...resource,
      user_name: resource.profiles?.full_name || 'Unknown'
    })) || [];

    return NextResponse.json({ resources: resourcesWithUser });
  } catch (error) {
    console.error('Error in GET /api/study-groups/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    const { title, description, url, file_path, resource_type } = body;

    if (!title || typeof title !== 'string' || !title.trim() || !resource_type) {
      return NextResponse.json({ 
        error: 'Title and resource_type are required' 
      }, { status: 400 });
    }
    if (!ALLOWED_RESOURCE_TYPES.has(String(resource_type))) {
      return NextResponse.json({ error: 'Invalid resource_type' }, { status: 400 });
    }
    if (url) {
      try {
        const parsed = new URL(String(url));
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: 'Invalid url protocol' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
      }
    }
    if (!url && !file_path && !description) {
      return NextResponse.json(
        { error: 'Provide at least one of url, file_path, or description' },
        { status: 400 },
      );
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to add resources' }, { status: 403 });
    }

    // Members can add resources; all writes are still membership-gated.
    const { data: resource, error: resourceError } = await supabase
      .from('study_group_resources')
      .insert({
        group_id: groupId,
        user_id: userId,
        title: title.trim(),
        description,
        url,
        file_path,
        resource_type
      })
      .select(`
        *,
        profiles(full_name)
      `)
      .single();

    if (resourceError) {
      console.error('Error creating resource:', resourceError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    const resourceWithUser = {
      ...resource,
      user_name: resource.profiles?.full_name || 'Unknown'
    };

    return NextResponse.json({ resource: resourceWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/resources:', error);
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

    const resourceId = new URL(request.url).searchParams.get('resourceId');
    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 });
    }

    const groupId = params.id;
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: resource } = await supabase
      .from('study_group_resources')
      .select('id, user_id')
      .eq('id', resourceId)
      .eq('group_id', groupId)
      .maybeSingle();
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    if (!isAdminLike(membership.role) && resource.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('study_group_resources')
      .delete()
      .eq('id', resourceId)
      .eq('group_id', groupId);
    if (error) {
      console.error('Error deleting resource:', error);
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/study-groups/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
