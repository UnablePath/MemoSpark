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
            { date: '2024-01-01', earned: 150, spent: 50, balance: 1200 },
            { date: '2024-01-02', earned: 200, spent: 0, balance: 1400 },
            { date: '2024-01-03', earned: 120, spent: 75, balance: 1445 },
            { date: '2024-01-04', earned: 180, spent: 100, balance: 1525 },
            { date: '2024-01-05', earned: 160, spent: 25, balance: 1660 },
            { date: '2024-01-06', earned: 140, spent: 200, balance: 1600 },
            { date: '2024-01-07', earned: 220, spent: 0, balance: 1820 }
          ],
          achievementProgress: [
            { 
              category: 'Streak Master', 
              unlocked: 8, 
              total: 12, 
              recent: [
                { name: '10-Day Streak', unlockedAt: '2024-01-05' },
                { name: 'Weekend Warrior', unlockedAt: '2024-01-03' }
              ]
            },
            { 
              category: 'Task Champion', 
              unlocked: 15, 
              total: 20, 
              recent: [
                { name: 'Century Club', unlockedAt: '2024-01-04' },
                { name: 'Daily Dozen', unlockedAt: '2024-01-02' }
              ]
            },
            { 
              category: 'Social Butterfly', 
              unlocked: 5, 
              total: 8, 
              recent: [
                { name: 'Team Player', unlockedAt: '2024-01-01' }
              ]
            }
          ],
          leaderboardPosition: {
            overall: 147,
            thisWeek: 89,
            streak: 23,
            achievements: 67
          }
        },
        insights: {
          productivityInsights: [
            {
              title: 'Peak Performance Window',
              description: 'You\'re most productive between 9-11 AM with 92% completion rate',
              type: 'positive'
            },
            {
              title: 'Evening Productivity Dip',
              description: 'Task completion drops 40% after 6 PM',
              type: 'improvement',
              action: 'Consider scheduling easier tasks for evening hours'
            },
            {
              title: 'Strong Tuesday Performance',
              description: 'Tuesdays show 25% higher task completion than average',
              type: 'positive'
            }
          ],
          recommendations: [
            {
              title: 'Optimize Study Schedule',
              description: 'Schedule your most challenging tasks during your 9-11 AM peak window',
              priority: 'high',
              category: 'Productivity'
            },
            {
              title: 'Weekend Planning',
              description: 'Your weekend completion rate is 30% lower. Try lighter, more engaging tasks',
              priority: 'medium',
              category: 'Time Management'
            },
            {
              title: 'Break Patterns',
              description: 'Consider adding short breaks every 45 minutes during long study sessions',
              priority: 'low',
              category: 'Wellness'
            }
          ],
          patterns: {
            bestStudyTimes: [
              { timeRange: '9:00-11:00', productivity: 92 },
              { timeRange: '15:00-17:00', productivity: 85 },
              { timeRange: '19:00-20:00', productivity: 78 }
            ],
            weakSpots: [
              { area: 'Weekend Motivation', improvement: 30 },
              { area: 'Evening Focus', improvement: 25 },
              { area: 'Break Management', improvement: 20 }
            ],
            strengths: [
              { area: 'Morning Productivity', score: 92 },
              { area: 'Task Prioritization', score: 87 },
              { area: 'Streak Consistency', score: 85 }
            ]
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.id, timeRange]);

  const refreshAnalytics = async () => {
    await fetchAnalytics();
    toast.success('Analytics refreshed!');
  };

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
  const [selectedTab, setSelectedTab] = useState('overview');

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-center">Failed to Load Analytics</h3>
        <p className="text-gray-600 mb-4 text-center text-sm">{error || 'Unable to fetch your analytics data'}</p>
        <Button onClick={refreshAnalytics} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Track your learning progress and insights</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-gray-500" />
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="flex-1 sm:flex-none border rounded-md px-2 sm:px-3 py-1 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={refreshAnalytics} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
            
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <OverviewCard
          title="Total Points"
          value={analytics.overview.totalPoints.toLocaleString()}
          change={12}
          icon={<Coins className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />}
        />
        <OverviewCard
          title="Current Streak"
          value={`${analytics.overview.currentStreak} days`}
          change={8}
          icon={<Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />}
        />
        <OverviewCard
          title="Level"
          value={analytics.overview.level.toString()}
          change={5}
          icon={<Crown className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />}
        />
        <OverviewCard
          title="Completion Rate"
          value={`${Math.round(analytics.overview.completionRate * 100)}%`}
          change={3}
          icon={<Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-max sm:min-w-0">
            <TabsTrigger value="overview" className="flex items-center gap-1 px-2 sm:px-3">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1 px-2 sm:px-3">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1 px-2 sm:px-3">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Perform</span>
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-1 px-2 sm:px-3">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Games</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1 px-2 sm:px-3">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Insights</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <OverviewTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 sm:space-y-6">
          <ActivityTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 sm:space-y-6">
          <PerformanceTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="gamification" className="space-y-4 sm:space-y-6">
          <GamificationTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 sm:space-y-6">
          <InsightsTab analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Component implementations for each tab...
const OverviewCard: React.FC<{
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}> = ({ title, value, change, icon }) => (
  <Card>
    <CardContent className="p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
        </div>
        <div className="flex-shrink-0 ml-2">
          {icon}
        </div>
      </div>
      <div className="flex items-center mt-2 sm:mt-4">
        {change > 0 ? (
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
        )}
        <span className={`text-xs sm:text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span className="text-xs sm:text-sm text-gray-500 ml-1 hidden sm:inline">vs last period</span>
      </div>
    </CardContent>
  </Card>
);

const OverviewTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          Weekly Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={analytics.activity.weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="tasks" fill="#3b82f6" />
            <Bar dataKey="points" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Priority Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={analytics.performance.priorityDistribution}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
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
);

const ActivityTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <div className="space-y-4 sm:space-y-6">
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-sm sm:text-base">Daily Activity Pattern</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Your productivity throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.activity.dailyPattern}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tickFormatter={(hour: number) => `${hour}:00`} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="activity" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
            <Area type="monotone" dataKey="productivity" stackId="2" stroke="#10b981" fill="#10b981" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-sm sm:text-base">Monthly Trends</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Your progress over the past months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics.activity.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
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
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-sm sm:text-base">Subject Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {analytics.performance.subjectBreakdown.map((subject) => (
            <div key={subject.subject} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm sm:text-base truncate">{subject.subject}</span>
                <span className="text-xs sm:text-sm text-gray-500 ml-2">
                  {subject.completed}/{subject.completed + subject.pending}
                </span>
              </div>
              <Progress value={(subject.completed / (subject.completed + subject.pending)) * 100} />
              <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                <span>{subject.points} points</span>
                <span>{Math.round((subject.completed / (subject.completed + subject.pending)) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-sm sm:text-base">Streak Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-500">{analytics.performance.streakAnalytics.currentStreak}</div>
              <div className="text-xs sm:text-sm text-gray-500">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-500">{analytics.performance.streakAnalytics.longestStreak}</div>
              <div className="text-xs sm:text-sm text-gray-500">Longest Streak</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span className="font-medium">{Math.round(analytics.performance.streakAnalytics.completionRate * 100)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Best Day</span>
              <span className="font-medium text-green-500">{analytics.performance.streakAnalytics.bestDayOfWeek}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Needs Work</span>
              <span className="font-medium text-orange-500">{analytics.performance.streakAnalytics.worstDayOfWeek}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Trend</span>
              <Badge variant={analytics.performance.streakAnalytics.recentTrends === 'improving' ? 'default' : 'secondary'} className="text-xs">
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
  <div className="space-y-4 sm:space-y-6">
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-sm sm:text-base">Coin Activity</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Your earning and spending patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={analytics.gamification.coinHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(date: string) => new Date(date).toLocaleDateString()} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="earned" fill="#10b981" />
            <Bar dataKey="spent" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">Achievement Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {analytics.gamification.achievementProgress.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{category.category}</span>
                  <span className="text-xs text-gray-500">
                    {category.unlocked}/{category.total}
                  </span>
                </div>
                <Progress value={(category.unlocked / category.total) * 100} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">Leaderboard Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-blue-500">#{analytics.gamification.leaderboardPosition.overall}</div>
              <div className="text-xs text-gray-500">Overall</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-green-500">#{analytics.gamification.leaderboardPosition.thisWeek}</div>
              <div className="text-xs text-gray-500">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-orange-500">#{analytics.gamification.leaderboardPosition.streak}</div>
              <div className="text-xs text-gray-500">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-purple-500">#{analytics.gamification.leaderboardPosition.achievements}</div>
              <div className="text-xs text-gray-500">Achievements</div>
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