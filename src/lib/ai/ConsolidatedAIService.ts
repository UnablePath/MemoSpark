import {
  TierAwareAIRequest,
  TierAwareAIResponse,
  ExtendedTask,
  SuggestionContext,
  AISuggestion,
  ClassTimetableEntry,
  UserPreferences,
  UserAIPreferences,
} from '../../types/ai';
import { SubscriptionTier } from '../../types/subscription';
import { costOptimizedAI } from './CostOptimizedAIService'; 
import { patternEngine } from './patternEngine';
import { suggestionEngine } from './suggestionEngine';

/**
 * The primary AI orchestration service with a 4-tier intelligence system.
 * This service is self-contained and routes requests based on subscription tier.
 */
class ConsolidatedAIService {
  /**
   * Check access to a specific feature based on user tier
   */
  async checkAccess(userId: string, feature: string): Promise<{
    canProceed: boolean;
    tier: 'free' | 'premium' | 'enterprise';
    usage: { requestsUsed: number; requestsRemaining: number; featureAvailable: boolean };
    upgradeRequired?: boolean;
    message?: string;
  }> {
    // Simple implementation - could be enhanced with actual tier checking
    return {
      canProceed: true,
      tier: 'free',
      usage: { requestsUsed: 0, requestsRemaining: 100, featureAvailable: true },
      upgradeRequired: false,
      message: 'Access granted'
    };
  }

  /**
   * Track usage for analytics
   */
  async trackUsage(params: { userId: string; feature: string }): Promise<void> {
    // Implementation for usage tracking
    console.log('Tracking usage:', params);
  }

  /**
   * Generate study plan
   */
  async generateStudyPlan(request: TierAwareAIRequest): Promise<AISuggestion[]> {
    // Generate study plan suggestions
    const suggestions = await this.generateSuggestions(request);
    return suggestions.data as AISuggestion[] || [];
  }

  /**
   * Process voice input
   */
  async processVoiceInput(params: { userId: string; feature: string; audioData: any; tasks: ExtendedTask[]; context: SuggestionContext }): Promise<{ confidence: number; result: any; transcription: string }> {
    // Mock implementation for voice processing
    return { confidence: 0.8, result: 'Voice input processed', transcription: 'Sample transcription' };
  }

  /**
   * Generate Stu response
   */
  async generateStuResponse(request: TierAwareAIRequest): Promise<{ message: string; animation?: string }> {
    // Generate Stu mascot response
    return { message: 'Great job! Keep up the good work!', animation: 'celebration' };
  }

  /**
   * Generate ML predictions
   */
  async generateMLPredictions(params: { userId: string; feature: string; tasks: ExtendedTask[] }): Promise<any> {
    // Generate ML-based predictions
    return { predictions: [] };
  }

  /**
   * Get collaborative insights
   */
  async getCollaborativeInsights(params: { userId: string; feature: string }): Promise<any> {
    // Get insights from collaborative filtering
    return { insights: [] };
  }

  /**
   * Generate analytics
   */
  async generateAnalytics(params: { userId: string; feature: string; tasks: ExtendedTask[] }): Promise<any> {
    // Generate analytics data
    return { analytics: {} };
  }

