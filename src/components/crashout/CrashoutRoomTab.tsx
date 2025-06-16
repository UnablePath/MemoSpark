'use client';

import React, { useState } from 'react';
import { PostComposer } from './PostComposer';
import { PostFeed } from './PostFeed';
import { RelaxationCorner } from './RelaxationCorner';
import { FloatingParticles } from './FloatingParticles';
import { CrashoutStats } from './CrashoutStats';
import { useCrashoutPosts } from '@/hooks/useCrashoutPosts';
import { CrashoutPostInput } from '@/lib/supabase/crashoutApi';
import { Loader2 } from 'lucide-react';

export function CrashoutRoomTab() {
  const [filter, setFilter] = useState<'latest' | 'popular' | 'private'>('latest');
  const { posts, loading, error, addPost, deletePost } = useCrashoutPosts(filter);
  const [isRelaxMode, setIsRelaxMode] = useState(false);

  const moodStyles = {
    stressed: { bg: 'bg-red-500/80', border: 'border-red-400', emoji: '😤', label: 'STRESSED AF' },
    overwhelmed: { bg: 'bg-purple-500/80', border: 'border-purple-400', emoji: '😵‍💫', label: 'OVERWHELMED' },
    frustrated: { bg: 'bg-orange-500/80', border: 'border-orange-400', emoji: '🤬', label: 'FRUSTRATED' },
    anxious: { bg: 'bg-yellow-500/80', border: 'border-yellow-400', emoji: '😬', label: 'ANXIOUS' },
    sad: { bg: 'bg-blue-500/80', border: 'border-blue-400', emoji: '😢', label: 'SAD' },
  };

  const handlePost = async (post: CrashoutPostInput) => {
    await addPost(post);
  };

  const handleReaction = (postId: string, emoji: string) => {
    console.log(`Reacted with ${emoji} on post ${postId}`);
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      <FloatingParticles />
      <div className="relative z-10">
        <header className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 shadow-xl">
          <h1 className="text-xl sm:text-3xl font-bold text-center">CRASHOUT ROOM 🔥</h1>
          <p className="text-center text-purple-100 font-medium text-sm sm:text-base">Crashout here, not in their DMs.</p>
          
          {/* Filter Tabs */}
          <div className="flex justify-center mt-4">
            <div className="flex bg-black/20 rounded-full p-1 overflow-x-auto max-w-full">
              {(['latest', 'popular', 'private'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    filter === filterOption
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {filterOption === 'latest' ? 'Latest' : 
                   filterOption === 'popular' ? 'Popular' : 
                   'Private'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-2 sm:p-4">
          {isRelaxMode ? (
            <RelaxationCorner onExit={() => setIsRelaxMode(false)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
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
                <PostFeed posts={posts} moodStyles={moodStyles} onReaction={handleReaction} onDelete={handleDelete} />
              )}
              </div>
              
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <CrashoutStats />
                {/* Add more sidebar widgets here later */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Relaxation Button - Above Stu Icon */}
      <button
        onClick={() => setIsRelaxMode(!isRelaxMode)}
        className="fixed bottom-32 right-4 
                   bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400
                   rounded-full shadow-2xl border-2 border-white/20
                   flex items-center justify-center
                   transform hover:scale-110 transition-all duration-200 touch-manipulation
                   group z-[9999]
                   w-14 h-14 sm:w-16 sm:h-16"
        aria-label={isRelaxMode ? "Exit relaxation mode" : "Enter relaxation mode"}
      >
        <div className="flex flex-col items-center">
          <span className="text-lg sm:text-xl">{isRelaxMode ? '🧘' : '🔥'}</span>
          <span className="text-[7px] sm:text-[8px] font-bold text-white leading-none">
            {isRelaxMode ? 'EXIT' : 'RELAX'}
          </span>
        </div>
        <div className="hidden sm:block absolute right-16 top-1/2 transform -translate-y-1/2 
                        bg-gray-800 text-white text-xs px-2 py-1 rounded-md
                        opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap pointer-events-none shadow-lg border border-gray-600">
          {isRelaxMode ? '🧘 Exit Relaxation' : '🔥 Stress Relief'}
        </div>
      </button>
    </div>
  );
}

export default CrashoutRoomTab; 