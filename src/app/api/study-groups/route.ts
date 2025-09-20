import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all', 'my-groups', 'discover'
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Add timeout wrapper for database queries
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database query timed out'));
      }, 10000); // 10 second timeout
    });

    // Use Supabase to get study groups
    let groups;
    
    if (type === 'my-groups') {
      // Get user's groups using the existing RPC function
      const { data, error } = await Promise.race([
        supabase.rpc('get_user_study_groups', { p_user_id: userId }),
        timeoutPromise
      ]);
    
      if (error) {
        console.error('Error fetching user groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
      }
      
      groups = data || [];
    } else {
      // Simplified query to avoid complex joins that cause timeouts
      let query_builder = supabase
        .from('study_groups')
        .select(`
          id,
          name,
          description,
          created_at,
          created_by,
          is_public,
          max_members
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Add search filter
      if (query) {
        query_builder = query_builder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      // Add category filter (if we had categories)
      if (categoryId) {
        // TODO: Implement category filtering when categories are added
      }

      const { data, error } = await Promise.race([
        query_builder,
        timeoutPromise
      ]);
      
      if (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
      }

      // Get member counts separately to avoid complex joins
      const groupIds = data?.map(group => group.id) || [];
      let memberCounts = {};
      
      if (groupIds.length > 0) {
        const { data: memberData } = await supabase
          .from('study_group_members')
          .select('group_id')
          .in('group_id', groupIds);
        
        memberCounts = memberData?.reduce((acc, member) => {
          acc[member.group_id] = (acc[member.group_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
      }

      groups = data?.map(group => ({
        ...group,
        member_count: memberCounts[group.id] || 0,
        creator_name: 'Unknown' // Simplified to avoid join
      })) || [];
    }

    return NextResponse.json({ groups, total: groups.length });
  } catch (error) {
    console.error('Error in GET /api/study-groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { name, description, privacy_level = 'public' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create the study group
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .insert({
        name,
        description,
        created_by: userId,
        metadata: { privacy_level }
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add creator as first member with admin role
    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Don't fail the request, but log the error
    }

    // Create a conversation for the group chat
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        conversation_type: 'group',
        name: `${name} Chat`,
        created_by: userId,
        metadata: { group_id: group.id }
      })
      .select()
      .single();

    if (!conversationError && conversation) {
      // Update group with conversation_id
      await supabase
        .from('study_groups')
        .update({ conversation_id: conversation.id })
        .eq('id', group.id);

      // Add creator as conversation participant
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: userId
        });
    }

    return NextResponse.json({ 
      group: {
        ...group,
        conversation_id: conversation?.id
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/study-groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
