import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Supabase configuration for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onfnehxkglmvrorcvqcx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client for server-side operations
export const supabaseServer = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Server doesn't need session persistence
        autoRefreshToken: false,
      },
    })
  : null;

// Server-side helper functions using Clerk auth
export const supabaseServerHelpers = {
  /**
   * Get current user ID from Clerk auth (server-side)
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { userId } = await auth();
      return userId || null;
    } catch (error) {
      console.warn('Failed to get current user from Clerk:', error);
      return null;
    }
  },

  /**
   * Get current user profile from Supabase using Clerk user ID
   */
  async getCurrentUserProfile(): Promise<any | null> {
    if (!supabaseServer) return null;
    
    try {
      const clerkUserId = await this.getCurrentUserId();
      if (!clerkUserId) return null;

      const { data, error } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('User profile not found in Supabase - user may need to complete onboarding');
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.warn('Failed to get current user profile:', error);
      return null;
    }
  },

  /**
   * Ensure user exists in Supabase (create if needed)
   */
  async ensureUserExists(): Promise<boolean> {
    if (!supabaseServer) return false;

    try {
      const profile = await this.getCurrentUserProfile();
      if (profile) return true;

      // User doesn't exist in Supabase, try to create from Clerk data
      const clerkUserId = await this.getCurrentUserId();
      if (!clerkUserId) return false;

      // This is a basic profile creation - the onboarding process will fill in the details
      const { error } = await supabaseServer
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to create user profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      return false;
    }
  },

  /**
   * Handle Supabase errors gracefully
   */
  handleError(error: any, operation: string): void {
    console.error(`Supabase ${operation} error:`, error);
    
    // Check for common Supabase errors
    if (error?.code === 'PGRST301') {
      console.warn('Database table not found - ensure migrations are run');
    } else if (error?.code === '42P01') {
      console.warn('Database table does not exist');
    } else if (error?.message?.includes('JWT')) {
      console.warn('Authentication token issue - user may need to re-login');
    } else if (error?.message?.includes('rate limit')) {
      console.warn('Rate limit exceeded - backing off');
    }
  },

  /**
   * Test database connection and table availability (server-side)
   */
  async testConnection(): Promise<{ success: boolean; tables: string[]; error?: string }> {
    if (!supabaseServer) {
      return { success: false, tables: [], error: 'Supabase server client not initialized' };
    }

    try {
      // Test AI tables availability
      const aiTables = ['ai_user_profiles', 'ai_pattern_data', 'ai_collaborative_insights', 'ai_embeddings'];
      const availableTables: string[] = [];
      
      for (const table of aiTables) {
        try {
          const { data, error } = await supabaseServer.from(table).select('id').limit(1);
          if (!error) {
            availableTables.push(table);
          }
        } catch (tableError) {
          console.warn(`Table ${table} not available:`, tableError);
        }
      }

      return {
        success: true,
        tables: availableTables,
        error: availableTables.length === 0 ? 'AI tables not found - run migrations' : undefined
      };
    } catch (error) {
      return {
        success: false,
        tables: [],
        error: `Connection test failed: ${error}`
      };
    }
  }
}; 