'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaTrophy, FaShoppingCart, FaCoins, FaUsers, FaStar, FaCalendarAlt } from 'react-icons/fa';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchAchievements, useInvalidateAchievementQueries } from '@/hooks/useAchievementQueries';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';
import { useUser } from '@clerk/nextjs';
import { AchievementCollection } from '@/components/achievements/AchievementBadge';
import { AchievementNotificationSystem } from '@/components/achievements/AchievementNotificationSystem';
import { StreakWidget } from '@/components/streaks';
import { StreakLeaderboard } from '@/components/streaks/StreakLeaderboard';
import { CoinWidget } from '@/components/coins';
import { CelebrationOverlay } from '@/components/stu';
import { stuCelebration } from '@/lib/stu/StuCelebration';
import { StreakTracker } from '@/lib/gamification/StreakTracker';
import { RewardShop } from './RewardShop';
import { toast } from 'sonner';
import type { LeaderboardUser, UserAchievement } from '@/types/achievements';

const GamificationHub = () => {
  const { user } = useUser();
  const { data: achievementsData, isLoading: loading, error } = useFetchAchievements();
  const { invalidateAll: reloadAchievements } = useInvalidateAchievementQueries();
  const { 
    triggerAchievement, 
    triggerTaskCompleted, 
    triggerStreakIncreased, 
    triggerBubbleGamePlayed,
    triggerTutorialStep 
  } = useDebouncedAchievementTrigger();

  // Extract data from the consolidated response
  const achievements = achievementsData?.achievements || [];
  const stats = achievementsData?.stats || { total: 0, unlocked: 0, remaining: 0 };
  const balanceData = achievementsData?.balance;
  const coinBalance = balanceData?.balance || 0;
  const themesData = achievementsData?.themes;
  
  // Process achievements into the format expected by existing code
  const userAchievements = achievements.filter(a => a.unlocked).map(achievement => ({
    id: achievement.id,
    user_id: user?.id || '',
    achievement_id: achievement.id,
    unlocked_at: achievement.unlockedAt || new Date().toISOString(),
    progress: achievement.userProgress || {},
    achievements: achievement
  }));
  const allAchievements = achievements;
  
  // Mock userStats for compatibility (can be improved with additional API data)
  const userStats = {
    user_id: user?.id || '',
    total_points: achievements.reduce((sum, a) => sum + (a.unlocked ? a.points_reward : 0), 0),
    level: 1,
    current_streak: 0,
    longest_streak: 0,
    tasks_completed: 0,
    achievements_earned: userAchievements.length,
    coin_balance: coinBalance,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Mock leaderboard for now (can be enhanced later)
  const leaderboard: any[] = [];
  
  // Create reload function that invalidates queries
  const reload = () => {
    reloadAchievements();
  };
  const [streakTracker] = useState(() => new StreakTracker());
  const [showRewardShop, setShowRewardShop] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

  // Trigger achievement on mount
  useEffect(() => {
    triggerAchievement('gamification_opened');
  }, [triggerAchievement]);

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

        {/* User Stats & Real Coin Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatBox label="Total Points" value={userStats?.total_points || 0} />
              <StatBox label="Current Streak" value={`${userStats?.current_streak || 0} Days`} />
              <StatBox label="Coin Balance" value={coinBalance} className="col-span-2"/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaCoins className="mr-2 h-5 w-5 text-yellow-500" /> 
                Coin Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600">{coinBalance}</div>
                <div className="text-sm text-muted-foreground">MemoSpark Coins</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-card border border-border/50 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="font-bold text-foreground">Earned</div>
                  <div className="text-muted-foreground">{coinBalance}</div>
                </div>
                <div className="text-center p-2 bg-card border border-border/50 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="font-bold text-foreground">Spent</div>
                  <div className="text-muted-foreground">0</div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowRewardShop(true)}
              >
                <FaShoppingCart className="mr-2 h-4 w-4" />
                Visit Coin Shop
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Streak Tracking System */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakWidget 
            variant="detailed"
            showActions={true}
            onViewDetails={() => {
              console.log('Navigate to streak details');
            }}
          />
          
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
                  const achievementsSection = document.querySelector('[data-section="achievements"]');
                  if (achievementsSection) {
                    achievementsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <FaTrophy className="mr-2 h-4 w-4" />
                View All Achievements ({userAchievements.length})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowRewardShop(true)}
              >
                <FaShoppingCart className="mr-2 h-4 w-4" />
                Visit Coin Shop
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
                      // Trigger streak achievement
                      await triggerStreakIncreased(result.newStreak);
                      reload();
                    }
                  } catch (error) {
                    console.error('Error updating streak:', error);
                    toast.error('Failed to update streak');
                  }
                }}
              >
                <FaStar className="mr-2 h-4 w-4" />
                🔥 Check in
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Tracking */}
        <Card data-section="achievements">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Achievements</CardTitle>
              <CardDescription>Unlock achievements by completing milestones.</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {userAchievements.length} / {allAchievements.length} achievements
            </div>
          </CardHeader>
          <CardContent>
            {allAchievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FaTrophy className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No achievements available</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Achievements will appear here as they become available. Complete tasks and engage with the platform to unlock them!
                </p>
              </div>
            ) : userAchievements.length > 0 ? (
              <AchievementCollection
                achievements={userAchievements.map(ua => ({
                  ...ua.achievements!,
                  type: ua.achievements!.type as any, // Cast to avoid TypeScript strict checking
                  unlocked: true,
                  earnedAt: ua.unlocked_at
                }))}
                size="md"
                variant="grid"
                showProgress={false}
                onAchievementClick={(achievement) => {
                  setSelectedAchievement(achievement);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FaTrophy className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No achievements unlocked yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Complete tasks, maintain streaks, and engage with the community to unlock your first achievements!
                </p>
                <Button 
                  onClick={() => {
                    const tasksSection = document.querySelector('[data-section="tasks"]');
                    if (tasksSection) {
                      tasksSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  variant="outline"
                >
                  <FaCalendarAlt className="w-4 h-4 mr-2" />
                  Start Completing Tasks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FaTrophy className="mr-2 h-5 w-5 text-amber-500" /> Leaderboard</CardTitle>
            <CardDescription>See how you rank against other students.</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <ul className="space-y-2">
                {leaderboard.map((user) => (
                  <LeaderboardItem 
                    key={user.user_id} 
                    user={user} 
                    isCurrentUser={user.user_id === userStats?.user_id}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FaTrophy className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No leaderboard data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak Leaderboard */}
        <StreakLeaderboard 
          variant="card"
          limit={10}
          showPrivacyControls={true}
          className="w-full"
        />

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

      {/* Achievement Details Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedAchievement(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <FaTrophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedAchievement.name}
                </h3>
                <span className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                  Unlocked ✓
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {selectedAchievement.description}
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Points Earned:</span>
                <span className="font-semibold text-yellow-600">{selectedAchievement.points_reward}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-semibold capitalize">{selectedAchievement.type?.replace('_', ' ')}</span>
              </div>
              {selectedAchievement.earnedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Earned Date:</span>
                  <span className="font-semibold">{new Date(selectedAchievement.earnedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedAchievement(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
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