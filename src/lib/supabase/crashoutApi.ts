import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

export const getCrashoutPosts = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const createCrashoutPost = async (post: any) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('crashout_posts')
    .insert([post])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}; 