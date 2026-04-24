/**
 * Safe env var accessors for Supabase configuration.
 * All functions trim whitespace/newlines before returning to guard against
 * shell-piped values being stored with trailing newlines in .env files.
 */

function trimEnv(value: string | undefined): string | undefined {
  return value?.trim();
}

export function getSupabaseUrl(): string {
  const value = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!value) throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!value) throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return value;
}

export function getSupabaseServiceRoleKey(): string {
  const value = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!value) throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');
  return value;
}

export function getSupabaseJwtSecret(): string {
  const value = trimEnv(process.env.SUPABASE_JWT_SECRET);
  if (!value) throw new Error('Missing env var: SUPABASE_JWT_SECRET');
  return value;
}

/** Returns undefined instead of throwing, use where the key is optional. */
export function tryGetSupabaseUrl(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function tryGetSupabaseAnonKey(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function tryGetSupabaseServiceRoleKey(): string | undefined {
  return trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
