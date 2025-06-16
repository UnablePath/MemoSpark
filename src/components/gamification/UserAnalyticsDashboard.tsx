'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  TrendingUp, TrendingDown, User, Clock, Target, Trophy,
  Calendar, Activity, Brain, Coins, Star, Award,
  CheckCircle, AlertCircle, BookOpen, Zap, Heart,
  Users, MessageSquare, Share2, Flame, Crown,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Gauge, Map, Camera, Download, Filter, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface UserAnalytics {
  overview: {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    level: number;
    rank: number;
    totalUsers: number;
    completionRate: number;
    avgSessionTime: number;
  };
  activity: {
    weeklyActivity: Array<{ day: string; tasks: number; points: number; time: number }>;
    monthlyTrends: Array<{ month: string; tasks: number; streak: number; points: number }>;
    dailyPattern: Array<{ hour: number; activity: number; productivity: number }>;
  };
  performance: {
    subjectBreakdown: Array<{ subject: string; completed: number; pending: number; points: number }>;
    priorityDistribution: Array<{ name: string; value: number; color: string }>;
    streakAnalytics: {
      currentStreak: number;
      longestStreak: number;
      totalDays: number;
      completionRate: number;
      averageStreakLength: number;
      bestDayOfWeek: string;
      worstDayOfWeek: string;
      recentTrends: 'improving' | 'declining' | 'stable';
    };
  };
  gamification: {
    coinHistory: Array<{ date: string; earned: number; spent: number; balance: number }>;
    achievementProgress: Array<{ 
      category: string; 
      unlocked: number; 
      total: number; 
      recent: Array<{ name: string; unlockedAt: string }> 
    }>;
    leaderboardPosition: {
      overall: number;
      thisWeek: number;
      streak: number;
      achievements: number;
    };
  };
  insights: {
    productivityInsights: Array<{ 
      title: string; 
      description: string; 
      type: 'positive' | 'neutral' | 'improvement'; 
      action?: string 
    }>;
    recommendations: Array<{ 
      title: string; 
      description: string; 
      priority: 'high' | 'medium' | 'low';
      category: string;
    }>;
    patterns: {
      bestStudyTimes: Array<{ timeRange: string; productivity: number }>;
      weakSpots: Array<{ area: string; improvement: number }>;
      strengths: Array<{ area: string; score: number }>;
    };
  };
}

