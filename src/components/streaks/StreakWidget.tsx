'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Flame, 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar,
  Zap,
  Award
} from 'lucide-react';
import { StreakTracker, type StreakAnalytics } from '@/lib/gamification/StreakTracker';
import { toast } from 'sonner';

interface StreakWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  showActions?: boolean;
  onViewDetails?: () => void;
}

export const StreakWidget: React.FC<StreakWidgetProps> = ({
  className = '',
  variant = 'compact',
  showActions = true,
  onViewDetails
}) => {
  const { user } = useUser();
  const [streakData, setStreakData] = useState<StreakAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingToday, setCompletingToday] = useState(false);
  const [streakTracker] = useState(() => new StreakTracker());

  useEffect(() => {
    if (user?.id) {
      loadStreakData();
    }
  }, [user?.id]);

  const loadStreakData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Get user stats first (this has the accurate streak from database)
      const userStats = await streakTracker.getCurrentStreak(user.id);
      
      // Get analytics for additional metrics
      const analytics = await streakTracker.getStreakAnalytics(user.id);
      
      // Prioritize database values over calculated analytics
      const mergedAnalytics = {
        ...analytics,
        current_streak: userStats.current_streak || 0,
        longest_streak: userStats.longest_streak || analytics.longest_streak,
        // Recalculate days to milestone based on accurate current streak
        days_to_milestone: Math.max(0, analytics.next_milestone - (userStats.current_streak || 0))
      };
      
      setStreakData(mergedAnalytics);
    } catch (error) {
      console.error('Error loading streak data:', error);
      // Fallback to default data
      setStreakData({
        current_streak: 0,
        longest_streak: 0,
        total_days: 0,
        completion_rate: 0,
        average_streak_length: 0,
        best_day_of_week: 'monday',
        worst_day_of_week: 'monday',
        recent_trends: 'stable',
        next_milestone: 7,
        days_to_milestone: 7
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteToday = async () => {
    if (!user?.id || completingToday) return;

    try {
      setCompletingToday(true);
      const result = await streakTracker.markDailyCompletion(user.id, 1, 10);
      
      if (result.success) {
        toast.success(`Streak updated! 🔥 ${result.newStreak} days`, {
          description: result.achievementsUnlocked.length > 0 
            ? `Achievement unlocked: ${result.achievementsUnlocked[0].achievement?.name}`
            : 'Keep it going!'
        });
        loadStreakData();
      }
    } catch (error) {
      console.error('Error completing today:', error);
      toast.error('Failed to update streak');
    } finally {
      setCompletingToday(false);
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 365) return '🏆';
    if (streak >= 100) return '💎';
    if (streak >= 50) return '🌟';
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🎯';
    return '✨';
  };

  const getMotivationalMessage = (streak: number, trend: string) => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return "Building momentum!";
    if (streak < 30) return "You're on fire! 🔥";
    if (streak < 100) return "Incredible dedication!";
    return "Legend status! 🏆";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streakData) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <Flame className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-muted-foreground">Unable to load streak data</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${className}`} onClick={onViewDetails}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getStreakEmoji(streakData.current_streak)}</div>
                  <div>
                    <div className="font-bold text-lg">{streakData.current_streak}</div>
                    <div className="text-xs text-muted-foreground">day streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{streakData.current_streak} day streak</div>
              <div className="text-sm">{getMotivationalMessage(streakData.current_streak, streakData.recent_trends)}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-medium">Streak</span>
            </div>
            {getTrendIcon(streakData.recent_trends)}
          </div>

          {/* Main Streak Display */}
          <div className="text-center space-y-2">
            <div className="text-3xl">{getStreakEmoji(streakData.current_streak)}</div>
            <div className="text-2xl font-bold text-orange-500">{streakData.current_streak}</div>
            <div className="text-sm text-muted-foreground">
              {streakData.current_streak === 1 ? 'day' : 'days'} strong
            </div>
          </div>

          {/* Progress to Next Milestone */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Next milestone: {streakData.next_milestone}</span>
              <span>{streakData.days_to_milestone} to go</span>
            </div>
            <Progress 
              value={(streakData.current_streak / streakData.next_milestone) * 100} 
              className="h-1"
            />
          </div>

          {/* Quick Stats */}
          <div className="flex justify-between text-xs">
            <div className="text-center">
              <div className="font-medium text-blue-500">{streakData.longest_streak}</div>
              <div className="text-muted-foreground">Best</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-500">{Math.round(streakData.completion_rate * 100)}%</div>
              <div className="text-muted-foreground">Rate</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-500">{streakData.total_days}</div>
              <div className="text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="space-y-2">
              <Button 
                onClick={handleCompleteToday} 
                disabled={completingToday}
                size="sm"
                className="w-full"
              >
                {completingToday ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <>
                    <Flame className="w-4 h-4 mr-2" />
                    Check in
                  </>
                )}
              </Button>
              {onViewDetails && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={onViewDetails}
                >
                  View Details
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-6">
        {/* Header with trend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-lg font-semibold">Daily Streak</span>
          </div>
          <Badge variant={streakData.recent_trends === 'improving' ? 'default' : 'secondary'}>
            {getTrendIcon(streakData.recent_trends)}
            <span className="ml-1 capitalize">{streakData.recent_trends}</span>
          </Badge>
        </div>

        {/* Main Display */}
        <div className="text-center space-y-3">
          <div className="text-6xl">{getStreakEmoji(streakData.current_streak)}</div>
          <div className="text-4xl font-bold text-orange-500">{streakData.current_streak}</div>
          <div className="text-lg text-muted-foreground">
            {streakData.current_streak === 1 ? 'day streak' : 'days streak'}
          </div>
          <div className="text-sm text-muted-foreground italic">
            {getMotivationalMessage(streakData.current_streak, streakData.recent_trends)}
          </div>
        </div>

        {/* Milestone Progress */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Next Milestone</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{streakData.next_milestone} days</span>
              <span>{streakData.days_to_milestone} days to go</span>
            </div>
            <Progress 
              value={(streakData.current_streak / streakData.next_milestone) * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center space-y-1">
            <Trophy className="w-5 h-5 mx-auto text-yellow-500" />
            <div className="text-lg font-bold text-blue-500">{streakData.longest_streak}</div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </div>
          <div className="text-center space-y-1">
            <Award className="w-5 h-5 mx-auto text-green-500" />
            <div className="text-lg font-bold text-green-500">{Math.round(streakData.completion_rate * 100)}%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
          <div className="text-center space-y-1">
            <Calendar className="w-5 h-5 mx-auto text-purple-500" />
            <div className="text-lg font-bold text-purple-500">{streakData.total_days}</div>
            <div className="text-xs text-muted-foreground">Total Days</div>
          </div>
          <div className="text-center space-y-1">
            <Zap className="w-5 h-5 mx-auto text-indigo-500" />
            <div className="text-lg font-bold text-indigo-500">{streakData.average_streak_length}</div>
            <div className="text-xs text-muted-foreground">Avg Length</div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="space-y-2">
            <Button 
              onClick={handleCompleteToday} 
              disabled={completingToday}
              className="w-full"
            >
              {completingToday ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Marking Complete...</span>
                </div>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-2" />
                  Check in
                </>
              )}
            </Button>
            {onViewDetails && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onViewDetails}
              >
                View Full Analytics
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 