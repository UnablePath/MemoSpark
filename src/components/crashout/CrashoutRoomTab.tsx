'use client';

import React, { useState } from 'react';
import { PostComposer } from './PostComposer';
import { PostFeed } from './PostFeed';
import { RelaxationCorner } from './RelaxationCorner';
import { FloatingParticles } from './FloatingParticles';
import { CrashoutStats } from './CrashoutStats';
import { CrashoutPostInput, createCrashoutPost } from '@/lib/supabase/crashoutApi';
import { Particles } from '@/components/ui/particles';
import { BorderBeam } from '@/components/ui/border-beam';

import { useAuth } from '@clerk/nextjs';

export const CrashoutRoomTab: React.FC = () => {
  const { userId, getToken } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'latest' | 'popular' | 'trending' | 'top' | 'mine'>('latest');
  const [isRelaxMode, setIsRelaxMode] = useState(false);


  const filterOptions = [
    { value: 'mine' as const, emoji: '😎', label: 'My Posts' },
    { value: 'latest' as const, emoji: '🔥', label: 'Public' },
    { value: 'popular' as const, emoji: '⭐', label: 'Popular' },
    { value: 'top' as const, emoji: '🏆', label: 'Top' },
    { value: 'trending' as const, emoji: '📈', label: 'Trending' }
  ];

  const handlePostCreated = async (post: CrashoutPostInput) => {
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    try {
      await createCrashoutPost(post, userId, getToken);
      // The PostFeed will automatically refresh via its hook
    } catch (error) {
      console.error('Error creating post:', error);
      throw error; // Re-throw to let PostComposer handle the error
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Enhanced Particle Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={50}
        ease={80}
        color="#8B5CF6"
        size={0.8}
        staticity={30}
      />
      <FloatingParticles />
      
      <div className="relative z-10">
        <div className="relative">
          <header className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 shadow-xl relative overflow-hidden">
            <BorderBeam 
              size={200}
              duration={8}
              colorFrom="#A855F7"
              colorTo="#3B82F6"
              className="from-purple-400 via-blue-400 to-purple-400"
            />
            <h1 className="text-xl sm:text-3xl font-bold text-center">CRASHOUT ROOM 🔥</h1>
            <p className="text-center text-purple-100 font-medium text-sm sm:text-base">
              Crashout here, not in their DMs.
            </p>
            
            {/* Filter Tabs */}
            <div className="flex justify-center mt-4 px-2">
              <div className="flex bg-black/20 rounded-full p-1 overflow-x-auto max-w-full scrollbar-hide">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setActiveFilter(option.value)}
                    className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      activeFilter === option.value
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'text-purple-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-1">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>


          </header>
        </div>

        <div className="p-2 sm:p-4">
          {isRelaxMode ? (
            <RelaxationCorner onExit={() => setIsRelaxMode(false)} />
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Sidebar - appears first on mobile */}
              <div className="order-first lg:order-last lg:col-span-1 space-y-4">
                <CrashoutStats />
              </div>

              {/* Main Content */}
              <div className="order-last lg:order-first lg:col-span-3 space-y-4 sm:space-y-6">
                <PostComposer onPost={handlePostCreated} />
                
                {/* Post Feed with infinite scroll */}
                <PostFeed 
                  filter={activeFilter}
                  includePrivate={activeFilter === 'mine'}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Relaxation Button - Fixed position above all content */}
      <button
        onClick={() => setIsRelaxMode(!isRelaxMode)}
        className="fixed bottom-24 right-4 sm:bottom-32 sm:right-6 z-[99999] 
                   bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400
                   rounded-full shadow-2xl border-2 border-white/20
                   flex items-center justify-center
                   transform hover:scale-110 transition-all duration-200 touch-manipulation
                   group overflow-hidden
                   w-14 h-14 sm:w-16 sm:h-16"
        style={{ zIndex: 99999 }}
        aria-label={isRelaxMode ? "Exit relaxation mode" : "Enter relaxation mode"}
      >
        <BorderBeam 
          size={80}
          duration={4}
          colorFrom="#60A5FA"
          colorTo="#A855F7"
          delay={2}
        />
        <div className="flex flex-col items-center relative z-10">
          <span className="text-lg sm:text-xl">{isRelaxMode ? '🧘' : '🔥'}</span>
          <span className="text-[7px] sm:text-[8px] font-bold text-white leading-none">
            {isRelaxMode ? 'EXIT' : 'RELAX'}
          </span>
        </div>
        <div className="hidden sm:block absolute right-16 top-1/2 transform -translate-y-1/2 
                        bg-gray-800 text-white text-xs px-2 py-1 rounded-md
                        opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap pointer-events-none shadow-lg border border-gray-600 z-10">
          {isRelaxMode ? '🧘 Exit Relaxation' : '🔥 Stress Relief'}
        </div>
      </button>
    </div>
  );
};

export default CrashoutRoomTab; 