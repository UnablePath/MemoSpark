'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Coins, 
  ShoppingCart, 
  BarChart3, 
  Star,
  Zap,
  Target,
  TrendingUp,
  Gift,
  Crown,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { RewardShop } from '@/components/gamification/RewardShop';
import { UserAnalyticsDashboard } from '@/components/analytics/UserAnalyticsDashboard';
import { useFetchAchievements, useFetchBalance } from '@/hooks/useAchievementQueries';

interface UserBalance {
  balance: number;
  last_updated: string;
  recent_transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
    metadata: any;
  }>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  points: number;
  requirements: any;
  reward: any;
  hidden: boolean;
  repeatable: boolean;
}

export default function GamificationFullTestPage() {
  const { user } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Use React Query hooks for data fetching
  const { data: achievementsData, isLoading: achievementsLoading } = useFetchAchievements();
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalance();

  // Extract data from consolidated response
  const userBalance = balanceData ? {
    balance: balanceData.balance || 0,
    last_updated: new Date().toISOString(),
    recent_transactions: [] as Array<{
      id: string;
      amount: number;
      type: string;
      description: string;
      created_at: string;
      metadata: any;
    }>
  } : null;

  const loading = achievementsLoading || balanceLoading;

  // Mock user stats for demonstration
  const mockUserStats = {
    level: 12,
    xp: 2450,
    xp_to_next_level: 550,
    current_streak: 7,
    longest_streak: 15,
    total_tasks_completed: 89,
    total_study_time: 4320, // minutes
    achievements_unlocked: 12,
    coins_earned: 1250,
    coins_spent: 750
  };

  useEffect(() => {
    // Load admin achievements for display (this could be moved to a separate hook if needed)
    const fetchAdminAchievements = async () => {
      if (!user?.id) return;

      try {
        const achievementsResponse = await fetch('/api/admin/achievements');
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          setAchievements(achievementsData);
        }
      } catch (error) {
        console.error('Error fetching admin achievements:', error);
      }
    };

    fetchAdminAchievements();
  }, [user?.id]);

  // Simulate earning coins
  const earnCoins = async (amount: number, reason: string) => {
    try {
      // In a real app, this would be an API call to award coins
      toast.success(`🪙 Earned ${amount} coins!`, {
        description: reason
      });
      
      // React Query will automatically refetch balance data
    } catch (error) {
      console.error('Error earning coins:', error);
    }
  };

  // Simulate completing a task
  const completeTask = () => {
    earnCoins(50, 'Completed study task');
  };

  // Simulate daily login
  const dailyLogin = () => {
    earnCoins(25, 'Daily login bonus');
  };

  // Simulate achievement unlock
  const unlockAchievement = () => {
    toast.success('🏆 Achievement Unlocked!', {
      description: 'Study Streak Master - Complete 7 days in a row'
    });
    earnCoins(100, 'Achievement reward');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading gamification features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center">
          <Sparkles className="w-8 h-8 mr-2 text-primary" />
          StudySpark Gamification System
        </h1>
        <p className="text-muted-foreground">
          Complete test environment for all gamification features
        </p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Coins className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{userBalance?.balance || 0}</div>
            <div className="text-sm text-muted-foreground">Coins</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{mockUserStats.level}</div>
            <div className="text-sm text-muted-foreground">Level</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{mockUserStats.current_streak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{mockUserStats.achievements_unlocked}</div>
            <div className="text-sm text-muted-foreground">Achievements</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons for Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Test Actions
          </CardTitle>
          <CardDescription>
            Simulate user actions to test the gamification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={completeTask} variant="outline">
              <Target className="w-4 h-4 mr-2" />
              Complete Task (+50 coins)
            </Button>
            <Button onClick={dailyLogin} variant="outline">
              <Star className="w-4 h-4 mr-2" />
              Daily Login (+25 coins)
            </Button>
            <Button onClick={unlockAchievement} variant="outline">
              <Trophy className="w-4 h-4 mr-2" />
              Unlock Achievement (+100 coins)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="shop">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Reward Shop
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userBalance?.recent_transactions?.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{transaction.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      No recent transactions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Level Progress</span>
                    <span>{mockUserStats.xp}/{mockUserStats.xp + mockUserStats.xp_to_next_level} XP</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(mockUserStats.xp / (mockUserStats.xp + mockUserStats.xp_to_next_level)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{mockUserStats.total_tasks_completed}</div>
                    <div className="text-xs text-muted-foreground">Tasks Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{Math.floor(mockUserStats.total_study_time / 60)}h</div>
                    <div className="text-xs text-muted-foreground">Study Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shop">
          <RewardShop variant="full" />
        </TabsContent>

        <TabsContent value="analytics">
          <UserAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Available Achievements
              </CardTitle>
              <CardDescription>
                Complete challenges to unlock achievements and earn rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.slice(0, 6).map((achievement) => (
                  <Card key={achievement.id} className="relative">
                    {achievement.rarity === 'legendary' && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <Crown className="w-6 h-6 text-yellow-500" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="text-2xl">{achievement.icon}</div>
                        <h3 className="font-bold text-sm">{achievement.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant={achievement.rarity === 'legendary' ? 'default' : 'secondary'}>
                            {achievement.rarity}
                          </Badge>
                          <div className="flex items-center text-xs">
                            <Coins className="w-3 h-3 mr-1 text-yellow-500" />
                            {achievement.reward?.coins || 0}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {achievements.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No achievements available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 