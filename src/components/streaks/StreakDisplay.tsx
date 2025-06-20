'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  StreakTracker, 
  type StreakAnalytics, 
  type StreakMilestone, 
  type StreakRecoveryOption 
} from '@/lib/gamification/StreakTracker';
import { Flame, Award, TrendingUp, Calendar, Share2, Shield, Clock, Zap, Trophy, Target } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface StreakDisplayProps {
  className?: string;
  compact?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { user } = useUser();
  const [streakData, setStreakData] = useState<StreakAnalytics | null>(null);
  const [milestones, setMilestones] = useState<StreakMilestone[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<StreakRecoveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'internal' | 'twitter' | 'facebook' | 'instagram'>('internal');
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
      const [analytics, userMilestones, options] = await Promise.all([
        streakTracker.getStreakAnalytics(user.id),
        streakTracker.getStreakMilestones(user.id),
        streakTracker.getRecoveryOptions(user.id)
      ]);

      setStreakData(analytics);
      setMilestones(userMilestones);
      setRecoveryOptions(options);
    } catch (error) {
      console.error('Error loading streak data:', error);
      toast.error('Failed to load streak data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompletion = async () => {
    if (!user?.id) return;

    try {
      const result = await streakTracker.markDailyCompletion(user.id, 1, 10);
      if (result.success) {
        toast.success(`Great! Your streak is now ${result.newStreak} days! 🔥`);
        if (result.achievementsUnlocked.length > 0) {
          toast.success(`Achievement unlocked: ${result.achievementsUnlocked[0].achievement?.name}`);
        }
        loadStreakData();
      }
    } catch (error) {
      console.error('Error marking completion:', error);
      toast.error('Failed to mark completion');
    }
  };

  const handleUseRecovery = async (recoveryType: 'freeze' | 'extend' | 'bonus_day') => {
    if (!user?.id) return;

    try {
      const result = await streakTracker.useRecovery(user.id, recoveryType);
      if (result.success) {
        toast.success(result.message);
        loadStreakData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error using recovery:', error);
      toast.error('Failed to use recovery option');
    }
  };

  const handleShareStreak = async () => {
    if (!user?.id || !streakData) return;

    try {
      const result = await streakTracker.shareStreak(
        user.id, 
        selectedPlatform, 
        shareMessage || `I'm on a ${streakData.current_streak}-day streak! 🔥`
      );
      
      if (result.success) {
        toast.success('Streak shared successfully! 🎉');
        setIsShareDialogOpen(false);
        setShareMessage('');
      }
    } catch (error) {
      console.error('Error sharing streak:', error);
      toast.error('Failed to share streak');
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

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '📊';
    }
  };

  const formatDayOfWeek = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streakData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p>Unable to load streak data</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getStreakEmoji(streakData.current_streak)}</div>
              <div>
                <div className="font-bold text-lg">{streakData.current_streak} days</div>
                <div className="text-sm text-muted-foreground">Current streak</div>
              </div>
            </div>
            <Button onClick={handleMarkCompletion} size="sm">
              <Flame className="w-4 h-4 mr-1" />
              Complete Today
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Streak Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <span>Streak Tracker</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Streak */}
          <div className="text-center space-y-2">
            <div className="text-6xl">{getStreakEmoji(streakData.current_streak)}</div>
            <div className="text-4xl font-bold text-orange-500">
              {streakData.current_streak}
            </div>
            <div className="text-lg text-muted-foreground">
              {streakData.current_streak === 1 ? 'day' : 'days'} streak
            </div>
            <Button onClick={handleMarkCompletion} className="mt-4">
              <Flame className="w-4 h-4 mr-2" />
              Mark Today Complete
            </Button>
          </div>

          <Separator />

          {/* Progress to Next Milestone */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {streakData.next_milestone} days</span>
              <span>{streakData.days_to_milestone} days to go</span>
            </div>
            <Progress 
              value={(streakData.current_streak / streakData.next_milestone) * 100} 
              className="h-2"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{streakData.longest_streak}</div>
              <div className="text-xs text-muted-foreground">Longest</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{streakData.total_days}</div>
              <div className="text-xs text-muted-foreground">Total Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round(streakData.completion_rate * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-500">{streakData.average_streak_length}</div>
              <div className="text-xs text-muted-foreground">Avg Length</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Performance Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Best Day</span>
                    <Badge variant="secondary">
                      {formatDayOfWeek(streakData.best_day_of_week)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Challenging Day</span>
                    <Badge variant="outline">
                      {formatDayOfWeek(streakData.worst_day_of_week)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Trend</span>
                    <Badge variant={streakData.recent_trends === 'improving' ? 'default' : 'secondary'}>
                      {getTrendEmoji(streakData.recent_trends)} {streakData.recent_trends}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Streak Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <div className="space-y-3">
                  {milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <div>
                          <div className="font-medium">{milestone.streak_length} days</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDayOfWeek(milestone.milestone_type)} milestone
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(milestone.achieved_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No milestones achieved yet</p>
                  <p className="text-sm">Keep building your streak to unlock achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Streak Recovery</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {recoveryOptions.map((option) => (
                  <div 
                    key={option.type}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{option.icon}</div>
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{option.cost} coins</Badge>
                      <Button
                        onClick={() => handleUseRecovery(option.type)}
                        disabled={!option.available}
                        size="sm"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="w-5 h-5" />
                <span>Share Your Streak</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share {streakData.current_streak}-day streak
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Your Streak</DialogTitle>
                    <DialogDescription>
                      Celebrate your {streakData.current_streak}-day streak with others!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Platform</label>
                      <Select value={selectedPlatform} onValueChange={(value: any) => setSelectedPlatform(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">MemoSpark Community</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <Textarea
                        placeholder={`I'm on a ${streakData.current_streak}-day streak! 🔥`}
                        value={shareMessage}
                        onChange={(e) => setShareMessage(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleShareStreak} className="w-full">
                      Share Now
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 