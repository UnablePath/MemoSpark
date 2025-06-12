'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCrashoutPosts, createCrashoutPost } from '@/lib/supabase/crashoutApi';

export const useCrashoutPosts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPosts = await getCrashoutPosts();
      setPosts(fetchedPosts);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const addPost = async (post: any) => {
    try {
      const newPost = await createCrashoutPost(post);
      if (newPost) {
        setPosts(prevPosts => [newPost, ...prevPosts]);
      }
      return newPost;
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
      return null;
    }
  };

  return { posts, loading, error, addPost, refetch: fetchPosts };
}; 