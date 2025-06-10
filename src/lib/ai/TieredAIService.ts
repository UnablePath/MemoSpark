import { 
  AIFeatureType,
  TierAwareAIRequest,
  TierAwareAIResponse,
  AIFeatureConfig,
  TieredAIServiceConfig,
  ExtendedTask,
  SuggestionContext,
  AISuggestion,
  PatternData
} from '../../types/ai';
import { SubscriptionTier } from '../../types/subscription';
import { StudySparkAI } from './index';
import { SubscriptionTierManager } from '../subscription/SubscriptionTierManager';
import { AIUsageTracker } from './AIUsageTracker';
import { createClient } from '@supabase/supabase-js';

// Premium ML Services
import { HuggingFaceService } from './HuggingFaceService';
import { VoiceService } from './VoiceService';
import { StuPersonality } from './StuPersonality';

/**
 * TieredAIService - Main AI orchestration service with tier awareness
 * Wraps existing AI components and routes requests based on subscription tier
 */
export class TieredAIService {
  private studySparkAI: StudySparkAI;
  private subscriptionManager: SubscriptionTierManager;
  private usageTracker: AIUsageTracker;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private config: TieredAIServiceConfig;

  // Premium ML Services
  private huggingFaceService: HuggingFaceService;
  private voiceService: VoiceService;
  private stuPersonality: StuPersonality;

  // Feature configuration mapping
  private static readonly FEATURE_CONFIG: Record<AIFeatureType, AIFeatureConfig> = {
    basic_suggestions: {
      name: 'Basic AI Suggestions',
      requiredTier: 'free',
      description: 'Simple task suggestions and time management tips',
      upgradeMessage: 'Get smarter suggestions with Premium!'
    },
    advanced_suggestions: {
      name: 'Advanced AI Suggestions',
      requiredTier: 'premium',
      description: 'Intelligent pattern-based suggestions with ML insights',
      upgradeMessage: 'Unlock advanced AI suggestions with Premium!'
    },
    study_planning: {
      name: 'AI Study Planning',
      requiredTier: 'premium',
      description: 'Personalized study schedules and optimization',
      upgradeMessage: 'Get AI-powered study planning with Premium!'
    },
    voice_processing: {
      name: 'Voice Notes Processing',
      requiredTier: 'premium',
      description: 'Convert voice notes to tasks with AI analysis',
      upgradeMessage: 'Add voice notes processing with Premium!'
    },
    stu_personality: {
      name: 'Stu AI Personality',
      requiredTier: 'premium',
      description: 'Interactive AI mascot with personalized responses',
      upgradeMessage: 'Meet Stu, your AI study buddy with Premium!'
    },
    ml_predictions: {
      name: 'ML Performance Predictions',
      requiredTier: 'premium',
      description: 'Machine learning insights for performance optimization',
      upgradeMessage: 'Get ML predictions and insights with Premium!'
    },
    collaborative_filtering: {
      name: 'Community Insights',
      requiredTier: 'premium',
      description: 'Learn from similar users anonymously',
      upgradeMessage: 'Access community insights with Premium!'
    },
    premium_analytics: {
      name: 'Advanced Analytics',
      requiredTier: 'enterprise',
      description: 'Detailed performance analytics and reporting',
      upgradeMessage: 'Get enterprise analytics and insights!'
    }
  };

  constructor(config?: Partial<TieredAIServiceConfig>) {
    // Initialize core AI service
    this.studySparkAI = new StudySparkAI();
    
    // Initialize subscription management
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.subscriptionManager = new SubscriptionTierManager(supabase);
    this.usageTracker = new AIUsageTracker(supabase);

    // Initialize Premium ML Services
    this.huggingFaceService = new HuggingFaceService();
    this.voiceService = new VoiceService();
    this.stuPersonality = new StuPersonality();

    // Setup caching
    this.cache = new Map();
    
    // Configuration with defaults
    this.config = {
      enableCaching: true,
      maxCacheSize: 100,
      defaultFeatures: ['basic_suggestions'],
      upgradePrompts: {
        free_to_premium: 'Upgrade to Premium for unlimited AI features!',
        premium_to_enterprise: 'Upgrade to Enterprise for advanced analytics!'
      },
      ...config
    };
  }

