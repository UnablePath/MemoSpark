export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        // Redirect to login with error
        return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
      }
      
      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (err) {
      console.error('Exception during auth callback:', err);
      // Redirect to login with error
      return NextResponse.redirect(new URL('/login?error=auth_callback_exception', request.url));
    }
  }

  // If no code parameter, redirect to home page
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
