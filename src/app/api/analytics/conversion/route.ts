import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();

    // Validate the event data
    if (!body.event) {
      return NextResponse.json(
        { error: 'Missing event name' },
        { status: 400 }
      );
    }

    // Add server-side metadata
    const conversionEvent = {
      ...body,
      user_id: userId || body.user_data?.user_id || null,
      ip_address: request.ip || null,
      user_agent: request.headers.get('user-agent') || null,
      created_at: new Date().toISOString(),
    };

    // Store in database if available
    if (supabaseServerAdmin) {
      try {
        await supabaseServerAdmin
          .from('conversion_analytics')
          .insert(conversionEvent);
      } catch (dbError) {
        console.warn('Failed to store conversion analytics in database:', dbError);
      }
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Conversion Event:', {
        event: body.event,
        value: body.value,
        stage: body.custom_parameters?.conversion_stage,
        source: body.custom_parameters?.landing_source,
        campaign: body.custom_parameters?.utm_campaign,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversion analytics error:', error);
    // Return success to prevent breaking user flow
    return NextResponse.json({ success: true });
  }
}

// GET endpoint for analytics dashboard
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get conversion data
    const { data: conversions, error } = await supabaseServerAdmin
      .from('conversion_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Process conversion funnel
    const funnel = processConversionFunnel(conversions || []);

    return NextResponse.json({
      success: true,
      data: conversions,
      funnel,
    });
  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversion data' },
      { status: 500 }
    );
  }
}

function processConversionFunnel(conversions: any[]) {
  const funnel = {
    landing_views: 0,
    sign_ups_started: 0,
    sign_ups_completed: 0,
    onboarding_started: 0,
    onboarding_completed: 0,
    first_engagement: 0,
    purchases: 0,
    total_value: 0,
    by_source: {} as Record<string, any>,
    by_campaign: {} as Record<string, any>,
  };

  conversions.forEach(conversion => {
    const source = conversion.custom_parameters?.landing_source || 'direct';
    const campaign = conversion.custom_parameters?.utm_campaign || 'organic';

    // Initialize source/campaign tracking
    if (!funnel.by_source[source]) {
      funnel.by_source[source] = { count: 0, value: 0 };
    }
    if (!funnel.by_campaign[campaign]) {
      funnel.by_campaign[campaign] = { count: 0, value: 0 };
    }

    // Count events
    switch (conversion.event) {
      case 'landing_page_view':
      case 'page_view':
        funnel.landing_views++;
        break;
      case 'sign_up_started':
        funnel.sign_ups_started++;
        break;
      case 'sign_up':
        funnel.sign_ups_completed++;
        break;
      case 'onboarding_started':
        funnel.onboarding_started++;
        break;
      case 'onboarding_completed':
        funnel.onboarding_completed++;
        break;
      case 'first_task_created':
      case 'dashboard_visit':
        funnel.first_engagement++;
        break;
      case 'purchase':
        funnel.purchases++;
        funnel.total_value += conversion.value || 0;
        break;
    }

    // Track by source/campaign
    funnel.by_source[source].count++;
    funnel.by_source[source].value += conversion.value || 0;
    funnel.by_campaign[campaign].count++;
    funnel.by_campaign[campaign].value += conversion.value || 0;
  });

  // Calculate conversion rates
  const rates = {
    landing_to_signup: funnel.landing_views ? 
      ((funnel.sign_ups_completed / funnel.landing_views) * 100).toFixed(2) : '0',
    signup_to_onboarding: funnel.sign_ups_completed ? 
      ((funnel.onboarding_completed / funnel.sign_ups_completed) * 100).toFixed(2) : '0',
    onboarding_to_engagement: funnel.onboarding_completed ? 
      ((funnel.first_engagement / funnel.onboarding_completed) * 100).toFixed(2) : '0',
    overall_conversion: funnel.landing_views ? 
      ((funnel.onboarding_completed / funnel.landing_views) * 100).toFixed(2) : '0',
  };

  return {
    ...funnel,
    conversion_rates: rates,
  };
}
