import { NextRequest, NextResponse } from 'next/server';
import { ScheduleManager } from '@/lib/ai/ScheduleManager';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const scheduleManager = new ScheduleManager();
    
    // Get scheduling analytics
    const analytics = await scheduleManager.getSchedulingAnalytics(userId, days);
    
    // Get recent patterns for additional insights
    const patterns = await scheduleManager.getRecentPatterns(userId, 100);

    // Calculate additional metrics
    const insights = {
      ...analytics,
      patterns,
      recommendations: generateRecommendations(analytics, patterns)
    };

    return NextResponse.json(insights);

  } catch (error) {
    console.error('Error fetching scheduling analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  analytics: any,
  patterns: any
): Array<{ type: string; message: string; priority: 'low' | 'medium' | 'high' }> {
  const recommendations = [];

  // Analyze completion rate
  if (analytics.totalScheduled > 0) {
    const completionRate = analytics.completedOnTime / analytics.totalScheduled;
    
    if (completionRate < 0.6) {
      recommendations.push({
        type: 'completion',
        message: 'Your task completion rate is below 60%. Consider scheduling shorter sessions or reducing task difficulty.',
        priority: 'high' as const
      });
    } else if (completionRate > 0.9) {
      recommendations.push({
        type: 'completion',
        message: 'Excellent completion rate! You might be ready for more challenging tasks or longer sessions.',
        priority: 'low' as const
      });
    }
  }

  // Analyze reschedule rate
  if (analytics.rescheduleRate > 0.3) {
    recommendations.push({
      type: 'scheduling',
      message: 'You reschedule tasks frequently. Consider building more buffer time into your schedule.',
      priority: 'medium' as const
    });
  }

  // Analyze session length vs actual performance
  if (analytics.averageActualVsScheduled > 1.5) {
    recommendations.push({
      type: 'timing',
      message: 'Tasks often take longer than scheduled. Consider increasing estimated durations by 25-50%.',
      priority: 'medium' as const
    });
  } else if (analytics.averageActualVsScheduled < 0.7) {
    recommendations.push({
      type: 'timing',
      message: 'You consistently finish tasks early. You could schedule more tasks or increase difficulty.',
      priority: 'low' as const
    });
  }

  // Analyze subject performance
  const subjectPerformance = patterns.subjectPerformance;
  const strugglingSubjects = Object.entries(subjectPerformance)
    .filter(([_, data]: [string, any]) => data.completed / data.total < 0.5)
    .map(([subject, _]) => subject);

  if (strugglingSubjects.length > 0) {
    recommendations.push({
      type: 'subjects',
      message: `Consider scheduling ${strugglingSubjects.join(', ')} during your most productive hours (${analytics.mostProductiveHours.join(', ')}:00).`,
      priority: 'medium' as const
    });
  }

  // Analyze productive hours
  if (analytics.mostProductiveHours.length > 0) {
    recommendations.push({
      type: 'productivity',
      message: `Your most productive hours are ${analytics.mostProductiveHours.join(', ')}:00. Schedule important tasks during these times.`,
      priority: 'low' as const
    });
  }

  return recommendations;
} 