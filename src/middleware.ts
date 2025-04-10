import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// This middleware handles authentication and redirects
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get session from Supabase auth
  const { data: { session } } = await supabase.auth.getSession();

  // Define routes that require authentication
  const protectedRoutes = ['/home', '/settings'];
  const authRoutes = ['/login', '/signup', '/onboarding'];

  // Get the pathname from the request
  const { pathname } = req.nextUrl;

  // Check if it's a protected route and the user is not authenticated
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check if it's an auth route and the user is already authenticated
  if (authRoutes.some(route => pathname.startsWith(route)) && session) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // If we get here, all checks passed and we can continue
  return res;
}

// Define routes where the middleware should run
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
};
