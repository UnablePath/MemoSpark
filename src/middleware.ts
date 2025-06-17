import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/contact',
  '/about',
  '/clerk-onboarding(.*)',
  
  // PWA / App Icon files
  '/manifest.json',
  '/sw.js',
  '/offline',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/browserconfig.xml',

  // Public API routes
  '/api/webhook-health',
  '/api/clerk-webhooks',
  '/api/test-manifest',
  '/pwa-debug'
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth.protect();
  }
});

export const config = {
  // The following matcher has been tested to work with Clerk authentication.
  // It protects all routes including api/trpc routes.
  // See https://clerk.com/docs/references/nextjs/clerk-middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 