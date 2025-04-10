import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { Tables } from './supabase';

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' }) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
};

// Server-side database helpers
export async function getUserProfile(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }

  return data as Tables['users'];
}

export async function getUserTasks(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching user tasks:', error.message);
    return [];
  }

  return data as Tables['tasks'][];
}

export async function getUserSettings(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No settings found, create default settings
      const { data: newSettings, error: insertError } = await supabase
        .from('settings')
        .insert({
          user_id: userId,
          theme: 'light',
          high_contrast: false,
          reduced_motion: false,
          font_size: 'medium',
          notifications: {},
          accessibility: {},
          privacy: {},
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating default settings:', insertError.message);
        return null;
      }

      return newSettings as Tables['settings'];
    }

    console.error('Error fetching user settings:', error.message);
    return null;
  }

  return data as Tables['settings'];
}
