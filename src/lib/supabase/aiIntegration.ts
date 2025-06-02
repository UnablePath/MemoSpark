import { supabase, supabaseHelpers, aiConfigManager, AI_TABLES } from './client';
import { collaborativeFilteringService, type SimilarUser, type MLInput, type MLSuggestion } from '@/lib/ai/collaborativeFiltering';
import { patternEngine, type UserPreferences } from '@/lib/ai/patternEngine';
import type { 
  UserAIPreferences, 
  PatternData, 
  AISuggestion, 
  CollaborativeInsight,
  SupabaseAIConfig,
  AIError,
  AIPerformanceMetrics 
} from '@/types/ai';

/**
 * Main Supabase AI Integration Service
 * Coordinates all AI features with privacy-first design and offline fallbacks
 */
export class SupabaseAIService {
  private static instance: SupabaseAIService;
  private isInitialized = false;
  private performanceMetrics: AIPerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 100;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SupabaseAIService {
    if (!SupabaseAIService.instance) {
      SupabaseAIService.instance = new SupabaseAIService();
    }
    return SupabaseAIService.instance;
  }

  /**
   * Initialize the AI service
   */
  async initialize(userId?: string): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const startTime = Date.now();

      // Check if Supabase is configured
      if (!supabaseHelpers.isConfigured()) {
        console.warn('Supabase not configured - AI service running in offline mode');
        this.isInitialized = true;
        return true;
      }

      // Test connection if Supabase is available
      if (supabase && aiConfigManager.isSupabaseAvailable()) {
        try {
          // Simple health check
          const { error } = await supabase.from('health_check').select('*').limit(1);
          if (error && !error.message.includes('does not exist')) {
            throw error;
          }
        } catch (error) {
          console.warn('Supabase connection test failed, continuing in offline mode:', error);
        }
      }

      this.recordPerformanceMetric({
        responseTime: Date.now() - startTime,
        memoryUsage: 0, // Would need performance API in real implementation
        suggestionGenerationTime: 0,
        patternAnalysisTime: 0,
        lastMeasurement: new Date().toISOString()
      });

