'use client';

import React from 'react';
import { PostCard } from './PostCard';

export const PostFeed = ({ posts, moodStyles, onReaction }: any) => {
  return (
    <div className="space-y-6">
      {posts && posts.length > 0 ? (
        posts.map((post: any) => (
          <PostCard
            key={post.id}
            post={post}
            moodStyles={moodStyles}
            onReaction={onReaction}
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