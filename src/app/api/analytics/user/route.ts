import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';

    // In production, you would query Supabase here to get real analytics data
    // This is mock data for development
    const analyticsData = {
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
          { hour: 9, activity: 60, productivity: 88 },
          { hour: 10, activity: 75, productivity: 92 },
          { hour: 11, activity: 65, productivity: 87 },
          { hour: 14, activity: 55, productivity: 78 },
          { hour: 15, activity: 70, productivity: 85 },
          { hour: 16, activity: 80, productivity: 88 },
          { hour: 19, activity: 60, productivity: 80 }
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
            { area: 'Evening Focus', improvement: 25 }
          ],
          strengths: [
            { area: 'Morning Productivity', score: 92 },
            { area: 'Task Prioritization', score: 87 },
            { area: 'Streak Consistency', score: 85 }
          ]
        }
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 