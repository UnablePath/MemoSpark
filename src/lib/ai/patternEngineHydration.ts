'use client';

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
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

  const token = await getToken({ template: 'supabase-integration' });
  if (!token) return;

  const supabase = createAuthenticatedSupabaseClient(() => Promise.resolve(token));
  if (!supabase) return;

  const { data, error } = await supabase.from('user_ai_patterns').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return;

  patternEngine.hydrateFromDatabaseRow(userId, data as Record<string, unknown>);
}
