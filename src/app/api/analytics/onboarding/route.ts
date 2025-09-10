import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();

    // Validate the event data
    if (!body.event || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add server-side metadata
    const analyticsEvent = {
      ...body,
      user_id: userId || body.userId || null,
      ip_address: request.ip || null,
      user_agent: request.headers.get('user-agent') || null,
      created_at: new Date().toISOString(),
    };

    // Store in database if Supabase is available
    if (supabaseServerAdmin) {
      try {
        await supabaseServerAdmin
          .from('onboarding_analytics')
          .insert(analyticsEvent);
      } catch (dbError) {
        console.warn('Failed to store onboarding analytics in database:', dbError);
        // Continue execution - analytics shouldn't break the app
      }
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Onboarding Analytics Event:', {
        event: body.event,
        step: body.step,
        stepName: body.stepName,
        userId: userId || body.userId,
        metadata: body.metadata,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding analytics error:', error);
    
    // Return success even on error to prevent breaking the onboarding flow
    return NextResponse.json({ success: true });
  }
}

// GET endpoint to retrieve analytics data (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Only allow authenticated users to view analytics
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get onboarding analytics data
    const { data: analytics, error } = await supabaseServerAdmin
      .from('onboarding_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Process analytics data
    const summary = processAnalyticsData(analytics || []);

    return NextResponse.json({
      success: true,
      data: analytics,
      summary,
    });
  } catch (error) {
    console.error('Error fetching onboarding analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

function processAnalyticsData(analytics: any[]) {
  const summary = {
    totalSessions: 0,
    completedOnboarding: 0,
    dropOffByStep: {} as Record<number, number>,
    averageCompletionTime: 0,
    mostCommonDropOffStep: 0,
    conversionRate: 0,
    stepCompletionRates: {} as Record<number, { entered: number; completed: number; rate: number }>,
  };

  // Group by session
  const sessions = analytics.reduce((acc, event) => {
    const sessionId = event.metadata?.sessionId || 'unknown';
    if (!acc[sessionId]) {
      acc[sessionId] = [];
    }
    acc[sessionId].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  summary.totalSessions = Object.keys(sessions).length;

  // Analyze each session
  Object.values(sessions).forEach((sessionEvents) => {
    const completedEvent = sessionEvents.find(e => e.event === 'onboarding_completed');
    const dropOffEvent = sessionEvents.find(e => e.event === 'onboarding_dropped_off');
    
    if (completedEvent) {
      summary.completedOnboarding++;
    } else if (dropOffEvent && dropOffEvent.step) {
      summary.dropOffByStep[dropOffEvent.step] = (summary.dropOffByStep[dropOffEvent.step] || 0) + 1;
    }

    // Track step completion rates
    sessionEvents.forEach(event => {
      if (event.step && event.event === 'step_entered') {
        const step = event.step;
        if (!summary.stepCompletionRates[step]) {
          summary.stepCompletionRates[step] = { entered: 0, completed: 0, rate: 0 };
        }
        summary.stepCompletionRates[step].entered++;
      }
      
      if (event.step && event.event === 'step_completed') {
        const step = event.step;
        if (!summary.stepCompletionRates[step]) {
          summary.stepCompletionRates[step] = { entered: 0, completed: 0, rate: 0 };
        }
        summary.stepCompletionRates[step].completed++;
      }
    });
  });

  // Calculate rates
  Object.keys(summary.stepCompletionRates).forEach(step => {
    const stepData = summary.stepCompletionRates[parseInt(step)];
    stepData.rate = stepData.entered > 0 ? (stepData.completed / stepData.entered) * 100 : 0;
  });

  summary.conversionRate = summary.totalSessions > 0 
    ? (summary.completedOnboarding / summary.totalSessions) * 100 
    : 0;

  // Find most common drop-off step
  const dropOffSteps = Object.entries(summary.dropOffByStep);
  if (dropOffSteps.length > 0) {
    const [step] = dropOffSteps.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    summary.mostCommonDropOffStep = parseInt(step);
  }

  return summary;
}
