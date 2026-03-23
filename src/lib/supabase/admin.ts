import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { tryGetSupabaseUrl, tryGetSupabaseServiceRoleKey } from './env';

let _adminClient: SupabaseClient | null = null;

/**
 * Lazy singleton Supabase client with the service role key.
 * Bypasses RLS — only use server-side for admin operations.
 * Returns null when env vars are missing (e.g. during static build).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_adminClient) return _adminClient;

  const url = tryGetSupabaseUrl();
  const key = tryGetSupabaseServiceRoleKey();

  if (!url || !key) return null;

  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _adminClient;
}
