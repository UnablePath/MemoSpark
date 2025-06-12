'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaTrophy, FaShoppingCart, FaCoins, FaUsers, FaStar } from 'react-icons/fa';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAchievements } from '@/hooks/useAchievements';
import { useUser } from '@clerk/nextjs';
import type { LeaderboardUser, UserAchievement } from '@/types/achievements';

const GamificationHub = () => {
  const { user } = useUser();
  const { userStats, leaderboard, userAchievements, loading } = useAchievements();

  // Placeholder for shop items and reward tiers logic
  const mockShopItems: any[] = [];
  const nextTier = "Bronze";
  const progressToNextTier = (userStats?.total_points || 0) / 2000 * 100;

  if (loading) {
    return <GamificationHubSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 h-full overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gamification Hub</h1>
        <p className="text-muted-foreground">Welcome, {user?.firstName}! Track your progress and unlock rewards.</p>
      </header>

      {/* User Stats & Coin Economy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaCoins className="mr-2 h-5 w-5 text-yellow-500" /> Your Stash</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox label="Total Points" value={userStats?.total_points || 0} />
          <StatBox label="Current Streak" value={`${userStats?.current_streak || 0} Days`} />
          <StatBox label="Leaderboard Rank" value={`#${leaderboard.find(u => u.user_id === user?.id)?.rank || 'N/A'}`} className="col-span-2 md:col-span-1"/>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Achievements</CardTitle>
          <CardDescription>Unlock achievements by completing milestones.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {userAchievements.length > 0 ? (
              userAchievements.slice(0, 10).map((ach: UserAchievement) => (
                <AchievementItem key={ach.id} achievement={ach} />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4 col-span-full">No achievements unlocked yet. Keep studying!</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Reward Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FaStar className="mr-2 h-5 w-5 text-purple-500" /> Reward Tiers</CardTitle>
          <CardDescription>Level up through tiers by earning points.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">Next Tier: <span className="font-semibold text-purple-500">{nextTier}</span> ({userStats?.total_points || 0} / 2000 points)</p>
          <Progress value={progressToNextTier} className="w-full h-3" />
        </CardContent>
      </Card>
    </div>
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