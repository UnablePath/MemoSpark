'use client';

import React, { useState } from 'react';
import { PostComposer } from './PostComposer';
import { PostFeed } from './PostFeed';
import { RelaxationCorner } from './RelaxationCorner';
import { FloatingParticles } from './FloatingParticles';
import { useCrashoutPosts } from '@/hooks/useCrashoutPosts';
import { Loader2 } from 'lucide-react';

export function CrashoutRoomTab() {
  const { posts, loading, error, addPost } = useCrashoutPosts();
  const [isRelaxMode, setIsRelaxMode] = useState(false);

  const moodStyles = {
    stressed: { bg: 'bg-red-500/80', border: 'border-red-400', emoji: '😤', label: 'STRESSED AF' },
    overwhelmed: { bg: 'bg-purple-500/80', border: 'border-purple-400', emoji: '😵‍💫', label: 'OVERWHELMED' },
    frustrated: { bg: 'bg-orange-500/80', border: 'border-orange-400', emoji: '🤬', label: 'FRUSTRATED' },
    anxious: { bg: 'bg-yellow-500/80', border: 'border-yellow-400', emoji: '😬', label: 'ANXIOUS' },
    sad: { bg: 'bg-blue-500/80', border: 'border-blue-400', emoji: '😢', label: 'SAD' },
  };

  const handlePost = async (post: Omit<any, 'id' | 'created_at'>) => {
    await addPost({ ...post });
  };

  const handleReaction = (postId: string, emoji: string) => {
    console.log(`Reacted with ${emoji} on post ${postId}`);
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      <FloatingParticles />
      <div className="relative z-10">
        <header className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 shadow-xl">
          <h1 className="text-3xl font-bold text-center">CRASHOUT ROOM 🔥</h1>
          <p className="text-center text-purple-100 font-medium">Let it all out</p>
        </header>

        <div className="p-4">
          {isRelaxMode ? (
            <RelaxationCorner onExit={() => setIsRelaxMode(false)} />
          ) : (
            <div className="space-y-6">
              <PostComposer onPost={handlePost} />
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">
                  <p>Error: {error}</p>
                </div>
              ) : (
                <PostFeed posts={posts} moodStyles={moodStyles} onReaction={handleReaction} />
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsRelaxMode(!isRelaxMode)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-400
                   rounded-full shadow-xl flex items-center justify-center text-2xl
                   transform hover:scale-110 transition-all duration-200 z-50"
        aria-label={isRelaxMode ? "Exit relaxation mode" : "Enter relaxation mode"}
      >
        {isRelaxMode ? '🧘' : '🔥'}
      </button>
    </div>
  );
}

export default CrashoutRoomTab; 