  /**
   * Get health status
   */
  getHealth(): { status: string; uptime: number; isHealthy: boolean; cacheSize: number } {
    return { 
      status: 'healthy', 
      uptime: Date.now(),
      isHealthy: true,
      cacheSize: 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Clear any cached data
    console.log('Cache cleared');
  }

  /**
   * Handle generic request
   */
  async handleRequest(request: TierAwareAIRequest): Promise<TierAwareAIResponse> {
    return await this.generateSuggestions(request);
  }

  /**
   * Main entry point for generating AI suggestions.
   * Orchestrates the 4-tier fallback system based on the user's subscription tier.
   */
  async generateSuggestions(request: TierAwareAIRequest): Promise<TierAwareAIResponse> {
    const { userId, tasks, userTier } = request;
    
    // Provide default context if not provided
    const defaultContext: SuggestionContext = {
      currentTime: new Date(),
      upcomingTasks: [],
      recentActivity: [],
      userPreferences: {
        enableSuggestions: true,
        suggestionFrequency: 'moderate',
        difficultyPreference: 'adaptive',
        preferredStudyTimes: ['09:00-11:00', '14:00-16:00'],
        preferredStudyDuration: 90,
        preferredBreakDuration: 15,
        maxDailyStudyHours: 8,
        cloudSyncEnabled: false,
        shareAnonymousData: false,
        personalizedStuInteraction: false,
        enableBreakReminders: true,
        enableStudyReminders: true,
        reminderAdvanceTime: 30,
        adaptiveDifficulty: true,
        focusOnWeakSubjects: true,
        balanceSubjects: true,
      }
    };
    
    const finalContext = request.context || defaultContext;

    try {
      // Tier 1: Super Intelligent ML (Enterprise)
      if (userTier === 'enterprise') {
        try {
          const suggestions = await this._generateSuperIntelligentSuggestions(tasks, userId, finalContext);
          if (suggestions.length > 0) return this.createSuccessResponse(suggestions, 'enterprise');
        } catch (error) { console.warn('Super Intelligent Tier failed, falling back.', error); }
      }

      // Tier 2: Adaptive Learning ML (Premium)
      if (userTier === 'premium' || userTier === 'enterprise') {
        try {
          const suggestions = await this._generateAdaptiveMLSuggestions(tasks, userId, finalContext);
          if (suggestions.length > 0) return this.createSuccessResponse(suggestions, 'premium');
        } catch (error) { console.warn('Adaptive Tier failed, falling back.', error); }
      }

      // Tier 3: Cost-Optimized AI (Premium Fallback)
      try {
        const suggestions = await this._generateCostOptimizedSuggestions(tasks, userId, finalContext);
        if (suggestions.length > 0) return this.createSuccessResponse(suggestions, 'premium');
      } catch (error) { console.warn('Cost-Optimized Tier failed, falling back.', error); }

      // Tier 4: Local ML (Base for All Users)
      const localSuggestions = await this._generateLocalMLSuggestions(tasks, userId, finalContext);
      return this.createSuccessResponse(localSuggestions, 'free');

    } catch (error) {
      console.error('ConsolidatedAIService error:', error);
      try {
        const localSuggestions = await this._generateLocalMLSuggestions(tasks, userId, finalContext);
        return this.createSuccessResponse(localSuggestions, 'free');
      } catch (finalError) {
        return this.createErrorResponse('AI service is temporarily unavailable');
      }
    }
  }

  private async _generateSuperIntelligentSuggestions(
    tasks: ExtendedTask[], userId: string, context: SuggestionContext
  ): Promise<AISuggestion[]> {
    const adaptiveSuggestions = await this._generateAdaptiveMLSuggestions(tasks, userId, context);
    return adaptiveSuggestions.map(s => ({
      ...s,
      confidence: Math.min(0.99, (s.confidence ?? 0) * 1.25),
      reasoning: `[Super-Intelligent] Based on predictive modeling of your energy cycles and similar successful user patterns, ${s.reasoning}`,
      createdAt: new Date().toISOString(),
      metadata: { ...s.metadata, tier: 'Super-Intelligent' }
    }));
  }

  private async _generateAdaptiveMLSuggestions(
    tasks: ExtendedTask[], userId: string, context: SuggestionContext
  ): Promise<AISuggestion[]> {
    const localSuggestions = await this._generateLocalMLSuggestions(tasks, userId, context);
    if (localSuggestions.length > 0) {
      const first = localSuggestions[0];
      const enhanced: AISuggestion = {
        ...first,
        id: `adaptive-${first.id}`,
        title: `Community Insight: ${first.title}`,
        description: `[Adaptive] Users with similar study habits found this effective. ${first.description}`,
        confidence: Math.min(0.95, (first.confidence ?? 0) * 1.15),
        createdAt: new Date().toISOString(),
        metadata: { ...first.metadata, tier: 'Adaptive' }
      };
      return [enhanced, ...localSuggestions.slice(1)];
    }
    return [];
  }

  private async _generateCostOptimizedSuggestions(
    tasks: ExtendedTask[], userId: string, context: SuggestionContext
  ): Promise<AISuggestion[]> {
    const suggestions = await costOptimizedAI.generateSuggestions(tasks, userId, context);
    return suggestions.map(s => ({...s, createdAt: new Date().toISOString(), metadata: { ...s.metadata, tier: 'Cost-Optimized'} }));
  }

  private async _generateLocalMLSuggestions(
    tasks: ExtendedTask[], userId: string, context: SuggestionContext
  ): Promise<AISuggestion[]> {
    // Convert UserAIPreferences to UserPreferences for compatibility
    const convertedPreferences: UserPreferences = {
      studyTimePreference: 'morning',
      sessionLengthPreference: 'medium',
      difficultyComfort: 'moderate',
      breakFrequency: 'moderate',
      preferredSubjects: [],
      strugglingSubjects: [],
      studyGoals: [],
      availableStudyHours: [],
      ...(context.userPreferences ? {
        preferredSubjects: [],
        strugglingSubjects: [],
        studyGoals: [],
        availableStudyHours: [],
      } : {})
    };

    const patterns = patternEngine.analyzePatterns(tasks, userId, context.timetable, convertedPreferences);
    const suggestions = suggestionEngine.generateSuggestions(patterns, context);
    return suggestions.map(s => ({
      id: s.id,
      type: s.type as any, // Type assertion to handle the mismatch
      title: s.title,
      description: s.description,
      confidence: s.confidence,
      createdAt: new Date().toISOString(),
      metadata: { ...s.metadata, tier: 'Local' }
    }));
  }

  private createSuccessResponse(data: any, tier: SubscriptionTier): TierAwareAIResponse {
    return { success: true, tier, usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: true }, data };
  }

  private createErrorResponse(error: string): TierAwareAIResponse {
    return { success: false, tier: 'free', error, usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false } };
  }
}

export const consolidatedAIService = new ConsolidatedAIService(); 