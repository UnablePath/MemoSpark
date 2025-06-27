import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

export interface CrashoutPost {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  mood_emoji?: string;
  mood_type?: 'stressed' | 'overwhelmed' | 'frustrated' | 'anxious' | 'sad' | 'angry' | 'exhausted' | 'excited' | 'calm';
  is_private: boolean;
  is_anonymous?: boolean;
  tags?: string[];
  attachment_urls?: string[];
  reaction_counts: {
    heart?: number;
    wow?: number;
    hug?: number;
    support?: number;
    mind_blown?: number;
    comment?: number;
    upvotes?: number;
    downvotes?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CrashoutPostInput {
  content: string;
  title?: string;
  mood_emoji?: string;
  mood_type?: string;
  is_private?: boolean;
  is_anonymous?: boolean;
  tags?: string[];
  attachment_urls?: string[];
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: 'heart' | 'wow' | 'hug';
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Helper to get authenticated Supabase client with Clerk token
const getAuthenticatedClient = async () => {
  // Simply return the default supabase client when no token is provided
  // For authenticated operations, pass the getToken function explicitly
  return supabase;
};

interface GetPostsOptions {
  filter: 'latest' | 'popular' | 'trending' | 'top' | 'mine';
  includePrivate?: boolean;
  page?: number;
  limit?: number;
  lastPostDate?: string; // For cursor-based pagination
  userId?: string;
}

export async function getCrashoutPosts(options: GetPostsOptions = { filter: 'latest' }): Promise<CrashoutPost[]> {
  const {
    filter = 'latest',
    includePrivate = false,
    page = 1,
    limit = 5, // Default to 5 posts
    lastPostDate,
    userId
  } = options;

  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('crashout_posts')
    .select(`
      id,
      user_id,
      content,
      title,
      mood_emoji,
      mood_type,
      is_anonymous,
      is_private,
      upvotes,
      downvotes,
      reaction_counts,
      created_at,
      updated_at
    `);

  // Handle 'mine' filter separately for clarity
  if (filter === 'mine') {
    if (userId) {
      query = query.eq('user_id', userId);
      // For 'mine' filter, include both private and public posts
      // No additional filtering needed since user should see all their own posts
    } else {
      // If no user is logged in, the 'mine' filter should return nothing.
      // RLS will enforce this, but an explicit check is safer.
      return [];
    }
  } else {
    // For all other filters, fetch public posts OR the user's own posts
    if (userId) {
      query = query.or(`is_private.eq.false,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_private', false);
    }
  }

  // If this is the first load (no lastPostDate), get today's posts first
  if (!lastPostDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    query = query.gte('created_at', todayStr);
  } else {
    // For subsequent loads, get posts older than the last post date
    query = query.lt('created_at', lastPostDate);
  }

  // Apply sorting based on filter
  switch (filter) {
    case 'latest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'popular':
      query = query.order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });
      break;
    case 'trending':
      // Trending: posts with high engagement in last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', last24Hours)
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });
      break;
    case 'top':
      // Top: highest upvoted posts overall
      query = query.order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });
      break;
  }

  // Apply limit
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching crashout posts:', error);
    throw error;
  }

  return data || [];
}

// New function to check if there are more posts available
export async function hasMorePosts(lastPostDate: string, filter: 'latest' | 'popular' | 'trending' | 'top' | 'mine' = 'latest'): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('crashout_posts')
    .select('id', { count: 'exact', head: true })
    .eq('is_private', false)
    .lt('created_at', lastPostDate);

  // Apply same filtering logic as getCrashoutPosts
  switch (filter) {
    case 'trending':
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', last24Hours);
      break;
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error checking for more posts:', error);
    return false;
  }

  return (count || 0) > 0;
}

export const createCrashoutPost = async (post: CrashoutPostInput, userId: string, getToken?: () => Promise<string | null>) => {
  const client = getToken ? createAuthenticatedSupabaseClient(getToken) : await getAuthenticatedClient();
  
  if (!client) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await client
    .from('crashout_posts')
    .insert([{ ...post, user_id: userId }])
    .select()
    .single();
  
  if (error) throw error;
  return data as CrashoutPost;
};

export async function addReaction(
  postId: string, 
  reactionType: 'heart' | 'support' | 'mind_blown',
  userId: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { error } = await supabase.rpc('handle_reaction', {
    post_id_param: postId,
    user_id_param: userId,
    reaction_type_param: reactionType
  });

  if (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }

  // Trigger achievement for adding a reaction
  try {
    await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'social_action',
        metadata: { socialAction: 'crashout_reaction_added' }
      }),
    });
  } catch (e) {
    console.error('Failed to trigger crashout_reaction_added achievement', e);
  }
}

export const addVote = async (postId: string, voteType: 'up' | 'down', userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase.rpc('vote_on_post', {
    post_id_param: postId,
    user_id_param: userId,
    vote_type_param: voteType
  });
  
  if (error) throw error;
};

export const removeVote = async (postId: string, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase.rpc('remove_vote_from_post', {
    post_id_param: postId,
    user_id_param: userId
  });
  
  if (error) throw error;
};

export const getUserVote = async (postId: string, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_votes')
    .select('vote_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data?.vote_type || null;
};

export const getCommentsForPost = async (postId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export async function removeReaction(postId: string, userId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { error } = await supabase.rpc('remove_reaction', {
    post_id_param: postId,
    user_id_param: userId
  });

  if (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

export async function getUserReaction(postId: string, userId: string): Promise<'heart' | 'support' | 'mind_blown' | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.rpc('get_user_reaction', {
    post_id_param: postId,
    user_id_param: userId
  });

  if (error) {
    console.error('Error getting user reaction:', error);
    return null;
  }

  // Type guard to ensure we only return valid reaction types
  if (data && ['heart', 'support', 'mind_blown'].includes(data)) {
    return data as 'heart' | 'support' | 'mind_blown';
  }

  return null;
}

export const getUserReactions = async (userId: string, postIds: string[]) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_reactions')
    .select('post_id, reaction_type')
    .eq('user_id', userId)
    .in('post_id', postIds);
  
  if (error) throw error;
  return data;
};

export const addComment = async (postId: string, content: string, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_comments')
    .insert([{ post_id: postId, user_id: userId, content }])
    .select()
    .single();
  
  if (error) throw error;
  
  // Update comment count in reaction_counts using a simpler approach
  const { data: commentCount, error: countError } = await supabase
    .from('crashout_post_comments')
    .select('id', { count: 'exact' })
    .eq('post_id', postId)
    .eq('is_deleted', false);
  
  if (!countError && commentCount) {
    const { error: updateError } = await supabase
      .from('crashout_posts')
      .update({
        reaction_counts: {
          comment: commentCount.length
        }
      })
      .eq('id', postId);
  
    if (updateError) {
      console.error('Error updating comment count:', updateError.message);
    }
  }
  
  return data as PostComment;
};

export const deletePost = async (postId: string, userId: string, getToken?: () => Promise<string | null>) => {
  const client = getToken ? createAuthenticatedSupabaseClient(getToken) : await getAuthenticatedClient();
  
  if (!client) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await client
    .from('crashout_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);
  
  if (error) throw error;
};

export const updatePost = async (postId: string, updates: Partial<CrashoutPostInput>, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_posts')
    .update(updates)
    .eq('id', postId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data as CrashoutPost;
};

// Get daily crashout stats
export const getDailyCrashoutStats = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('crashout_posts')
    .select('id, mood_type')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)
    .eq('is_private', false);
  
  if (error) throw error;
  
  return {
    total: data.length,
    by_mood: data.reduce((acc, post) => {
      const mood = post.mood_type || 'unknown';
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}; 