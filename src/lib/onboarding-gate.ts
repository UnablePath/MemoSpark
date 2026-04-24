import { createRouteMatcher } from '@clerk/nextjs/server';

/**
 * True when the user must complete profile onboarding before app shell routes.
 * Uses JWT session claims (Clerk Dashboard must expose publicMetadata → metadata).
 */
export function needsOnboarding(sessionClaims: unknown): boolean {
  const claims = sessionClaims as { metadata?: { onboardingComplete?: boolean } } | null | undefined;
  return claims?.metadata?.onboardingComplete !== true;
}

/**
 * Routes an incomplete user may access (wizard, sync, onboarding analytics).
 * Must stay in sync with middleware and §7.6 of the onboarding plan.
 *
 * **Not allowlisted:** `/questionnaire`, `/dashboard`, `/profile`, etc., incomplete users
 * are redirected to `/onboarding` (or receive 403 JSON for disallowed `/api/*`).
 */
export const isOnboardingFlowAllowedRoute = createRouteMatcher([
  '/onboarding(.*)',
  '/api/sync-profile(.*)',
  '/api/analytics/onboarding(.*)',
]);
