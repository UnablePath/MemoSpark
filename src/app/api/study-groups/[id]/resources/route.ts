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

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You must be a member to view resources' }, { status: 403 });
    }

    // Get group resources
    const { data: resources, error: resourcesError } = await supabase
      .from('study_group_resources')
      .select(`
        *,
        profiles(name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    const resourcesWithUser = resources?.map(resource => ({
      ...resource,
      user_name: resource.profiles?.name || 'Unknown'
    })) || [];

    return NextResponse.json({ resources: resourcesWithUser });
  } catch (error) {
    console.error('Error in GET /api/study-groups/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { title, description, url, file_path, resource_type } = body;

    if (!title || !resource_type) {
      return NextResponse.json({ 
        error: 'Title and resource_type are required' 
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
      return NextResponse.json({ error: 'You must be a member to add resources' }, { status: 403 });
    }

    // Create resource
    const { data: resource, error: resourceError } = await supabase
      .from('study_group_resources')
      .insert({
        group_id: groupId,
        user_id: userId,
        title,
        description,
        url,
        file_path,
        resource_type
      })
      .select(`
        *,
        profiles(name)
      `)
      .single();

    if (resourceError) {
      console.error('Error creating resource:', resourceError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    const resourceWithUser = {
      ...resource,
      user_name: resource.profiles?.name || 'Unknown'
    };

    return NextResponse.json({ resource: resourceWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/study-groups/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