      this.isInitialized = true;
      console.log('SupabaseAIService initialized successfully');
      return true;
    } catch (error) {
      this.handleError(error, 'initialize AI service');
      this.isInitialized = true; // Continue in offline mode
      return false;
    }
  }

  /**
   * Store user embedding for collaborative filtering
   */
  async storeUserEmbedding(
    userId: string, 
    preferences: UserAIPreferences, 
    patterns?: PatternData
  ): Promise<boolean> {
    if (!await this.ensureInitialized()) return false;

    try {
      const startTime = Date.now();
      
      const success = await collaborativeFilteringService.storeUserEmbedding(
        userId, 
        preferences, 
        patterns
      );

      this.recordPerformanceMetric({
        responseTime: Date.now() - startTime,
        memoryUsage: 0,
        suggestionGenerationTime: 0,
        patternAnalysisTime: 0,
        lastMeasurement: new Date().toISOString()
      });

      return success;
    } catch (error) {
      this.handleError(error, 'store user embedding');
      return false;
    }
  }

  /**
   * Find similar users using vector similarity search
   */
  async findSimilarUsers(userId: string, preferences: UserAIPreferences): Promise<SimilarUser[]> {
    if (!await this.ensureInitialized()) return [];

    try {
      return await collaborativeFilteringService.findSimilarUsers(userId, preferences);
    } catch (error) {
      this.handleError(error, 'find similar users');
      return [];
    }
  }

  /**
   * Invoke ML edge function for advanced inference
   */
  async invokeMLEdgeFunction(input: MLInput): Promise<MLSuggestion | null> {
    if (!await this.ensureInitialized()) return null;

    try {
      const startTime = Date.now();
      
      const result = await collaborativeFilteringService.invokeMLEdgeFunction(input);
      
      if (result) {
        this.recordPerformanceMetric({
          responseTime: Date.now() - startTime,
          memoryUsage: 0,
          suggestionGenerationTime: result.processingTime,
          patternAnalysisTime: 0,
          lastMeasurement: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      this.handleError(error, 'ML edge function');
      return null;
    }
  }

  /**
   * Sync user patterns to Supabase with conflict resolution
   */
  async syncUserPatterns(userId: string, patterns: PatternData): Promise<boolean> {
    if (!await this.ensureInitialized()) return false;

    try {
      const startTime = Date.now();
      
      // Check sync frequency setting
      const config = aiConfigManager.getConfig();
      if (config.syncFrequency === 'manual') {
        console.log('Manual sync mode - patterns not synced automatically');
        return false;
      }

      const success = await collaborativeFilteringService.syncUserPatterns(userId, patterns);
      
      this.recordPerformanceMetric({
        responseTime: Date.now() - startTime,
        memoryUsage: 0,
        suggestionGenerationTime: 0,
        patternAnalysisTime: Date.now() - startTime,
        lastMeasurement: new Date().toISOString()
      });

      return success;
    } catch (error) {
      this.handleError(error, 'sync user patterns');
      return false;
    }
  }

  /**
   * Get comprehensive AI suggestions combining multiple sources
   */
  async getAISuggestions(
    userId: string,
    preferences: UserAIPreferences,
    recentTasks: any[],
    patterns?: PatternData
  ): Promise<AISuggestion[]> {
    if (!await this.ensureInitialized()) return [];

    try {
      const startTime = Date.now();
      const suggestions: AISuggestion[] = [];

      // 1. Get collaborative insights
      const collaborativeInsights = await collaborativeFilteringService.getCollaborativeInsights(userId);
      
      // Convert collaborative insights to suggestions
      collaborativeInsights.forEach(insight => {
        if (insight.type === 'optimal_schedules') {
          suggestions.push({
            id: `collab_${insight.id}`,
            type: 'schedule_optimization',
            title: 'Optimize Your Study Schedule',
            description: 'Based on successful patterns from similar learners',
            priority: 'medium',
            confidence: insight.confidence,
            reasoning: 'Collaborative filtering from similar learning patterns',
            metadata: {
              category: 'productivity',
              tags: ['collaborative', 'schedule'],
              estimatedBenefit: insight.relevanceScore,
              requiredAction: 'optional'
            },
            createdAt: insight.createdAt,
            acceptanceStatus: 'pending'
          });
        }
      });

      // 2. Get ML-powered suggestions if edge functions are enabled
      if (aiConfigManager.isFeatureAvailable('edgeFunctionsEnabled')) {
        try {
          const mlInput: MLInput = {
            userVector: collaborativeFilteringService['generateUserVector'](preferences, patterns),
            contextData: {
              recentTasks,
              currentTime: new Date().toISOString(),
              preferences
            },
            requestType: 'recommendation'
          };

          const mlSuggestions = await this.invokeMLEdgeFunction(mlInput);
          if (mlSuggestions) {
            suggestions.push(...mlSuggestions.suggestions);
          }
        } catch (error) {
          console.warn('ML suggestions failed, continuing with other sources:', error);
        }
      }

      // 3. Get pattern-based suggestions from local analysis
      if (patterns) {
        const patternSuggestions = this.generatePatternBasedSuggestions(patterns, preferences);
        suggestions.push(...patternSuggestions);
      }

      // 4. Generate fallback suggestions for new users
      if (suggestions.length === 0) {
        const fallbackSuggestions = this.generateFallbackSuggestions(preferences);
        suggestions.push(...fallbackSuggestions);
      }

      // Sort by priority and confidence
      const sortedSuggestions = suggestions
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 } as const;
          
          const priorityA = a.priority && (a.priority in priorityOrder) ? a.priority : 'medium';
          const priorityB = b.priority && (b.priority in priorityOrder) ? b.priority : 'medium';
          const priorityDiff = priorityOrder[priorityB] - priorityOrder[priorityA];
          
          const confidenceA = typeof a.confidence === 'number' ? a.confidence : 0;
          const confidenceB = typeof b.confidence === 'number' ? b.confidence : 0;
          
          return priorityDiff !== 0 ? priorityDiff : confidenceB - confidenceA;
        })
        .slice(0, 5); // Limit to top 5 suggestions

      this.recordPerformanceMetric({
        responseTime: Date.now() - startTime,
        memoryUsage: 0,
        suggestionGenerationTime: Date.now() - startTime,
        patternAnalysisTime: 0,
        lastMeasurement: new Date().toISOString()
      });

      return sortedSuggestions;
    } catch (error) {
      this.handleError(error, 'get AI suggestions');
      return [];
    }
  }

  /**
   * Generate pattern-based suggestions from local analysis
   */
  private generatePatternBasedSuggestions(
    patterns: PatternData, 
    preferences: UserAIPreferences
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const currentHour = new Date().getHours();

    // Optimal study time suggestion
    if (patterns.timePattern.mostProductiveHours.includes(currentHour)) {
      suggestions.push({
        id: `pattern_time_${Date.now()}`,
        type: 'study_time',
        title: 'Prime Study Time',
        description: 'Your productivity patterns suggest this is an optimal time to study',
        priority: 'high',
        confidence: patterns.timePattern.consistencyScore,
        reasoning: 'Based on your historical productivity patterns',
        suggestedTime: new Date().toISOString(),
        duration: patterns.timePattern.preferredStudyDuration,
        metadata: {
          category: 'productivity',
          tags: ['optimal-timing', 'patterns'],
          estimatedBenefit: patterns.timePattern.consistencyScore,
          requiredAction: 'immediate'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    // Subject focus suggestion based on insights
    if (patterns.subjectInsights.strugglingSubjects.length > 0) {
      const strugglingSubject = patterns.subjectInsights.strugglingSubjects[0];
      suggestions.push({
        id: `pattern_subject_${Date.now()}`,
        type: 'subject_focus',
        title: `Focus on ${strugglingSubject}`,
        description: 'Spend extra time on this subject to improve your overall performance',
        priority: 'medium',
        confidence: patterns.dataQuality,
        reasoning: 'Analysis shows lower performance in this subject area',
        subject: strugglingSubject,
        metadata: {
          category: 'academic',
          tags: ['subject-improvement', 'patterns'],
          estimatedBenefit: 0.7,
          requiredAction: 'scheduled'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    return suggestions;
  }

  /**
   * Generate fallback suggestions for new users
   */
  private generateFallbackSuggestions(preferences: UserAIPreferences): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const currentHour = new Date().getHours();

    // Study session suggestion based on preferences
    const preferredTimes = preferences.preferredStudyTimes[0]?.split('-') || ['09:00', '11:00'];
    const preferredStartHour = Number.parseInt(preferredTimes[0].split(':')[0]);

    if (Math.abs(currentHour - preferredStartHour) <= 1) {
      suggestions.push({
        id: `fallback_study_${Date.now()}`,
        type: 'study_time',
        title: 'Start Your Study Session',
        description: 'Based on your preferences, now is a good time to begin studying',
        priority: 'medium',
        confidence: 0.6,
        reasoning: 'Aligned with your preferred study times',
        duration: preferences.preferredStudyDuration,
        metadata: {
          category: 'productivity',
          tags: ['preferences', 'timing'],
          estimatedBenefit: 0.6,
          requiredAction: 'optional'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    // Break reminder if it's been a while
    if (currentHour >= 14 && currentHour <= 16) {
      suggestions.push({
        id: `fallback_break_${Date.now()}`,
        type: 'break_reminder',
        title: 'Take a Refreshing Break',
        description: 'A short break can help maintain your focus and energy',
        priority: 'low',
        confidence: 0.5,
        reasoning: 'Regular breaks improve sustained performance',
        duration: preferences.preferredBreakDuration,
        metadata: {
          category: 'wellness',
          tags: ['break', 'wellness'],
          estimatedBenefit: 0.5,
          requiredAction: 'optional'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    return suggestions;
  }

  /**
   * Get service health and configuration status
   */
  getServiceHealth(): {
    isInitialized: boolean;
    supabaseAvailable: boolean;
    config: SupabaseAIConfig;
    collaborativeFilteringStatus: any;
    recentPerformance: AIPerformanceMetrics | null;
  } {
    return {
      isInitialized: this.isInitialized,
      supabaseAvailable: aiConfigManager.isSupabaseAvailable(),
      config: aiConfigManager.getConfig(),
      collaborativeFilteringStatus: collaborativeFilteringService.getHealthStatus(),
      recentPerformance: this.performanceMetrics[this.performanceMetrics.length - 1] || null
    };
  }

  /**
   * Update AI configuration
   */
  updateConfig(updates: Partial<SupabaseAIConfig>): void {
    aiConfigManager.updateConfig(updates);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    collaborativeFilteringService.clearCache();
    this.performanceMetrics = [];
  }

  /**
   * Export anonymized data for backup/migration
   */
  async exportData(userId: string): Promise<any> {
    try {
      const patterns = patternEngine.getCachedPatterns();
      const config = aiConfigManager.getConfig();
      
      return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId: userId.slice(-8), // Only last 8 characters for privacy
        patterns: patterns ? {
          timePattern: patterns.timePattern,
          difficultyProfile: {
            averageTaskDifficulty: patterns.difficultyProfile.averageTaskDifficulty,
            difficultyTrend: patterns.difficultyProfile.difficultyTrend,
            subjectDifficultyMap: patterns.difficultyProfile.subjectDifficultyMap,
            adaptationRate: patterns.difficultyProfile.adaptationRate
          },
          subjectInsights: {
            preferredSubjects: patterns.subjectInsights.preferredSubjects,
            strugglingSubjects: patterns.subjectInsights.strugglingSubjects
          }
        } : null,
        config,
        performanceMetrics: this.performanceMetrics.slice(-10) // Last 10 metrics
      };
    } catch (error) {
      this.handleError(error, 'export data');
      return null;
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (!this.isInitialized) {
      return await this.initialize();
    }
    return true;
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetric(metric: AIPerformanceMetrics): void {
    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > SupabaseAIService.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(-SupabaseAIService.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Handle errors with proper logging and user feedback
   */
  private handleError(error: any, operation: string): void {
    const aiError: AIError = {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      context: { operation },
      userMessage: 'AI features temporarily unavailable, using offline mode'
    };

    console.error('SupabaseAIService error:', aiError);
    
    // Could emit events here for UI error handling
    // eventEmitter.emit('ai-error', aiError);
  }
}

// Export singleton instance
export const supabaseAIService = SupabaseAIService.getInstance(); 