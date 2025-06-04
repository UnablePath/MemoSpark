import { createClient } from '@supabase/supabase-js';
import type { SupabaseAIConfig } from '@/types/ai';

// Supabase configuration for AI features
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onfnehxkglmvrorcvqcx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Default AI configuration
const DEFAULT_AI_CONFIG: SupabaseAIConfig = {
  enabled: false, // Start disabled by default
  vectorEmbeddingsEnabled: false,
  collaborativeFilteringEnabled: false,
  edgeFunctionsEnabled: false,
  syncFrequency: 'manual',
};

// Create Supabase client only if environment variables are available
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 2, // Rate limit for real-time updates
        },
      },
    })
  : null;

// AI configuration management
class SupabaseAIConfigManager {
  private static readonly CONFIG_KEY = 'memospark_supabase_ai_config';
  private config: SupabaseAIConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get current AI configuration
   */
  getConfig(): SupabaseAIConfig {
    return { ...this.config };
  }

  /**
   * Update AI configuration
   */
  updateConfig(updates: Partial<SupabaseAIConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Enable/disable all AI features
   */
  toggleAI(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      // Disable all sub-features when AI is disabled
      this.config.vectorEmbeddingsEnabled = false;
      this.config.collaborativeFilteringEnabled = false;
      this.config.edgeFunctionsEnabled = false;
    }
    this.saveConfig();
  }

  /**
   * Check if Supabase is available
   */
  isSupabaseAvailable(): boolean {
    return supabase !== null && this.config.enabled;
  }

  /**
   * Check if specific feature is enabled and available
   */
  isFeatureAvailable(feature: keyof Omit<SupabaseAIConfig, 'enabled' | 'syncFrequency'>): boolean {
    return this.isSupabaseAvailable() && this.config[feature];
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): SupabaseAIConfig {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(SupabaseAIConfigManager.CONFIG_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_AI_CONFIG, ...parsed };
        }
      }
    } catch (error) {
      console.warn('Failed to load Supabase AI config:', error);
    }
    return { ...DEFAULT_AI_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SupabaseAIConfigManager.CONFIG_KEY, JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn('Failed to save Supabase AI config:', error);
    }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_AI_CONFIG };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SupabaseAIConfigManager.CONFIG_KEY);
    }
  }
}

// Export singleton instance
export const aiConfigManager = new SupabaseAIConfigManager();

// Helper functions for common operations
export const supabaseHelpers = {
  /**
   * Check if Supabase is properly configured
   */
  isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  },

  /**
   * Get current user ID from Supabase auth
   */
  async getCurrentUserId(): Promise<string | null> {
    if (!supabase) return null;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.warn('Failed to get current user:', error);
      return null;
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
   * Retry operation with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          this.handleError(error, 'retry operation');
          return null;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  },

  /**
   * Test database connection and table availability
   */
  async testConnection(): Promise<{ success: boolean; tables: string[]; error?: string }> {
    if (!supabase) {
      return { success: false, tables: [], error: 'Supabase client not initialized' };
    }

    try {
      // Test basic connectivity by checking auth status
      const { data: { user } } = await supabase.auth.getUser();
      
      // Test AI tables availability
      const aiTables = ['ai_user_profiles', 'ai_pattern_data', 'ai_collaborative_insights', 'ai_embeddings'];
      const availableTables: string[] = [];
      
      for (const table of aiTables) {
        try {
          const { data, error } = await supabase.from(table).select('id').limit(1);
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

// Type definitions for database schema
export interface AIUserProfile {
  id: string;
  user_id: string;
  preferences_vector: number[]; // pgvector for similarity search
  learning_style: string;
  difficulty_preference: number;
  subject_interests: string[];
  created_at: string;
  updated_at: string;
  is_anonymous: boolean; // Privacy control
}

export interface AIPatternData {
  id: string;
  user_id: string;
  pattern_type: 'temporal' | 'difficulty' | 'subject';
  pattern_data: any; // JSON data
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface AICollaborativeInsight {
  id: string;
  insight_type: string;
  insight_data: any;
  relevance_score: number;
  user_cluster?: string; // For grouping similar users
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

// Database table names
export const AI_TABLES = {
  USER_PROFILES: 'ai_user_profiles',
  PATTERN_DATA: 'ai_pattern_data',
  COLLABORATIVE_INSIGHTS: 'ai_collaborative_insights',
  EMBEDDINGS: 'ai_embeddings',
} as const; 