interface UseUserAnalyticsReturn {
  analytics: UserAnalytics | null;
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
  timeRange: '7d' | '30d' | '90d' | '1y';
  setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

const useUserAnalytics = (): UseUserAnalyticsReturn => {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const fetchAnalytics = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/user?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      
      // Mock data for development
      setAnalytics({
        overview: {
          totalPoints: 2847,
          currentStreak: 12,
          longestStreak: 23,
          level: 8,
          rank: 147,
          totalUsers: 1250,
          completionRate: 0.82,
          avgSessionTime: 45.5
        },
        activity: {
          weeklyActivity: [
            { day: 'Mon', tasks: 8, points: 120, time: 65 },
            { day: 'Tue', tasks: 12, points: 180, time: 85 },
            { day: 'Wed', tasks: 6, points: 90, time: 45 },
            { day: 'Thu', tasks: 15, points: 225, time: 95 },
            { day: 'Fri', tasks: 10, points: 150, time: 70 },
            { day: 'Sat', tasks: 5, points: 75, time: 35 },
            { day: 'Sun', tasks: 8, points: 120, time: 55 }
          ],
          monthlyTrends: [
            { month: 'Jan', tasks: 245, streak: 18, points: 3675 },
            { month: 'Feb', tasks: 220, streak: 15, points: 3300 },
            { month: 'Mar', tasks: 280, streak: 23, points: 4200 },
            { month: 'Apr', tasks: 195, streak: 12, points: 2925 }
          ],
          dailyPattern: [
            { hour: 6, activity: 10, productivity: 85 },
            { hour: 7, activity: 25, productivity: 90 },
            { hour: 8, activity: 40, productivity: 95 },
            { hour: 9, activity: 60, productivity: 88 },
            { hour: 10, activity: 75, productivity: 92 },
            { hour: 11, activity: 65, productivity: 87 },
            { hour: 12, activity: 45, productivity: 70 },
            { hour: 13, activity: 35, productivity: 65 },
            { hour: 14, activity: 55, productivity: 78 },
            { hour: 15, activity: 70, productivity: 85 },
            { hour: 16, activity: 80, productivity: 88 },
            { hour: 17, activity: 65, productivity: 82 },
            { hour: 18, activity: 50, productivity: 75 },
            { hour: 19, activity: 60, productivity: 80 },
            { hour: 20, activity: 40, productivity: 75 },
            { hour: 21, activity: 25, productivity: 70 },
            { hour: 22, activity: 15, productivity: 60 }
          ]
        },
        performance: {
          subjectBreakdown: [
            { subject: 'Mathematics', completed: 45, pending: 8, points: 675 },
            { subject: 'Computer Science', completed: 38, pending: 12, points: 570 },
            { subject: 'Physics', completed: 32, pending: 5, points: 480 },
            { subject: 'English', completed: 28, pending: 15, points: 420 },
            { subject: 'Chemistry', completed: 25, pending: 10, points: 375 }
          ],
          priorityDistribution: [
            { name: 'High', value: 35, color: '#ef4444' },
            { name: 'Medium', value: 45, color: '#f59e0b' },
            { name: 'Low', value: 20, color: '#10b981' }
          ],
          streakAnalytics: {
            currentStreak: 12,
            longestStreak: 23,
            totalDays: 89,
            completionRate: 0.82,
            averageStreakLength: 8.5,
            bestDayOfWeek: 'Tuesday',
            worstDayOfWeek: 'Saturday',
            recentTrends: 'improving'
          }
        },
        gamification: {
          coinHistory: [
            { date: '2024-01-15', earned: 150, spent: 50, balance: 2847 },
            { date: '2024-01-16', earned: 120, spent: 0, balance: 2967 },
            { date: '2024-01-17', earned: 200, spent: 100, balance: 3067 },
            { date: '2024-01-18', earned: 180, spent: 75, balance: 3172 },
            { date: '2024-01-19', earned: 160, spent: 25, balance: 3307 },
            { date: '2024-01-20', earned: 140, spent: 200, balance: 3247 },
            { date: '2024-01-21', earned: 190, spent: 0, balance: 3437 }
          ],
          achievementProgress: [
            { 
              category: 'Streak Master', 
              unlocked: 8, 
              total: 12, 
              recent: [{ name: '10-Day Streak', unlockedAt: '2024-01-18' }] 
            },
            { 
              category: 'Task Crusher', 
              unlocked: 15, 
              total: 20, 
              recent: [{ name: '100 Tasks Complete', unlockedAt: '2024-01-20' }] 
            },
            { 
              category: 'Study Master', 
              unlocked: 6, 
              total: 10, 
              recent: [{ name: 'Subject Explorer', unlockedAt: '2024-01-15' }] 
            },
            { 
              category: 'Social Butterfly', 
              unlocked: 3, 
              total: 8, 
              recent: [{ name: 'First Share', unlockedAt: '2024-01-12' }] 
            }
          ],
          leaderboardPosition: {
            overall: 147,
            thisWeek: 89,
            streak: 56,
            achievements: 203
          }
        },
        insights: {
          productivityInsights: [
            {
              title: 'Peak Performance Window',
              description: 'You\'re most productive between 9-11 AM with 92% efficiency',
              type: 'positive',
              action: 'Schedule your most challenging tasks during this time'
            },
            {
              title: 'Weekend Consistency',
              description: 'Your weekend completion rate has improved by 15%',
              type: 'positive'
            },
            {
              title: 'Afternoon Dip',
              description: 'Productivity decreases significantly after lunch (1-2 PM)',
              type: 'improvement',
              action: 'Consider shorter tasks or breaks during this period'
            }
          ],
          recommendations: [
            {
              title: 'Extend Your Streak',
              description: 'You\'re close to your personal best! Keep the momentum going.',
              priority: 'high',
              category: 'Motivation'
            },
            {
              title: 'Focus on Mathematics',
              description: 'You have the highest completion rate in Math. Consider tackling more challenging problems.',
              priority: 'medium',
              category: 'Academic'
            },
            {
              title: 'Weekend Planning',
              description: 'Plan lighter tasks for weekends to maintain consistency.',
              priority: 'low',
              category: 'Planning'
            }
          ],
          patterns: {
            bestStudyTimes: [
              { timeRange: '9:00-11:00 AM', productivity: 92 },
              { timeRange: '3:00-5:00 PM', productivity: 88 },
              { timeRange: '7:00-9:00 PM', productivity: 85 }
            ],
            weakSpots: [
              { area: 'Weekend Consistency', improvement: 15 },
              { area: 'Afternoon Focus', improvement: 12 },
              { area: 'Task Prioritization', improvement: 8 }
            ],
            strengths: [
              { area: 'Morning Routine', score: 95 },
              { area: 'Streak Maintenance', score: 88 },
              { area: 'Subject Diversity', score: 82 }
            ]
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    await fetchAnalytics();
    toast.success('Analytics refreshed!');
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.id, timeRange]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
    timeRange,
    setTimeRange
  };
};

export const UserAnalyticsDashboard: React.FC = () => {
  const { analytics, loading, error, refreshAnalytics, timeRange, setTimeRange } = useUserAnalytics();

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Analytics</h3>
            <p className="text-gray-600 text-center mb-4">
              {error || 'Unable to fetch your analytics data at the moment.'}
            </p>
            <Button onClick={refreshAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your learning journey</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="gamification">Gamification</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="gamification">
          <GamificationTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const OverviewCard: React.FC<{
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}> = ({ title, value, change, icon }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <div className="flex items-center mt-2">
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% from last period
            </span>
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-full">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const OverviewTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <OverviewCard
        title="Total Points"
        value={analytics.overview.totalPoints.toLocaleString()}
        change={12}
        icon={<Coins className="h-6 w-6 text-yellow-500" />}
      />
      <OverviewCard
        title="Current Streak"
        value={`${analytics.overview.currentStreak} days`}
        change={8}
        icon={<Flame className="h-5 w-5 text-orange-500" />}
      />
      <OverviewCard
        title="Level"
        value={analytics.overview.level.toString()}
        change={5}
        icon={<Trophy className="h-6 w-6 text-purple-500" />}
      />
      <OverviewCard
        title="Rank"
        value={`#${analytics.overview.rank}`}
        change={-3}
        icon={<Crown className="h-6 w-6 text-yellow-600" />}
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Your task completion this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.activity.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tasks" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
          <CardDescription>Breakdown of your task priorities</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.performance.priorityDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {analytics.performance.priorityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  </div>
);

const ActivityTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity Pattern</CardTitle>
        <CardDescription>Your productivity throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={analytics.activity.dailyPattern}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tickFormatter={(hour: number) => `${hour}:00`} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="activity" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
            <Area type="monotone" dataKey="productivity" stackId="2" stroke="#10b981" fill="#10b981" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>Your progress over the past months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.activity.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="streak" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
);

const PerformanceTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Subject Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.performance.subjectBreakdown.map((subject) => (
            <div key={subject.subject} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{subject.subject}</span>
                <span className="text-sm text-gray-500">
                  {subject.completed} completed, {subject.pending} pending
                </span>
              </div>
              <Progress value={(subject.completed / (subject.completed + subject.pending)) * 100} />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{subject.points} points</span>
                <span>{Math.round((subject.completed / (subject.completed + subject.pending)) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Streak Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{analytics.performance.streakAnalytics.currentStreak}</div>
              <div className="text-sm text-gray-500">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{analytics.performance.streakAnalytics.longestStreak}</div>
              <div className="text-sm text-gray-500">Longest Streak</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Completion Rate</span>
              <span className="font-medium">{Math.round(analytics.performance.streakAnalytics.completionRate * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Best Day</span>
              <span className="font-medium text-green-500">{analytics.performance.streakAnalytics.bestDayOfWeek}</span>
            </div>
            <div className="flex justify-between">
              <span>Needs Work</span>
              <span className="font-medium text-orange-500">{analytics.performance.streakAnalytics.worstDayOfWeek}</span>
            </div>
            <div className="flex justify-between">
              <span>Trend</span>
              <Badge variant={analytics.performance.streakAnalytics.recentTrends === 'improving' ? 'default' : 'secondary'}>
                {analytics.performance.streakAnalytics.recentTrends}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const GamificationTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Coin Activity</CardTitle>
        <CardDescription>Your earning and spending patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.gamification.coinHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(date: string) => new Date(date).toLocaleDateString()} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="earned" fill="#10b981" />
            <Bar dataKey="spent" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Achievement Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.gamification.achievementProgress.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{category.category}</span>
                  <span className="text-sm text-gray-500">
                    {category.unlocked}/{category.total}
                  </span>
                </div>
                <Progress value={(category.unlocked / category.total) * 100} />
                {category.recent.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Recent: {category.recent[0].name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span>Overall Rank</span>
              <span className="font-bold text-yellow-600">#{analytics.gamification.leaderboardPosition.overall}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span>This Week</span>
              <span className="font-bold text-blue-600">#{analytics.gamification.leaderboardPosition.thisWeek}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span>Streak Rank</span>
              <span className="font-bold text-orange-600">#{analytics.gamification.leaderboardPosition.streak}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span>Achievements</span>
              <span className="font-bold text-purple-600">#{analytics.gamification.leaderboardPosition.achievements}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const InsightsTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Productivity Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.insights.productivityInsights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-lg border ${
              insight.type === 'positive' ? 'bg-green-50 border-green-200' :
              insight.type === 'improvement' ? 'bg-orange-50 border-orange-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <h4 className="font-medium mb-2">{insight.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
              {insight.action && (
                <p className="text-sm font-medium text-orange-600">{insight.action}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.insights.recommendations.map((rec, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">{rec.title}</h5>
                  <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
                <p className="text-xs text-gray-500 mt-1">{rec.category}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium mb-2 text-green-600">Strengths</h5>
              {analytics.insights.patterns.strengths.map((strength, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{strength.area}</span>
                  <span className="text-sm font-medium text-green-600">{strength.score}%</span>
                </div>
              ))}
            </div>

            <div>
              <h5 className="font-medium mb-2 text-orange-600">Improvement Areas</h5>
              {analytics.insights.patterns.weakSpots.map((weak, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{weak.area}</span>
                  <span className="text-sm font-medium text-orange-600">+{weak.improvement}%</span>
                </div>
              ))}
            </div>

            <div>
              <h5 className="font-medium mb-2 text-blue-600">Best Study Times</h5>
              {analytics.insights.patterns.bestStudyTimes.map((time, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{time.timeRange}</span>
                  <span className="text-sm font-medium text-blue-600">{time.productivity}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const AnalyticsLoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  </div>
);

export default UserAnalyticsDashboard; 