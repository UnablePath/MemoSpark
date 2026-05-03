import { type SupabaseClient } from '@supabase/supabase-js';
import { supabaseServerAdmin } from './server';

/**
 * Lazy singleton Supabase client with the service role key.
 * Bypasses RLS, only use server-side for admin operations.
 * Delegated to supabaseServerAdmin for infrastructure consistency.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  return supabaseServerAdmin;
}
