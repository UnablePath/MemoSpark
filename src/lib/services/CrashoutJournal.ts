import { SupabaseClient } from '@supabase/supabase-js';

export type MoodType = 'stressed' | 'overwhelmed' | 'frustrated' | 'anxious' | 'sad' | 'exhausted';

export interface JournalEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  mood: MoodType;
  mood_intensity: number;
  tags: string[];
  prompt_id?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WritingPrompt {
  id: string;
  prompt_text: string;
  category: 'stress_relief' | 'academic_pressure' | 'social_anxiety' | 'motivation' | 'self_reflection';
  mood_target: MoodType[];
  is_active: boolean;
  created_at: string;
}

export interface MoodAnalytics {
  mood_distribution: Record<MoodType, number>;
  average_intensity: number;
  total_entries: number;
  streak_info: {
    current_streak: number;
    longest_streak: number;
  };
}

export interface JournalStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_entry_date: string;
  created_at: string;
  updated_at: string;
}

export class CrashoutJournal {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // Entry Management
  async createEntry(
    userId: string,
    content: string,
    mood: MoodType,
    moodIntensity: number = 5,
    title?: string,
    tags: string[] = [],
    promptId?: string
  ): Promise<JournalEntry> {
    const { data, error } = await this.supabase
      .from('private_journal_entries')
      .insert({
        user_id: userId,
        title,
        content,
        mood,
        mood_intensity: moodIntensity,
        tags,
        prompt_id: promptId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create journal entry: ${error.message}`);
    return data;
  }

  async updateEntry(
    entryId: string,
    updates: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>>
  ): Promise<JournalEntry> {
    const { data, error } = await this.supabase
      .from('private_journal_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update journal entry: ${error.message}`);
    return data;
  }

  async deleteEntry(entryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('private_journal_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw new Error(`Failed to delete journal entry: ${error.message}`);
  }

  async getEntry(entryId: string): Promise<JournalEntry | null> {
    const { data, error } = await this.supabase
      .from('private_journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get journal entry: ${error.message}`);
    }
    return data;
  }

  async getUserEntries(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      mood?: MoodType;
      tags?: string[];
      searchTerm?: string;
      sortBy?: 'created_at' | 'updated_at' | 'mood_intensity';
      sortOrder?: 'asc' | 'desc';
      favoritesOnly?: boolean;
    } = {}
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    let query = this.supabase
      .from('private_journal_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (options.mood) {
      query = query.eq('mood', options.mood);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options.searchTerm) {
      query = query.or(`title.ilike.%${options.searchTerm}%,content.ilike.%${options.searchTerm}%`);
    }

    if (options.favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to get user entries: ${error.message}`);
    
    return {
      entries: data || [],
      total: count || 0,
    };
  }

  async toggleFavorite(entryId: string): Promise<JournalEntry> {
    // First get the current state
    const entry = await this.getEntry(entryId);
    if (!entry) throw new Error('Entry not found');

    return this.updateEntry(entryId, { is_favorite: !entry.is_favorite });
  }

  // Writing Prompts
  async getWritingPrompts(mood?: MoodType, category?: string): Promise<WritingPrompt[]> {
    let query = this.supabase
      .from('writing_prompts')
      .select('*')
      .eq('is_active', true);

    if (mood) {
      query = query.contains('mood_target', [mood]);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get writing prompts: ${error.message}`);
    return data || [];
  }

  async getRandomPrompt(mood?: MoodType): Promise<WritingPrompt | null> {
    const prompts = await this.getWritingPrompts(mood);
    if (prompts.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return prompts[randomIndex];
  }

  // Analytics and Insights
  async getMoodInsights(userId: string, days: number = 7): Promise<MoodAnalytics> {
    const { data, error } = await this.supabase
      .rpc('get_mood_insights', {
        p_user_id: userId,
        p_days: days,
      });

    if (error) throw new Error(`Failed to get mood insights: ${error.message}`);
    
    return data || {
      mood_distribution: {},
      average_intensity: 0,
      total_entries: 0,
      streak_info: { current_streak: 0, longest_streak: 0 },
    };
  }

  async getJournalStreak(userId: string): Promise<JournalStreak | null> {
    const { data, error } = await this.supabase
      .from('journal_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get journal streak: ${error.message}`);
    }
    return data;
  }

  // Search and Filtering
  async searchEntries(
    userId: string,
    searchTerm: string,
    filters?: {
      mood?: MoodType;
      tags?: string[];
      dateRange?: { start: string; end: string };
    }
  ): Promise<JournalEntry[]> {
    let query = this.supabase
      .from('private_journal_entries')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);

    if (filters?.mood) {
      query = query.eq('mood', filters.mood);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(`Failed to search entries: ${error.message}`);
    return data || [];
  }

  async getUniqueTagsForUser(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('private_journal_entries')
      .select('tags')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get user tags: ${error.message}`);

    // Extract unique tags from all entries
    const allTags = new Set<string>();
    data?.forEach(entry => {
      entry.tags?.forEach((tag: string) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  // Privacy and Security
  async getEntriesCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('private_journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get entries count: ${error.message}`);
    return count || 0;
  }

  async exportUserData(userId: string): Promise<{
    entries: JournalEntry[];
    analytics: MoodAnalytics;
    streak: JournalStreak | null;
  }> {
    const [entriesResult, analytics, streak] = await Promise.all([
      this.getUserEntries(userId, { limit: 1000 }), // Get all entries (up to 1000)
      this.getMoodInsights(userId, 365), // Get full year analytics
      this.getJournalStreak(userId),
    ]);

    return {
      entries: entriesResult.entries,
      analytics,
      streak,
    };
  }

  async deleteAllUserData(userId: string): Promise<void> {
    // Delete in correct order due to foreign key constraints
    const { error } = await this.supabase
      .from('private_journal_entries')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete user data: ${error.message}`);
  }
} 