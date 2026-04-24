import { auth } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';

/**
 * Supabase client bound to the current Clerk session for API routes / server code.
 * Ensures RLS sees `get_clerk_user_id()` / JWT `sub` from the request, not the anon key.
 */
export async function getSupabaseWithClerkAuth(): Promise<{
  supabase: SupabaseClient | null;
  userId: string | null;
}> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return { supabase: null, userId: null };
  }
  const supabase = createAuthenticatedSupabaseClient(wrapClerkTokenForSupabase(getToken));
  return { supabase, userId };
}
