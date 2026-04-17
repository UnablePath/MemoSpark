'use client';

import type React from 'react';
import { useState } from 'react';
import { PostComposer } from './PostComposer';
import { PostFeed } from './PostFeed';
import { RelaxationCorner } from './RelaxationCorner';
import { FloatingParticles } from './FloatingParticles';
import { CrashoutStats } from './CrashoutStats';
import { type CrashoutPostInput, createCrashoutPost } from '@/lib/supabase/crashoutApi';
import { Particles } from '@/components/ui/particles';
import { BorderBeam } from '@/components/ui/border-beam';
import { Flame, Leaf, Star, Trophy, TrendingUp, User } from 'lucide-react';

import { useAuth } from '@clerk/nextjs';

export const CrashoutRoomTab: React.FC = () => {
  const { userId, getToken } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'latest' | 'popular' | 'trending' | 'top' | 'mine'>('latest');
  const [isRelaxMode, setIsRelaxMode] = useState(false);


  const filterOptions = [
    { value: 'mine' as const, icon: User, label: 'My Posts' },
    { value: 'latest' as const, icon: Flame, label: 'Public' },
    { value: 'popular' as const, icon: Star, label: 'Popular' },
    { value: 'top' as const, icon: Trophy, label: 'Top' },
    { value: 'trending' as const, icon: TrendingUp, label: 'Trending' }
  ];

  const handlePostCreated = async (post: CrashoutPostInput) => {
    if (!userId) {
      console.error('[crashout:create-post] user not authenticated');
      return;
    }

    try {
      await createCrashoutPost(post, userId, getToken);
      // The PostFeed will automatically refresh via its hook
    } catch (error) {
      console.error('[crashout:create-post]', error);
      throw error; // Re-throw to let PostComposer handle the error
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Enhanced Particle Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={50}
        ease={80}
        color="#34D399"
        size={0.8}
        staticity={30}
      />
      <FloatingParticles />
      
      <div className="relative z-10">
        <div className="relative">
          <header className="relative overflow-hidden bg-gradient-to-r from-primary to-cyan-600 p-4 shadow-xl sm:p-6">
            <BorderBeam 
              size={200}
              duration={8}
              colorFrom="#34D399"
              colorTo="#22D3EE"
              className="from-emerald-400 via-cyan-400 to-emerald-400"
            />
            <h1 className="text-center text-xl font-bold sm:text-3xl">Crashout Room</h1>
            <p className="text-center text-sm font-medium text-primary-foreground/85 sm:text-base">
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
                        ? 'bg-card text-foreground shadow-lg'
                        : 'text-primary-foreground/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <option.icon className="mr-1 inline h-3.5 w-3.5" />
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
        className="fixed bottom-24 right-4 z-40 rounded-full border-2 border-white/20
                   bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400
                   shadow-2xl
                   flex items-center justify-center
                   transform hover:scale-110 transition-all duration-200 touch-manipulation
                   group overflow-hidden
                   w-14 h-14 sm:w-16 sm:h-16"
        aria-label={isRelaxMode ? "Exit relaxation mode" : "Enter relaxation mode"}
      >
        <BorderBeam 
          size={80}
          duration={4}
          colorFrom="#67E8F9"
          colorTo="#6EE7B7"
          delay={2}
        />
        <div className="flex flex-col items-center relative z-10">
          {isRelaxMode ? (
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
          <span className="text-[7px] sm:text-[8px] font-bold text-white leading-none">
            {isRelaxMode ? 'EXIT' : 'RELAX'}
          </span>
        </div>
        <div className="hidden sm:block absolute right-16 top-1/2 transform -translate-y-1/2 
                        bg-gray-800 text-white text-xs px-2 py-1 rounded-md
                        opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap pointer-events-none shadow-lg border border-gray-600 z-10">
          {isRelaxMode ? 'Exit relaxation' : 'Stress relief'}
        </div>
      </button>
    </div>
  );
};

export default CrashoutRoomTab; 