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
  tags?: string[];
  attachment_urls?: string[];
  reaction_counts: {
    heart: number;
    wow: number;
    hug: number;
    comment: number;
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

export const getCrashoutPosts = async (filter: 'latest' | 'popular' | 'private' = 'latest', getToken?: () => Promise<string | null>) => {
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
    // Sort by total reactions for popularity
    query = query.order('reaction_counts', { ascending: false });
  }
  
  // Always order by created_at for consistency
  if (filter !== 'popular') {
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
  
  const { data, error } = await supabase
    .from('crashout_post_reactions')
    .upsert([{ post_id: postId, user_id: userId, reaction_type: reactionType }])
    .select()
    .single();
  
  if (error) throw error;
  return data as PostReaction;
};

export const removeReaction = async (postId: string, reactionType: 'heart' | 'wow' | 'hug', userId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('crashout_post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType);
  
  if (error) throw error;
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
  return data as PostComment;
};

export const getCommentsForPost = async (postId: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as PostComment[];
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