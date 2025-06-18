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

export const getCrashoutPosts = async (filter: 'latest' | 'popular' | 'top' | 'trending' | 'private' = 'latest', getToken?: () => Promise<string | null>) => {
  const client = getToken ? createAuthenticatedSupabaseClient(getToken) : await getAuthenticatedClient();
  
  if (!client) {
    throw new Error('Supabase client not initialized');
  }
  
  let query = client
    .from('crashout_posts')
    .select('*');

  // Apply filters
  if (filter === 'private') {
    query = query.eq('is_private', true);
  } else if (filter === 'latest') {
    query = query.eq('is_private', false);
  } else if (filter === 'popular') {
    query = query.eq('is_private', false);
    // Sort by total reactions for popularity (assuming we have reaction counts)
    query = query.order('created_at', { ascending: false }); // Fallback to latest for now
  } else if (filter === 'top') {
    query = query.eq('is_private', false);
    // Get top posts from the last 7 days sorted by reactions
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', sevenDaysAgo);
    query = query.order('created_at', { ascending: false }); // Fallback to latest for now
  } else if (filter === 'trending') {
    query = query.eq('is_private', false);
    // Get trending posts from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', oneDayAgo);
    query = query.order('created_at', { ascending: false });
  }
  
  // Default ordering for filters that don't specify custom ordering
  if (!['popular', 'top', 'trending'].includes(filter)) {
    query = query.order('created_at', { ascending: false });
  }
  
  const { data, error } = await query.limit(50);
  
  if (error) throw error;
  return data as CrashoutPost[];
};

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

export const addReaction = async (postId: string, reactionType: 'heart' | 'wow' | 'hug', userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase.rpc('handle_reaction', {
    post_id_param: postId,
    user_id_param: userId,
    reaction_type_param: reactionType
  });
  
  if (error) throw error;
};

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

export const removeReaction = async (postId: string, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase.rpc('remove_reaction', {
    post_id_param: postId,
    user_id_param: userId
  });
  
  if (error) throw error;
};

export const getUserReaction = async (postId: string, userId: string): Promise<'heart' | 'wow' | 'hug' | null> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data?.reaction_type || null;
};

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
  
    if (updateError) console.error('Error updating comment count:', updateError);
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