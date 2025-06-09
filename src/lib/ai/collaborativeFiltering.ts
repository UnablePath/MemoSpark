import { supabase, supabaseHelpers, aiConfigManager, AI_TABLES, type AIUserProfile, type AICollaborativeInsight } from '@/lib/supabase/client';
import type { 
  UserAIPreferences, 
  PatternData, 
  CollaborativeInsight, 
  AISuggestion,
  LearningSource 
} from '@/types/ai';

// Interface for similar user data (anonymized)
export interface SimilarUser {
  id: string; // Anonymous user ID
  similarity: number; // 0-1 similarity score
  learningStyle: string;
  successfulSubjects: string[];
  recommendedPatterns: {
    studyTimes: number[];
    sessionLength: number;
    breakFrequency: number;
  };
  anonymizedInsights: string[];
}

// ML input for edge function processing
export interface MLInput {
  userVector: number[];
  contextData: {
    recentTasks: any[];
    currentTime: string;
    preferences: UserAIPreferences;
  };
  requestType: 'similarity' | 'recommendation' | 'prediction';
}

// ML suggestion from edge function
export interface MLSuggestion {
  suggestions: AISuggestion[];
  confidence: number;
  reasoning: string;
  processingTime: number;
}

/**
 * Collaborative Filtering Service for MemoSpark AI
 * Privacy-first implementation with local fallbacks
 */
export class CollaborativeFilteringService {
  private static readonly CACHE_KEY = 'memospark_collaborative_cache';
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SIMILAR_USERS = 10;
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.3;

  private cachedInsights: Map<string, { data: CollaborativeInsight; timestamp: number }> = new Map();

  /**
   * Generate user preference vector for similarity search
   */
  private generateUserVector(preferences: UserAIPreferences, patterns?: PatternData): number[] {
    const vector: number[] = [];

    // Study time preferences (24 dimensions for hours)
    const studyTimeVector = new Array(24).fill(0);
    preferences.preferredStudyTimes.forEach(timeRange => {
      const [start, end] = timeRange.split('-').map(t => Number.parseInt(t.split(':')[0]));
      for (let i = start; i <= end; i++) {
        studyTimeVector[i] = 1;
      }
    });
    vector.push(...studyTimeVector);

    // Learning preferences (6 dimensions)
    vector.push(
      preferences.suggestionFrequency === 'frequent' ? 1 : preferences.suggestionFrequency === 'moderate' ? 0.5 : 0,
      preferences.difficultyPreference === 'challenging' ? 1 : preferences.difficultyPreference === 'adaptive' ? 0.5 : 0,
      preferences.preferredStudyDuration / 120, // Normalize to 0-1 (max 2 hours)
      preferences.preferredBreakDuration / 60, // Normalize to 0-1 (max 1 hour)
      preferences.maxDailyStudyHours / 12, // Normalize to 0-1 (max 12 hours)
      preferences.adaptiveDifficulty ? 1 : 0
    );

    // Pattern-based features (if available)
    if (patterns) {
      vector.push(
        patterns.timePattern.consistencyScore,
        patterns.difficultyProfile.averageTaskDifficulty / 10,
        patterns.dataQuality
      );
    } else {
      vector.push(0.5, 0.5, 0.1); // Default values for new users
    }

    return vector;
  }

