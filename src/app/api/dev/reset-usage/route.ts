import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Development-only endpoint to reset AI usage limits
 * Only works in development mode for security
 */
export async function POST(request: Request) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Service configuration error' 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const today = new Date().toISOString().split('T')[0];

    // Reset usage count to 0 for today
    const { error: resetError } = await supabase
      .from('ai_usage_tracking')
      .upsert({
        clerk_user_id: userId,
        usage_date: today,
        ai_requests_count: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_user_id,usage_date'
      });

    if (resetError) {
      console.error('Failed to reset usage:', resetError);
      return NextResponse.json({ 
        error: 'Failed to reset usage',
        details: resetError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'AI usage reset for today',
      userId: userId,
      resetDate: today
    });

  } catch (error: any) {
    console.error('Reset usage error:', error);
    return NextResponse.json({
      error: 'Failed to reset usage',
      message: error.message
    }, { status: 500 });
  }
} 