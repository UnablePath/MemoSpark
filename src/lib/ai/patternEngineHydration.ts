'use client';

import { createClient } from '@supabase/supabase-js';
import { patternEngine } from '@/lib/ai/patternEngine';

/**
 * Loads `user_ai_patterns` from Supabase (RLS + Clerk JWT) and syncs the client patternEngine cache.
 * Call after schedule POST success and on session start (see PatternCacheHydration).
 */
export async function hydratePatternEngineCacheForUser(
  userId: string,
  getToken: (opts?: { template?: string }) => Promise<string | null>,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const token = await getToken({ template: 'supabase-integration' });
  if (!token) return;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.from('user_ai_patterns').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return;

  patternEngine.hydrateFromDatabaseRow(userId, data as Record<string, unknown>);
}
