'use client';

import React from 'react';
import { PostCard } from './PostCard';
import { CrashoutPost } from '@/lib/supabase/crashoutApi';

interface PostFeedProps {
  posts: CrashoutPost[];
  moodStyles?: Record<string, { bg: string; border: string; emoji: string; label: string }>; // Keep for compatibility
  onReaction: (postId: string, emoji: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostFeed: React.FC<PostFeedProps> = ({ posts, moodStyles, onReaction, onDelete }) => {
  return (
    <div className="space-y-6">
      {posts && posts.length > 0 ? (
        posts.map((post: CrashoutPost) => (
          <PostCard
            key={post.id}
            post={post}
            moodStyles={moodStyles}
            onReaction={onReaction}
            onDelete={onDelete}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">The void is quiet...</p>
          <p className="text-gray-500">Be the first to scream into it.</p>
        </div>
      )}
    </div>
  );
}; 