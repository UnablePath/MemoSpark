import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  // Refresh the session if it exists
  await supabase.auth.getSession();

  // Define paths that require authentication
  const protectedPaths = ['/home', '/dashboard', '/settings'];
  const authPaths = ['/login', '/signup'];

  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(prefix => path.startsWith(prefix));
  const isAuthPath = authPaths.some(prefix => path.startsWith(prefix));

  // Get the authentication session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the path requires authentication and the user isn't authenticated,
  // redirect to the login page
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('from', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is already authenticated and trying to access auth pages,
  // redirect them to the home page
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Define which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (/api/*)
     * - Static files (e.g. /favicon.ico, /images/*)
     * - Next.js internals (/_next/*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.svg).*)',
  ],
};
