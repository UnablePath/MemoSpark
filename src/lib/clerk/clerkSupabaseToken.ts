/**
 * Resolves which Clerk JWT to send to Supabase PostgREST.
 *
 * 1) JWT templates (try in order): env override → `supabase-integration` → `supabase`
 *    — `supabase-integration` matches the MemoSpark Clerk dashboard template name.
 * 2) Session token: if templates yield no token, use Clerk's default session JWT.
 *    With Supabase Dashboard → Authentication → Third-Party Auth → Clerk enabled,
 *    session JWTs signed by Clerk JWKS are accepted when claims include `role` / `sub` as per Supabase docs.
 *
 * @see https://supabase.com/docs/guides/auth/third-party/clerk
 */

function orderedJwtTemplateNames(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE?.trim();
  const defaults = ['supabase-integration', 'supabase'];
  const merged = [...(fromEnv ? [fromEnv] : []), ...defaults];
  const seen = new Set<string>();
  return merged.filter((t) => {
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

export async function getClerkSupabaseJwt(
  getToken: (opts?: { template?: string }) => Promise<string | null>
): Promise<string | null> {
  for (const template of orderedJwtTemplateNames()) {
    try {
      const jwt = await getToken({ template });
      if (jwt) return jwt;
    } catch {
      // Template missing or Clerk error — try next name
    }
  }

  // Fallback: session JWT (works when Supabase has Clerk as third-party auth + session claims configured)
  try {
    const sessionJwt = await getToken();
    if (sessionJwt) return sessionJwt;
  } catch {
    // no session
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[MemoSpark] No Clerk JWT for Supabase: check JWT template name (supabase-integration) and Supabase Third-Party Auth → Clerk.'
    );
  }

  return null;
}

/** Wrap Clerk `getToken` so Supabase requests use a JWT PostgREST accepts. */
export function wrapClerkTokenForSupabase(
  getToken: (opts?: { template?: string }) => Promise<string | null>
): () => Promise<string | null> {
  return () => getClerkSupabaseJwt(getToken);
}
