'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCrashoutPosts, createCrashoutPost, deletePost, CrashoutPost, CrashoutPostInput, hasMorePosts } from '@/lib/supabase/crashoutApi';
import { useAuth } from '@clerk/nextjs';

interface UseCrashoutPostsOptions {
  filter: 'latest' | 'popular' | 'trending' | 'top' | 'mine';
  includePrivate?: boolean;
  initialLimit?: number;
}

interface UseCrashoutPostsReturn {
  posts: CrashoutPost[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoadingMore: boolean;
  addPost: (post: CrashoutPostInput) => Promise<CrashoutPost | null>;
  deletePost: (postId: string) => Promise<boolean>;
}

export function useCrashoutPosts({
  filter = 'latest',
  includePrivate = false,
  initialLimit = 5
}: UseCrashoutPostsOptions): UseCrashoutPostsReturn {
  const { userId, getToken } = useAuth();
  
  const [posts, setPosts] = useState<CrashoutPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostDate, setLastPostDate] = useState<string | null>(null);

  const loadPosts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLastPostDate(null);
      } else {
        setIsLoadingMore(true);
      }
      
      setError(null);

      const options = {
        filter,
        includePrivate,
        limit: initialLimit,
        lastPostDate: reset ? undefined : lastPostDate || undefined,
        userId: userId || undefined
      };

      const newPosts = await getCrashoutPosts(options);

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      // Update pagination state
      if (newPosts.length > 0) {
        const oldestPost = newPosts[newPosts.length - 1];
        setLastPostDate(oldestPost.created_at);
        
        // Check if there are more posts available
        const moreAvailable = await hasMorePosts(oldestPost.created_at, filter);
        setHasMore(moreAvailable);
      } else {
        setHasMore(false);
      }

    } catch (err) {
      console.error('Error loading posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [filter, includePrivate, initialLimit, lastPostDate, userId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await loadPosts(false);
  }, [hasMore, isLoadingMore, loadPosts]);

  const refresh = useCallback(async () => {
    await loadPosts(true);
  }, [loadPosts]);

  // Initial load and when dependencies change
  useEffect(() => {
    loadPosts(true);
  }, [filter, includePrivate, userId]);

  const addPost = async (post: CrashoutPostInput) => {
    if (!userId) {
      setError('User not authenticated');
      return null;
    }
    
    try {
      console.log('Creating crashout post:', post, 'for user:', userId);
      const newPost = await createCrashoutPost(post, userId, getToken);
      console.log('Created post:', newPost);
      if (newPost) {
        setPosts(prevPosts => [newPost, ...prevPosts]);
      }
      return newPost;
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
      return null;
    }
  };

  const deletePostById = async (postId: string) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }
    
    try {
      console.log('Deleting crashout post:', postId, 'for user:', userId);
      await deletePost(postId, userId, getToken);
      console.log('Post deleted successfully');
      // Remove from local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      return true;
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setError(err.message || 'Failed to delete post');
      return false;
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isLoadingMore,
    addPost,
    deletePost: deletePostById
  };
} 