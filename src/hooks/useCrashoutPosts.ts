'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCrashoutPosts, createCrashoutPost, deletePost, CrashoutPost, CrashoutPostInput } from '@/lib/supabase/crashoutApi';
import { useAuth } from '@clerk/nextjs';

export const useCrashoutPosts = (filter: 'latest' | 'popular' | 'private' = 'latest') => {
  const [posts, setPosts] = useState<CrashoutPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, getToken } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching crashout posts with filter:', filter);
      const fetchedPosts = await getCrashoutPosts(filter, getToken);
      console.log('Fetched posts:', fetchedPosts);
      setPosts(fetchedPosts);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [filter, getToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

  return { posts, loading, error, addPost, deletePost: deletePostById, refetch: fetchPosts };
}; 