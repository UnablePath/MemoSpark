'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaTrophy, FaShoppingCart, FaCoins, FaUsers, FaStar } from 'react-icons/fa';
import { TrendingUp } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAchievements } from '@/hooks/useAchievements';
import { useUser } from '@clerk/nextjs';
import { AchievementCollection } from '@/components/achievements/AchievementBadge';
import { AchievementNotificationSystem } from '@/components/achievements/AchievementNotificationSystem';
import { StreakWidget } from '@/components/streaks';
import { CoinWidget } from '@/components/coins';
import { CelebrationOverlay } from '@/components/stu';
import { stuCelebration } from '@/lib/stu/StuCelebration';
import { StreakTracker } from '@/lib/gamification/StreakTracker';
import { RewardShop } from './RewardShop';
import { toast } from 'sonner';
import type { LeaderboardUser, UserAchievement } from '@/types/achievements';

const GamificationHub = () => {
  const { user } = useUser();
  const { userStats, leaderboard, userAchievements, loading, reload } = useAchievements();
  const [streakTracker] = useState(() => new StreakTracker());
  const [showRewardShop, setShowRewardShop] = useState(false);

  // Calculate reward tier progression
  const calculateTierInfo = (points: number) => {
    const tiers = [
      { name: 'Bronze', threshold: 0, color: 'text-amber-600' },
      { name: 'Silver', threshold: 500, color: 'text-gray-500' },
      { name: 'Gold', threshold: 1500, color: 'text-yellow-500' },
      { name: 'Platinum', threshold: 3000, color: 'text-blue-500' },
      { name: 'Diamond', threshold: 6000, color: 'text-purple-500' },
      { name: 'Master', threshold: 10000, color: 'text-red-500' }
    ];
    
    let currentTier = tiers[0];
    let nextTier = tiers[1];
    
    for (let i = 0; i < tiers.length; i++) {
      if (points >= tiers[i].threshold) {
        currentTier = tiers[i];
        nextTier = tiers[i + 1] || tiers[i]; // Stay at max tier if reached
      } else {
        break;
      }
    }
    
    const progress = nextTier === currentTier ? 100 : 
      ((points - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100;
    
    return { currentTier, nextTier, progress: Math.min(progress, 100) };
  };
  
  const tierInfo = calculateTierInfo(userStats?.total_points || 0);

  // Demo celebration function
  const triggerDemoCelebration = () => {
    const demoAchievement = {
      id: 'demo-achievement',
      name: '🎉 Demo Achievement',
      description: 'You tested the celebration system!',
      type: 'other' as const,
      points_reward: 100,
      icon: '🎊',
      criteria: {},
      created_at: new Date().toISOString()
    };
    
    stuCelebration.achievementUnlocked(demoAchievement);
  };

  if (loading) {
    return <GamificationHubSkeleton />;
  }

  return (
    <>
      {/* Achievement Notification System */}
      <AchievementNotificationSystem 
        maxNotifications={3}
        defaultDuration={5000}
        position="top-right"
      />
      
      {/* Stu Celebration Overlay */}
      <CelebrationOverlay 
        position="center"
        enableParticles={true}
        enableConfetti={true}
        enableSound={true}
      />
      
      <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
        <header className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Gamification Hub</h1>
              <p className="text-muted-foreground">Welcome, {user?.firstName}! Track your progress and unlock rewards.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                reload();
                toast.success('Data refreshed! 🔄');
              }}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Refresh Data
            </Button>
          </div>
        </header>

        {/* User Stats & Coin Economy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatBox label="Total Points" value={userStats?.total_points || 0} />
              <StatBox label="Current Streak" value={`${userStats?.current_streak || 0} Days`} />
              <StatBox label="Leaderboard Rank" value={`#${leaderboard.find(u => u.user_id === user?.id)?.rank || 'N/A'}`} className="col-span-2"/>
            </CardContent>
          </Card>

          <CoinWidget 
            variant="detailed"
            showDailyBonus={true}
            showBonusEvents={true}
            onCoinChange={(newBalance) => {
              // Handle coin balance changes if needed
              console.log('Coin balance updated:', newBalance);
            }}
          />
        </div>

        {/* Streak Tracking System */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakWidget 
            variant="detailed"
            showActions={true}
            onViewDetails={() => {
              // TODO: Navigate to detailed streak view
              console.log('Navigate to streak details');
            }}
          />
          
          {/* Additional gamification features can be added here */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaStar className="mr-2 h-5 w-5 text-purple-500" /> 
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  // Scroll to achievements section
                  const achievementsSection = document.querySelector('[data-section="achievements"]');
                  if (achievementsSection) {
                    achievementsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <FaTrophy className="mr-2 h-4 w-4" />
                View All Achievements
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowRewardShop(true)}
              >
                <FaShoppingCart className="mr-2 h-4 w-4" />
                Visit Reward Shop
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement study groups
                  toast.info('Study Groups feature coming soon! 👥');
                }}
              >
                <FaUsers className="mr-2 h-4 w-4" />
                Join Study Groups
              </Button>
              <Button 
                variant="default" 
                className="w-full justify-start bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0"
                onClick={async () => {
                  if (!user?.id) return;
                  try {
                    const result = await streakTracker.markDailyCompletion(user.id, 1, 10);
                    if (result.success) {
                      toast.success(`Streak updated! 🔥 ${result.newStreak} days`);
                      reload(); // Refresh all data
                    }
                  } catch (error) {
                    console.error('Error updating streak:', error);
                    toast.error('Failed to update streak');
                  }
                }}
              >
                <FaStar className="mr-2 h-4 w-4" />
                🔥 Complete Today's Goal
              </Button>
              <Button 
                variant="default" 
                className="w-full justify-start bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                onClick={triggerDemoCelebration}
              >
                <FaStar className="mr-2 h-4 w-4" />
                🎉 Test Celebration
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FaUsers className="mr-2 h-5 w-5 text-blue-500" /> Leaderboard</CardTitle>
            <CardDescription>See how you stack up against other MemoSpark users!</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((leaderboardUser: LeaderboardUser) => (
                  <LeaderboardItem key={leaderboardUser.user_id} user={leaderboardUser} isCurrentUser={leaderboardUser.user_id === user?.id} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No leaderboard data available yet.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Achievement Tracking */}
        <Card data-section="achievements">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Achievements</CardTitle>
              <CardDescription>Unlock achievements by completing milestones.</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {userAchievements.length} / 50+ achievements
            </div>
          </CardHeader>
          <CardContent>
            {userAchievements.length > 0 ? (
              <AchievementCollection
                achievements={userAchievements.map(ua => ({
                  ...ua.achievements!,
                  unlocked: true,
                  earnedAt: ua.unlocked_at
                }))}
                size="md"
                variant="grid"
                showProgress={false}
                onAchievementClick={(achievement) => {
                  console.log('Achievement clicked:', achievement);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FaTrophy className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No achievements yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Complete tasks, maintain streaks, and engage with the community to unlock your first achievements!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Reward Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FaStar className="mr-2 h-5 w-5 text-purple-500" /> Reward Tiers</CardTitle>
            <CardDescription>Level up through tiers by earning points.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Tier:</span>
                <span className={`font-semibold ${tierInfo.currentTier.color}`}>
                  {tierInfo.currentTier.name}
                </span>
              </div>
              
              {tierInfo.nextTier !== tierInfo.currentTier && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Next Tier:</span>
                    <span className={`font-semibold ${tierInfo.nextTier.color}`}>
                      {tierInfo.nextTier.name}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{userStats?.total_points || 0} points</span>
                      <span>{tierInfo.nextTier.threshold} points</span>
                    </div>
                    <Progress value={tierInfo.progress} className="w-full h-3" />
                    <p className="text-xs text-center text-muted-foreground">
                      {tierInfo.nextTier.threshold - (userStats?.total_points || 0)} points to {tierInfo.nextTier.name}
                    </p>
                  </div>
                </>
              )}
              
              {tierInfo.nextTier === tierInfo.currentTier && (
                <div className="text-center py-2">
                  <span className="text-sm text-muted-foreground">🏆 Maximum tier reached!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Shop Modal */}
      {showRewardShop && (
        <RewardShop 
          variant="modal" 
          onClose={() => setShowRewardShop(false)} 
        />
      )}
    </>
  );
};

const StatBox = ({ label, value, className }: { label: string, value: string | number, className?: string }) => (
  <div className={`p-3 bg-muted/50 rounded-lg text-center ${className}`}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const LeaderboardItem = ({ user, isCurrentUser }: { user: LeaderboardUser, isCurrentUser: boolean }) => (
  <li className={`flex items-center justify-between p-3 rounded-md ${isCurrentUser ? 'bg-primary/10 border border-primary' : 'bg-muted/50'}`}>
    <div className="flex items-center">
      <span className={`font-semibold w-6 text-center ${user.rank <= 3 ? 'text-orange-500' : 'text-muted-foreground'}`}>{user.rank}.</span>
      <span className={`ml-2 font-medium ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{user.user_name}</span>
    </div>
    <span className={`font-semibold ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{user.total_points} pts</span>
  </li>
);

const AchievementItem = ({ achievement }: { achievement: UserAchievement }) => (
  <div title={`${achievement.achievements?.name || 'Achievement'} - ${achievement.achievements?.description || 'No description'}`} className="p-3 border rounded-lg flex flex-col items-center text-center border-green-500 bg-green-500/10">
    <span className="text-3xl mb-1">{achievement.achievements?.icon || '🏆'}</span>
    <p className="text-xs font-semibold text-green-700">{achievement.achievements?.name || 'Unknown Achievement'}</p>
    <span className="text-xs text-green-600">(Earned!)</span>
  </div>
);

const GamificationHubSkeleton = () => (
    <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
        <header className="mb-6">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </header>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20 col-span-2 md:col-span-1" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </CardContent>
        </Card>
    </div>
);


export default GamificationHub; 