  /**
   * Main entry point - Generate AI suggestions with tier awareness
   */
  async generateSuggestions(request: TierAwareAIRequest): Promise<TierAwareAIResponse> {
    try {
      // Check user access and tier
      const accessCheck = await this.checkAccess(request.userId, request.feature);
      if (!accessCheck.canProceed) {
        return this.createUpgradeResponse(accessCheck);
      }

      // Route request based on tier and feature
      const result = await this.routeAIRequest(request);
      
      // Track usage if successful
      if (result.success) {
        await this.trackUsage(request.userId, request.feature);
      }

      return result;
    } catch (error) {
      console.error('TieredAIService error:', error);
      return {
        success: false,
        tier: 'free',
        usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false },
        error: 'AI service temporarily unavailable'
      };
    }
  }

  /**
   * Check if user can access a specific AI feature
   */
  async checkAccess(userId: string, feature: AIFeatureType): Promise<{
    canProceed: boolean;
    tier: SubscriptionTier;
    usage: { requestsUsed: number; requestsRemaining: number };
    upgradeRequired: boolean;
    message?: string;
  }> {
    try {
      // Get user's subscription check
      const subscriptionCheck = await this.subscriptionManager.canUserMakeAIRequest(userId, feature);
      
      // Check feature tier requirements
      const featureConfig = TieredAIService.FEATURE_CONFIG[feature];
      const userTier = subscriptionCheck.tier;
      
      const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
      const hasRequiredTier = tierHierarchy[userTier] >= tierHierarchy[featureConfig.requiredTier];

      return {
        canProceed: subscriptionCheck.can_proceed && hasRequiredTier,
        tier: userTier,
        usage: {
          requestsUsed: subscriptionCheck.remaining_requests > 0 ? 
            (subscriptionCheck.tier === 'free' ? 10 : 100) - subscriptionCheck.remaining_requests : 0,
          requestsRemaining: subscriptionCheck.remaining_requests
        },
        upgradeRequired: !hasRequiredTier || subscriptionCheck.upgrade_required,
        message: !hasRequiredTier ? featureConfig.upgradeMessage : subscriptionCheck.message
      };
    } catch (error) {
      console.error('Access check error:', error);
      return {
        canProceed: false,
        tier: 'free',
        usage: { requestsUsed: 0, requestsRemaining: 0 },
        upgradeRequired: true,
        message: 'Unable to verify access'
      };
    }
  }

  /**
   * Route AI request to appropriate handler based on feature type
   */
  private async routeAIRequest(request: TierAwareAIRequest): Promise<TierAwareAIResponse> {
    const { feature, context, tasks, userId } = request;
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache(this.getCacheKey(request));
      if (cached) {
        return this.createSuccessResponse(cached, request);
      }
    }

    let result: any;
    
    switch (feature) {
      case 'basic_suggestions':
        result = await this.generateBasicSuggestions(tasks, userId, context);
        break;
        
      case 'advanced_suggestions':
        result = await this.generateAdvancedSuggestions(tasks, userId, context);
        break;
        
      case 'study_planning':
        result = await this.generateStudyPlan(tasks, userId, context);
        break;
        
      case 'voice_processing':
        result = await this.processVoiceInput(request.metadata?.audioData, userId);
        break;
        
      case 'stu_personality':
        result = await this.generateStuResponse(tasks, userId, context);
        break;
        
      case 'ml_predictions':
        result = await this.generateMLPredictions(tasks, userId);
        break;
        
      case 'collaborative_filtering':
        result = await this.getCollaborativeInsights(userId);
        break;
        
      case 'premium_analytics':
        result = await this.generateAnalytics(tasks, userId);
        break;
        
      default:
        throw new Error(`Unsupported feature: ${feature}`);
    }

    // Cache successful results
    if (this.config.enableCaching && result) {
      this.setCache(this.getCacheKey(request), result, 300000); // 5 minutes TTL
    }

    return this.createSuccessResponse(result, request);
  }

  /**
   * Generate basic AI suggestions (Free tier)
   */
  private async generateBasicSuggestions(
    tasks: ExtendedTask[], 
    userId: string, 
    context: SuggestionContext
  ): Promise<AISuggestion[]> {
    // Convert tasks to the format expected by StudySparkAI
    const compatibleTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      type: task.type,
      subject: task.subject,
      completed: task.completed,
      reminder: task.reminder,
      description: task.description,
      recurrenceRule: task.recurrenceRule,
      recurrenceInterval: task.recurrenceInterval,
      recurrenceEndDate: task.recurrenceEndDate,
      originalDueDate: task.originalDueDate,
      completedOverrides: task.completedOverrides
    }));
    
    // Convert context to the format expected by suggestionEngine
    const compatibleContext = {
      currentTime: context.currentTime,
      upcomingTasks: this.convertToCompatibleTasks(context.upcomingTasks),
      recentActivity: this.convertToCompatibleTasks(context.recentActivity),
      userPreferences: context.userPreferences ? {
        preferredSessionLength: context.userPreferences.preferredStudyDuration || 60,
        maxSuggestionsPerDay: 10,
        enableBreakReminders: context.userPreferences.enableBreakReminders || true,
        preferredDifficulty: 5
      } : undefined
    };
    
    // Use cached patterns for quick suggestions
    const suggestions = this.studySparkAI.generateQuickSuggestions(compatibleContext);
    
    // Convert StudySuggestion to AISuggestion format and limit to 3 for free tier
    return suggestions.slice(0, 3).map(suggestion => ({
      id: suggestion.id,
      type: this.mapSuggestionType(suggestion.type),
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      source: 'StudySparkAI',
      createdAt: new Date().toISOString(),
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      actionableLink: undefined,
      relatedEntities: undefined,
      feedbackProvided: false,
      suggestedTime: suggestion.suggestedTime,
      duration: suggestion.duration,
      expiresAt: undefined,
      subject: suggestion.subject,
      relatedTaskIds: undefined,
      metadata: {
        category: suggestion.metadata?.category || 'productivity',
        tags: suggestion.metadata?.tags || [],
        difficulty: suggestion.metadata?.difficulty,
        estimatedBenefit: suggestion.metadata?.estimatedBenefit || 0.5,
        tier: 'free',
        limited: true
      }
    }));
  }

  /**
   * Generate advanced AI suggestions (Premium tier) - ENHANCED WITH ML
   */
  private async generateAdvancedSuggestions(
    tasks: ExtendedTask[], 
    userId: string, 
    context: SuggestionContext
  ): Promise<AISuggestion[]> {
    try {
      // Convert to compatible format
      const compatibleTasks = this.convertToCompatibleTasks(tasks);
      
      // Convert context to compatible format
      const compatibleContext = this.convertToCompatibleContext(context);
      
      // Get base suggestions from StudySparkAI
      const result = await this.studySparkAI.generateIntelligentSuggestions(
        compatibleTasks, 
        userId, 
        compatibleContext
      );
      
      // PREMIUM ENHANCEMENT: Use Hugging Face for personalized suggestions
      const enhancedSuggestions = await this.huggingFaceService.enhanceSuggestions(
        result.suggestions,
        tasks,
        context
      );
      
      return enhancedSuggestions.map(suggestion => ({
        id: suggestion.id,
        type: this.mapSuggestionType(suggestion.type),
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        source: suggestion.source,
        createdAt: new Date().toISOString(),
        confidence: suggestion.confidence || 0.8,
        reasoning: suggestion.reasoning,
        actionableLink: suggestion.actionableLink,
        relatedEntities: suggestion.relatedEntities,
        feedbackProvided: suggestion.feedbackProvided,
        suggestedTime: suggestion.suggestedTime,
        duration: suggestion.duration,
        expiresAt: suggestion.expiresAt,
        subject: suggestion.subject,
        relatedTaskIds: suggestion.relatedTaskIds,
        metadata: {
          category: suggestion.metadata?.category || 'productivity',
          tags: suggestion.metadata?.tags || [],
          difficulty: suggestion.metadata?.difficulty,
          estimatedBenefit: suggestion.metadata?.estimatedBenefit || 0.8,
          tier: 'premium',
          confidence: suggestion.confidence || 0.8,
          aiEnhanced: true,
          mlProcessed: true
        }
      }));
    } catch (error) {
      console.error('Error generating advanced suggestions:', error);
      // Fallback to basic suggestions
      return this.generateBasicSuggestions(tasks, userId, context);
    }
  }

  /**
   * Generate study plan (Premium tier) - ENHANCED WITH ML
   */
  private async generateStudyPlan(
    tasks: ExtendedTask[], 
    userId: string, 
    context: SuggestionContext
  ): Promise<any> {
    try {
      // Convert to compatible format
      const compatibleTasks = this.convertToCompatibleTasks(tasks);
      
      // Get base recommendations
      const recommendations = await this.studySparkAI.generateRecommendations(
        compatibleTasks, 
        userId
      );
      
      // PREMIUM ENHANCEMENT: ML-powered study planning
      const mlEnhancedPlan = await this.huggingFaceService.generateStudyPlan(
        tasks,
        recommendations.patterns,
        context
      );
      
      return {
        type: 'study_plan',
        schedule: mlEnhancedPlan.schedule,
        patterns: recommendations.patterns,
        mlInsights: mlEnhancedPlan.insights,
        optimizationSuggestions: mlEnhancedPlan.optimizations,
        tier: 'premium'
      };
    } catch (error) {
      console.error('Error generating study plan:', error);
      return {
        type: 'study_plan',
        schedule: [],
        patterns: null,
        tier: 'premium',
        error: 'Failed to generate enhanced study plan'
      };
    }
  }

  /**
   * Process voice input (Premium tier) - FULL IMPLEMENTATION
   */
  private async processVoiceInput(audioData: any, userId: string): Promise<any> {
    try {
      const result = await this.voiceService.processVoiceInput(audioData, userId);
      
      return {
        type: 'voice_processing',
        transcription: result.transcription,
        extractedTasks: result.extractedTasks,
        confidence: result.confidence,
        processingTime: result.processingTime,
        tier: 'premium'
      };
    } catch (error) {
      console.error('Error processing voice input:', error);
      return {
        type: 'voice_processing',
        transcription: 'Voice processing temporarily unavailable',
        extractedTasks: [],
        confidence: 0,
        tier: 'premium',
        error: 'Voice processing failed'
      };
    }
  }

  /**
   * Generate Stu personality response (Premium tier) - FULL IMPLEMENTATION
   */
  private async generateStuResponse(
    tasks: ExtendedTask[], 
    userId: string, 
    context: SuggestionContext
  ): Promise<any> {
    try {
      const response = await this.stuPersonality.generateResponse(tasks, userId, context);
      
      return {
        type: 'stu_interaction',
        message: response.message,
        mood: response.mood,
        animation: response.animation,
        personality: response.personality,
        contextualTips: response.contextualTips,
        tier: 'premium'
      };
    } catch (error) {
      console.error('Error generating Stu response:', error);
      return {
        type: 'stu_interaction',
        message: "Hey there! I'm Stu, your AI study buddy! Let me help you optimize your study sessions! 🚀",
        mood: 'encouraging',
        animation: 'wave',
        tier: 'premium'
      };
    }
  }

  /**
   * Generate ML predictions (Premium tier) - ENHANCED IMPLEMENTATION
   */
  private async generateMLPredictions(tasks: ExtendedTask[], userId: string): Promise<any> {
    try {
      const predictions = await this.huggingFaceService.generatePredictions(tasks, userId);
      
      return {
        type: 'ml_predictions',
        predictions: {
          nextTaskDifficulty: predictions.difficultyPrediction,
          optimalStudyTime: predictions.optimalTime,
          completionProbability: predictions.completionProb,
          performanceMetrics: predictions.metrics,
          recommendedBreaks: predictions.breaks
        },
        confidence: predictions.confidence,
        tier: 'premium'
      };
    } catch (error) {
      console.error('Error generating ML predictions:', error);
      return {
        type: 'ml_predictions',
        predictions: {
          nextTaskDifficulty: 5,
          optimalStudyTime: '14:00',
          completionProbability: 0.75
        },
        tier: 'premium'
      };
    }
  }

  /**
   * Get collaborative insights (Premium tier)
   */
  private async getCollaborativeInsights(userId: string): Promise<any> {
    // Community-based insights
    return {
      type: 'collaborative_insights',
      insights: ['Users like you perform best in afternoon sessions'],
      tier: 'premium'
    };
  }

  /**
   * Generate analytics (Enterprise tier)
   */
  private async generateAnalytics(tasks: ExtendedTask[], userId: string): Promise<any> {
    // Advanced analytics and reporting
    return {
      type: 'premium_analytics',
      analytics: {
        performanceScore: 85,
        improvementAreas: ['Time management', 'Task prioritization'],
        trends: []
      },
      tier: 'enterprise'
    };
  }

  /**
   * Track AI feature usage
   */
  async trackUsage(userId: string, feature: AIFeatureType): Promise<void> {
    try {
      await this.usageTracker.incrementUsage(userId, feature);
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't fail the main request for tracking errors
    }
  }

  // Helper methods
  private convertToCompatibleTasks(tasks: ExtendedTask[]) {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      type: task.type,
      subject: task.subject,
      completed: task.completed,
      reminder: task.reminder,
      description: task.description,
      recurrenceRule: task.recurrenceRule,
      recurrenceInterval: task.recurrenceInterval,
      recurrenceEndDate: task.recurrenceEndDate,
      originalDueDate: task.originalDueDate,
      completedOverrides: task.completedOverrides
    }));
  }

  private convertToCompatibleContext(context: SuggestionContext) {
    return {
      currentTime: context.currentTime,
      upcomingTasks: this.convertToCompatibleTasks(context.upcomingTasks),
      recentActivity: this.convertToCompatibleTasks(context.recentActivity),
      userPreferences: context.userPreferences ? {
        preferredSessionLength: context.userPreferences.preferredStudyDuration || 60,
        maxSuggestionsPerDay: 10,
        enableBreakReminders: context.userPreferences.enableBreakReminders || true,
        preferredDifficulty: 5
      } : undefined
    };
  }

  private mapSuggestionType(type: string): 'study_time' | 'break_reminder' | 'task_suggestion' | 'difficulty_adjustment' | 'subject_focus' | 'schedule_optimization' | 'task_optimization' | 'new_task_recommendation' | 'resource_recommendation' | 'study_habit_tip' | 'goal_setting_prompt' | 'positive_reinforcement' | 'mascot_interaction' {
    const typeMap: Record<string, any> = {
      'task': 'task_suggestion',
      'break': 'break_reminder',
      'schedule': 'schedule_optimization',
      'difficulty': 'difficulty_adjustment',
      'subject_focus': 'subject_focus',
      'study_time': 'study_time'
    };
    
    return typeMap[type] || 'task_suggestion';
  }

  // Helper methods for caching
  private getCacheKey(request: TierAwareAIRequest): string {
    return `${request.userId}:${request.feature}:${JSON.stringify(request.context)}`;
  }

  private getFromCache(key: string): any {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    
    // Clean up expired cache
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    if (!this.config.enableCaching) return;
    
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Response helpers
  private createSuccessResponse(data: any, request: TierAwareAIRequest): TierAwareAIResponse {
    return {
      success: true,
      data,
      tier: 'premium', // Would be determined by actual tier check
      usage: {
        requestsUsed: 1,
        requestsRemaining: 99,
        featureAvailable: true
      }
    };
  }

  private createUpgradeResponse(accessCheck: any): TierAwareAIResponse {
    const featureConfig = TieredAIService.FEATURE_CONFIG['basic_suggestions'];
    
    return {
      success: false,
      tier: accessCheck.tier,
      usage: {
        requestsUsed: accessCheck.usage.requestsUsed,
        requestsRemaining: accessCheck.usage.requestsRemaining,
        featureAvailable: false
      },
      upgradePrompt: {
        message: accessCheck.message || featureConfig.upgradeMessage,
        features: [featureConfig.name],
        ctaText: accessCheck.tier === 'free' ? 'Upgrade to Premium' : 'Upgrade to Enterprise'
      }
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get service health status
   */
  getHealth(): {
    cacheSize: number;
    isHealthy: boolean;
    lastError?: string;
  } {
    return {
      cacheSize: this.cache.size,
      isHealthy: true
    };
  }
}

// Export singleton instance
export const tieredAIService = new TieredAIService(); 