import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
  '/about',
    '/contact',
  '/coming-soon',
  '/offline',
  '/pwa-test',
  '/pwa-debug',
  '/onesignal-test',
  '/api/test-notification',
  '/api/test-manifest',
  '/api/webhooks(.*)',
  '/api/clerk-webhooks',
  '/api/webhook-health',
  '/api/debug-clerk',
  '/OneSignalSDKWorker.js',
    '/sw.js',
  '/manifest',
  '/manifest.json',
  '/favicon.ico',
    '/icon-192x192.png',
    '/icon-256x256.png',
    '/icon-384x384.png',
    '/icon-512x512.png',
  '/browserconfig.xml',
    '/apple-touch-icon.png',
  '/_next(.*)',
  '/public(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 