  /**
   * Store user embedding for collaborative filtering
   */
  async storeUserEmbedding(
    userId: string, 
    preferences: UserAIPreferences, 
    patterns?: PatternData
  ): Promise<boolean> {
    if (!aiConfigManager.isFeatureAvailable('vectorEmbeddingsEnabled')) {
      console.log('Vector embeddings not enabled, skipping storage');
      return false;
    }

    if (!supabase) {
      console.warn('Supabase not available for embedding storage');
      return false;
    }

    try {
      const userVector = this.generateUserVector(preferences, patterns);
      
      const userProfile: Partial<AIUserProfile> = {
        user_id: userId,
        preferences_vector: userVector,
        learning_style: preferences.difficultyPreference,
        difficulty_preference: preferences.difficultyPreference === 'challenging' ? 8 : 
                               preferences.difficultyPreference === 'adaptive' ? 5 : 3,
        subject_interests: [], // Could be extracted from preferences
        is_anonymous: !preferences.shareAnonymousData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(AI_TABLES.USER_PROFILES)
        .upsert(userProfile, { onConflict: 'user_id' });

      if (error) {
        supabaseHelpers.handleError(error, 'store user embedding');
        return false;
      }

      console.log('User embedding stored successfully');
      return true;
    } catch (error) {
      supabaseHelpers.handleError(error, 'store user embedding');
      return false;
    }
  }

  /**
   * Find similar users using vector similarity search
   */
  async findSimilarUsers(userId: string, preferences: UserAIPreferences): Promise<SimilarUser[]> {
    if (!aiConfigManager.isFeatureAvailable('collaborativeFilteringEnabled')) {
      console.log('Collaborative filtering not enabled, using fallback');
      return this.getFallbackSimilarUsers(preferences);
    }

    if (!supabase) {
      console.warn('Supabase not available, using fallback similar users');
      return this.getFallbackSimilarUsers(preferences);
    }

    try {
      const userVector = this.generateUserVector(preferences);
      
      // Use Supabase edge function for vector similarity search
      const { data: similarUsers, error } = await supabase.rpc('find_similar_users', {
        user_vector: userVector,
        user_id: userId,
        similarity_threshold: CollaborativeFilteringService.MIN_SIMILARITY_THRESHOLD,
        max_results: CollaborativeFilteringService.MAX_SIMILAR_USERS
      });

      if (error) {
        supabaseHelpers.handleError(error, 'find similar users');
        return this.getFallbackSimilarUsers(preferences);
      }

      // Transform database results to SimilarUser format
      return (similarUsers || []).map((user: any) => ({
        id: `anonymous_${user.id.slice(-8)}`, // Anonymize user ID
        similarity: user.similarity,
        learningStyle: user.learning_style,
        successfulSubjects: user.subject_interests || [],
        recommendedPatterns: {
          studyTimes: this.extractStudyTimesFromVector(user.preferences_vector),
          sessionLength: preferences.preferredStudyDuration, // Use similar defaults
          breakFrequency: preferences.preferredBreakDuration,
        },
        anonymizedInsights: [
          `Users with similar patterns study ${user.avg_session_length}min on average`,
          `${Math.round(user.success_rate * 100)}% completion rate in similar subjects`
        ]
      }));
    } catch (error) {
      supabaseHelpers.handleError(error, 'find similar users');
      return this.getFallbackSimilarUsers(preferences);
    }
  }

  /**
   * Extract study times from preference vector
   */
  private extractStudyTimesFromVector(vector: number[]): number[] {
    const studyTimes: number[] = [];
    // First 24 dimensions represent hours of day
    for (let i = 0; i < 24; i++) {
      if (vector[i] > 0.5) {
        studyTimes.push(i);
      }
    }
    return studyTimes.length > 0 ? studyTimes : [9, 14, 19]; // Default fallback
  }

  /**
   * Fallback similar users when Supabase is unavailable
   */
  private getFallbackSimilarUsers(preferences: UserAIPreferences): SimilarUser[] {
    // Generate synthetic similar users based on preferences
    const fallbackUsers: SimilarUser[] = [];

    if (preferences.difficultyPreference === 'challenging') {
      fallbackUsers.push({
        id: 'fallback_advanced_001',
        similarity: 0.8,
        learningStyle: 'challenging',
        successfulSubjects: ['Mathematics', 'Physics', 'Computer Science'],
        recommendedPatterns: {
          studyTimes: [9, 14, 20],
          sessionLength: 90,
          breakFrequency: 15,
        },
        anonymizedInsights: [
          'Advanced learners often study in 90-minute blocks',
          'Success rate improves with difficult material when broken into smaller concepts'
        ]
      });
    }

    if (preferences.difficultyPreference === 'adaptive') {
      fallbackUsers.push({
        id: 'fallback_adaptive_001',
        similarity: 0.7,
        learningStyle: 'adaptive',
        successfulSubjects: ['Business', 'Psychology', 'Literature'],
        recommendedPatterns: {
          studyTimes: [10, 15, 19],
          sessionLength: 60,
          breakFrequency: 10,
        },
        anonymizedInsights: [
          'Adaptive learners benefit from varied study schedules',
          'Mixing subjects in study sessions improves retention'
        ]
      });
    }

    fallbackUsers.push({
      id: 'fallback_general_001',
      similarity: 0.6,
      learningStyle: 'comfortable',
      successfulSubjects: ['General Studies'],
      recommendedPatterns: {
        studyTimes: preferences.preferredStudyTimes.map(t => Number.parseInt(t.split(':')[0])),
        sessionLength: preferences.preferredStudyDuration,
        breakFrequency: preferences.preferredBreakDuration,
      },
      anonymizedInsights: [
        'Consistent study times lead to better habit formation',
        'Regular breaks prevent mental fatigue'
      ]
    });

    return fallbackUsers.slice(0, 3); // Return top 3 fallback users
  }

  /**
   * Invoke ML edge function for advanced recommendations
   */
  async invokeMLEdgeFunction(input: MLInput): Promise<MLSuggestion | null> {
    if (!aiConfigManager.isFeatureAvailable('edgeFunctionsEnabled')) {
      console.log('Edge functions not enabled, skipping ML inference');
      return null;
    }

    if (!supabase) {
      console.warn('Supabase not available for ML edge function');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ml-inference', {
        body: input,
      });

      if (error) {
        supabaseHelpers.handleError(error, 'ML edge function');
        return null;
      }

      return data as MLSuggestion;
    } catch (error) {
      supabaseHelpers.handleError(error, 'ML edge function');
      return null;
    }
  }

  /**
   * Sync user patterns to Supabase
   */
  async syncUserPatterns(userId: string, patterns: PatternData): Promise<boolean> {
    if (!aiConfigManager.isSupabaseAvailable()) {
      console.log('Supabase sync not available');
      return false;
    }

    if (!supabase) return false;

    try {
      const patternEntries = [
        {
          user_id: userId,
          pattern_type: 'temporal' as const,
          pattern_data: patterns.timePattern,
          confidence_score: patterns.timePattern.consistencyScore,
          updated_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          pattern_type: 'difficulty' as const,
          pattern_data: patterns.difficultyProfile,
          confidence_score: patterns.dataQuality,
          updated_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          pattern_type: 'subject' as const,
          pattern_data: patterns.subjectInsights,
          confidence_score: patterns.dataQuality,
          updated_at: new Date().toISOString(),
        }
      ];

      for (const entry of patternEntries) {
        const { error } = await supabase
          .from(AI_TABLES.PATTERN_DATA)
          .upsert(entry, { onConflict: 'user_id,pattern_type' });

        if (error) {
          supabaseHelpers.handleError(error, `sync ${entry.pattern_type} pattern`);
          return false;
        }
      }

      console.log('User patterns synced successfully');
      return true;
    } catch (error) {
      supabaseHelpers.handleError(error, 'sync user patterns');
      return false;
    }
  }

  /**
   * Get collaborative insights with caching
   */
  async getCollaborativeInsights(userId: string): Promise<CollaborativeInsight[]> {
    const cacheKey = `insights_${userId}`;
    const cached = this.cachedInsights.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CollaborativeFilteringService.CACHE_DURATION) {
      return [cached.data];
    }

    if (!aiConfigManager.isFeatureAvailable('collaborativeFilteringEnabled') || !supabase) {
      return this.getFallbackInsights();
    }

    try {
      const { data: insights, error } = await supabase
        .from(AI_TABLES.COLLABORATIVE_INSIGHTS)
        .select('*')
        .gte('relevance_score', 0.5)
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (error) {
        supabaseHelpers.handleError(error, 'get collaborative insights');
        return this.getFallbackInsights();
      }

      const transformedInsights: CollaborativeInsight[] = (insights || []).map(insight => ({
        id: insight.id,
        type: insight.insight_type as any,
        data: insight.insight_data,
        confidence: insight.relevance_score,
        relevanceScore: insight.relevance_score,
        createdAt: insight.created_at,
        expiresAt: insight.expires_at,
      }));

      // Cache the first insight
      if (transformedInsights.length > 0) {
        this.cachedInsights.set(cacheKey, {
          data: transformedInsights[0],
          timestamp: Date.now()
        });
      }

      return transformedInsights;
    } catch (error) {
      supabaseHelpers.handleError(error, 'get collaborative insights');
      return this.getFallbackInsights();
    }
  }

  /**
   * Fallback insights when Supabase is unavailable
   */
  private getFallbackInsights(): CollaborativeInsight[] {
    return [
      {
        id: 'fallback_insight_001',
        type: 'optimal_schedules',
        data: {
          recommendedTimes: ['09:00-11:00', '14:00-16:00'],
          avgSessionLength: 75,
          successRate: 0.82
        },
        confidence: 0.7,
        relevanceScore: 0.7,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'fallback_insight_002',
        type: 'difficulty_progression',
        data: {
          optimalProgression: 'Start with easier tasks, gradually increase difficulty',
          recommendedSteps: [3, 4, 5, 6, 7],
          successPattern: 'steady_increase'
        },
        confidence: 0.6,
        relevanceScore: 0.6,
        createdAt: new Date().toISOString(),
      }
    ];
  }

  /**
   * Clear cached insights
   */
  clearCache(): void {
    this.cachedInsights.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CollaborativeFilteringService.CACHE_KEY);
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    supabaseAvailable: boolean;
    vectorEmbeddings: boolean;
    collaborativeFiltering: boolean;
    edgeFunctions: boolean;
    cacheSize: number;
  } {
    return {
      supabaseAvailable: aiConfigManager.isSupabaseAvailable(),
      vectorEmbeddings: aiConfigManager.isFeatureAvailable('vectorEmbeddingsEnabled'),
      collaborativeFiltering: aiConfigManager.isFeatureAvailable('collaborativeFilteringEnabled'),
      edgeFunctions: aiConfigManager.isFeatureAvailable('edgeFunctionsEnabled'),
      cacheSize: this.cachedInsights.size,
    };
  }
}

// Export singleton instance
export const collaborativeFilteringService = new CollaborativeFilteringService(); 