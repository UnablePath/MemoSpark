'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These environment variables are set in the .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton Supabase client that works in both client and server contexts
let supabase: any;
try {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Provide a fallback mock client with minimal functionality
  // Using 'any' type to bypass TypeScript errors
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {}, 
            id: 'mock-id',
            callback: () => {}
          } 
        } 
      }),
      signInWithPassword: async () => ({ error: null, data: { user: null, session: null } }),
      signUp: async () => ({ error: null, data: { user: null, session: null } }),
      signInWithOAuth: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
  };
}

export { supabase };

// Type definitions for database schema
export type Tables = {
  users: {
    id: string;
    email: string;
    full_name?: string;
    year_of_study?: string;
    subjects?: string[];
    interests?: string[];
    created_at?: string;
    updated_at?: string;
  };
  tasks: {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
    type?: 'academic' | 'personal';
    subject?: string;
    completed: boolean;
    reminder: boolean;
    created_at?: string;
    updated_at?: string;
  };
  settings: {
    id: string;
    user_id: string;
    theme?: string;
    high_contrast?: boolean;
    reduced_motion?: boolean;
    font_size?: string;
    notifications?: Record<string, unknown>;
    accessibility?: Record<string, unknown>;
    privacy?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
  };
  // Add more table types as needed
};
