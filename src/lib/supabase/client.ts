import { createClient } from '@supabase/supabase-js';
import type { SupabaseAIConfig } from '@/types/ai';

// Export all from tasksApi and remindersApi
export * from './tasksApi';
export * from './remindersApi';
export * from './achievementsApi';
export * from './gamificationApi';

// Export createClient for use in other modules
export { createClient };

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

/**
 * Create Supabase client with Clerk integration
 * Uses Clerk session tokens for authentication when available
 */
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Clerk handles session persistence
      autoRefreshToken: false, // Clerk handles token refresh
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`, // Default to anon key
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 2, // Rate limit for real-time updates
      },
    },
  });
}

// Create base Supabase client
export const supabase = createSupabaseClient();

// Cache for authenticated clients to prevent multiple instances
const authenticatedClients = new Map<string, any>();

/**
 * Create authenticated Supabase client using Clerk session tokens
 * Follows official Supabase-Clerk integration pattern with singleton pattern
 */
export function createAuthenticatedSupabaseClient(getToken?: () => Promise<string | null>) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Create a cache key based on the token function
  const cacheKey = getToken?.toString() || 'default';
  
  // Return cached client if exists
  if (authenticatedClients.has(cacheKey)) {
    return authenticatedClients.get(cacheKey);
  }

  // Create new client
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Clerk handles session persistence
      autoRefreshToken: false, // Clerk handles token refresh
    },
    global: {
      // Override fetch to add Authorization header with Clerk token
      fetch: async (url, options = {}) => {
                 const token = getToken ? await getToken() : null;
        
        const headers = new Headers(options.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 2, // Rate limit for real-time updates
      },
    },
  });

  // Cache the client
  authenticatedClients.set(cacheKey, client);
  
  return client;
}

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

// Helper functions for common operations (client-side only)
export const supabaseHelpers = {
  /**
   * Check if Supabase is properly configured
   */
  isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  },

  /**
   * Basic error handling
   */
  handleError(error: any, operation: string): void {
    console.error(`Supabase error during ${operation}:`, error);
    
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Supabase Error: ${operation}`);
      console.error('Error details:', error);
      if (error?.message) console.error('Message:', error.message);
      if (error?.details) console.error('Details:', error.details);
      if (error?.hint) console.error('Hint:', error.hint);
      console.groupEnd();
    }
  },

  /**
   * Retry wrapper for operations
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          this.handleError(error, 'retried operation');
          return null;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  },

  /**
   * Test Supabase connection (client-side check only)
   */
  async testConnection(): Promise<{ success: boolean; tables: string[]; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        tables: [],
        error: 'Supabase client not configured'
      };
    }

    try {
      // Try a simple query to test the connection
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        tables: ['profiles'], // Basic test
        error: undefined
      };
    } catch (error: any) {
      return {
        success: false,
        tables: [],
        error: error?.message || 'Unknown connection error'
      };
    }
  },

  /**
   * Get current user ID from Clerk
   */
  async getCurrentUserId(): Promise<string | null> {
    // This is a placeholder - in the actual implementation this would integrate with Clerk
    // For now, return a mock user ID to prevent errors
    console.warn('getCurrentUserId is a placeholder implementation');
    return 'mock-user-id';
  },

  /**
   * Ensure user exists in the database
   */
  async ensureUserExists(): Promise<void> {
    // This is a placeholder - in the actual implementation this would ensure the user profile exists
    console.warn('ensureUserExists is a placeholder implementation');
    return Promise.resolve();
  },

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(): Promise<any> {
    // This is a placeholder - in the actual implementation this would fetch the user profile
    console.warn('getCurrentUserProfile is a placeholder implementation');
    return {
      id: 'mock-profile-id',
      user_id: 'mock-user-id',
      email: 'mock@example.com'
    };
  }
};

// Type exports for AI features
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

/**
 * React hook to get authenticated Supabase client with Clerk integration
 * 
 * Usage in React components:
 * ```typescript
 * import { useAuth } from '@clerk/nextjs';
 * import { useSupabaseClient } from '@/lib/supabase/client';
 * 
 * function MyComponent() {
 *   const { getToken } = useAuth();
 *   const supabase = useSupabaseClient(getToken);
 *   
 *   // Use supabase client for database operations
 *   const { data, error } = await supabase.from('tasks').select('*');
 * }
 * ```
 */
export function useSupabaseClient(getToken?: () => Promise<string | null>) {
  // Server-side: return base client
  if (typeof window === 'undefined') {
    return supabase;
  }
  
  // Client-side: create authenticated client if getToken is provided
  if (getToken) {
    return createAuthenticatedSupabaseClient(getToken);
  }
  
  // Fallback to base client for non-authenticated operations
  return supabase;
}

// Database table names
export const AI_TABLES = {
  USER_PROFILES: 'ai_user_profiles',
  PATTERN_DATA: 'ai_pattern_data',
  COLLABORATIVE_INSIGHTS: 'ai_collaborative_insights',
  EMBEDDINGS: 'ai_embeddings',
} as const; 