import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { type NextRequest, NextResponse } from 'next/server'

const isOnboardingRoute = createRouteMatcher(['/clerk-onboarding'])
// Define public routes
const isPublicRoute = createRouteMatcher([
  '/', 
  '/sign-in(.*)', // Match /sign-in and its sub-paths like /sign-in/factor-one
  '/sign-up(.*)', // Match /sign-up and its sub-paths
  '/clerk-onboarding(.*)' // Keep onboarding public
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // For users visiting /clerk-onboarding, check if they've already completed it
  if (userId && isOnboardingRoute(req)) {
    // If user has already completed onboarding, redirect to dashboard
    if (sessionClaims?.metadata?.onboardingComplete) {
      const dashboardUrl = new URL('/dashboard', req.url)
      return NextResponse.redirect(dashboardUrl)
    }
    // If not completed, allow access to onboarding
    return NextResponse.next()
  }

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Catch users who do not have `onboardingComplete: true` in their publicMetadata
  // Redirect them to the /clerk-onboarding route to complete onboarding
  if (userId && !sessionClaims?.metadata?.onboardingComplete) {
    const onboardingUrl = new URL('/clerk-onboarding', req.url)
    return NextResponse.redirect(onboardingUrl)
  }

  // If the user is logged in and the route is protected, let them view.
  if (userId && !isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If it's a public route, let them view
  return NextResponse.next();
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 