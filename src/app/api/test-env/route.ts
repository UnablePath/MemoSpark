import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check for environment variables without exposing their values
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_ONESIGNAL_APP_ID: !!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      ONESIGNAL_REST_API_KEY: !!process.env.ONESIGNAL_REST_API_KEY,
      // Also check for other common variables
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY
    };

    // Count missing variables
    const missingVars = Object.entries(envStatus)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    return NextResponse.json({
      status: 'Environment Variables Check',
      variables: envStatus,
      missing: missingVars,
      missingCount: missingVars.length,
      allSet: missingVars.length === 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 