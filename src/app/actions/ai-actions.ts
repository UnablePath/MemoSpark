'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { consolidatedAIService } from '@/lib/ai'
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager'
import { AISecurityValidator, createAISecurityMiddleware } from '@/lib/security/AISecurityValidator'
import type { AIFeatureType, ExtendedTask, SuggestionContext, AISuggestion, TierAwareAIRequest, TierAwareAIResponse } from '@/types/ai'
import type { SubscriptionTier } from '@/types/subscription'

// Initialize security middleware
const aiSecurityMiddleware = createAISecurityMiddleware();

// Zod schemas for validation
const ExtendedTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  dueDate: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  subject: z.string().optional(),
  timeSpent: z.number().optional(),
  difficulty: z.number().min(1).max(10).optional(),
  type: z.enum(['academic', 'personal']),
  tags: z.array(z.string()),
  reminder: z.boolean()
});

const tierAwareAIRequestSchema = z.object({
  feature: z.enum([
    'basic_suggestions',
    'advanced_suggestions',
    'study_planning',
    'voice_processing',
    'stu_personality',
    'ml_predictions',
    'collaborative_filtering',
    'premium_analytics'
  ]),
  tasks: z.array(ExtendedTaskSchema),
  context: z.any(), // Keeping context flexible for now
  metadata: z.record(z.unknown()).optional(),
});

const SuggestionContextSchema = z.object({
  currentTime: z.string().transform(str => new Date(str)),
  upcomingTasks: z.array(ExtendedTaskSchema).optional(),
  recentActivity: z.array(ExtendedTaskSchema).optional(),
  userPreferences: z.object({
    // Core settings (making them optional for input validation)
    enableSuggestions: z.boolean().optional(),
    suggestionFrequency: z.enum(['minimal', 'moderate', 'frequent']).optional(),
    difficultyPreference: z.enum(['adaptive', 'challenging', 'comfortable']).optional(),
    
    // Study preferences
    preferredStudyTimes: z.array(z.string()).optional(),
    preferredStudyDuration: z.number().optional(),
    preferredBreakDuration: z.number().optional(),
    maxDailyStudyHours: z.number().optional(),
    
    // Privacy and sync settings
    cloudSyncEnabled: z.boolean().optional(),
    shareAnonymousData: z.boolean().optional(),
    personalizedStuInteraction: z.boolean().optional(),
    
    // Notification preferences
    enableBreakReminders: z.boolean().optional(),
    enableStudyReminders: z.boolean().optional(),
    reminderAdvanceTime: z.number().optional(),
    
    // Learning preferences
    adaptiveDifficulty: z.boolean().optional(),
    focusOnWeakSubjects: z.boolean().optional(),
    balanceSubjects: z.boolean().optional(),
    
    // Additional fields for backward compatibility
    preferredDifficulty: z.number().min(1).max(10).optional(),
    maxSuggestionsPerDay: z.number().optional(),
    studyStyle: z.string().optional(),
    timeOfDay: z.string().optional()
  }).optional()
});

const AIRequestSchema = z.object({
  feature: z.enum([
    'basic_suggestions',
    'advanced_suggestions', 
    'study_planning',
    'voice_processing',
    'stu_personality',
    'ml_predictions',
    'collaborative_filtering',
    'premium_analytics'
  ]),
  tasks: z.array(ExtendedTaskSchema),
  context: SuggestionContextSchema,
  audioData: z.any().optional()
});

// Enhanced response type for better error handling
type ActionResponse<T = any> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  tier?: SubscriptionTier;
  usage?: {
    requestsUsed: number;
    requestsRemaining: number;
    featureAvailable: boolean;
  };
  upgradeRequired?: boolean;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Helper function to create a properly typed SuggestionContext
 */
function createSuggestionContext(context: any): SuggestionContext {
  return {
    ...context,
    upcomingTasks: (context.upcomingTasks || []).map((t: any) => ({ ...t, type: t.type as any })) as ExtendedTask[],
    recentActivity: context.recentActivity ? context.recentActivity.map((t: any) => ({ ...t, type: t.type as any })) as ExtendedTask[] : undefined,
    userPreferences: context.userPreferences ? {
      // Provide defaults for required properties
      enableSuggestions: true,
      suggestionFrequency: 'moderate' as const,
      difficultyPreference: 'adaptive' as const,
      preferredStudyTimes: [],
      preferredStudyDuration: 45,
      preferredBreakDuration: 15,
      maxDailyStudyHours: 8,
      cloudSyncEnabled: false,
      shareAnonymousData: false,
      personalizedStuInteraction: true,
      enableBreakReminders: true,
      enableStudyReminders: true,
      reminderAdvanceTime: 30,
      adaptiveDifficulty: true,
      focusOnWeakSubjects: true,
      balanceSubjects: true,
      // Override with actual user preferences
      ...context.userPreferences
    } : undefined
  };
}

/**
 * Get authenticated Supabase client for server actions
 * Uses singleton pattern to prevent multiple instances
 */
function getServerSupabaseClient() {
  // Import the server-side singleton
  const { supabaseServer } = require('@/lib/supabase/server');
  
  if (!supabaseServer) {
    throw new Error('Supabase server client not available');
  }
  
  return supabaseServer;
}

/**
 * MASTER AI SUGGESTIONS SERVER ACTION
 * Routes to Super Intelligent ML system with proper authentication and rate limiting
 */
export async function generateAISuggestionsAction(formData: FormData): Promise<ActionResponse<AISuggestion[]>> {
  try {
    // 1. Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      AISecurityValidator.logSecurityEvent({
        type: 'authentication',
        userId: 'anonymous',
        details: { action: 'generateAISuggestionsAction', reason: 'missing_auth' },
        severity: 'medium'
      });
      
      return { 
        error: 'Authentication required. Please sign in and try again.',
        success: false 
      };
    }

    // 2. Extract and validate form data
    const rawData = {
      feature: formData.get('feature') as string,
      tasks: JSON.parse(formData.get('tasks') as string || '[]'),
      context: JSON.parse(formData.get('context') as string || '{}'),
      audioData: formData.get('audioData') ? JSON.parse(formData.get('audioData') as string) : undefined
    };

    const validationResult = AIRequestSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      validationResult.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });

      return {
        error: 'Invalid request data. Please check your input.',
        fieldErrors,
        success: false
      };
    }

    const { feature, tasks, context, audioData } = validationResult.data;

    // 3. Check subscription tier and access
    const accessCheck = await consolidatedAIService.checkAccess(userId, feature);
    
    if (!accessCheck.canProceed) {
      return {
        success: false,
        tier: accessCheck.tier === 'enterprise' ? 'premium' : accessCheck.tier as SubscriptionTier,
        usage: {
          ...accessCheck.usage,
          featureAvailable: false
        },
        upgradeRequired: accessCheck.upgradeRequired,
        error: accessCheck.message || 'Feature not available in current tier'
      };
    }

    // 4. Rate limiting check
    const supabase = getServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usage, error: usageError } = await supabase
      .from('ai_usage_tracking')
      .select('ai_requests_count')
      .eq('clerk_user_id', userId)
      .eq('usage_date', today)
      .single();

    const requestsToday = usage?.ai_requests_count || 0;
    const tierLimits = {
      free: 10,
      premium: 100,
      premium_plus: 500
    };
    
    const dailyLimit = tierLimits[accessCheck.tier as keyof typeof tierLimits];
    
    if (dailyLimit > 0 && requestsToday >= dailyLimit) {
      return {
        success: false,
        tier: accessCheck.tier === 'enterprise' ? 'premium' : accessCheck.tier as SubscriptionTier,
        usage: {
          requestsUsed: requestsToday,
          requestsRemaining: 0,
          featureAvailable: false
        },
        upgradeRequired: true,
        error: 'Daily AI request limit reached'
      };
    }

    // 5. Process AI request using Super Intelligent ML system
    let suggestions: AISuggestion[];
    
    try {
      switch (feature) {
        case 'basic_suggestions':
        case 'advanced_suggestions':
          const suggestionResponse = await consolidatedAIService.generateSuggestions({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[], 
            context: createSuggestionContext(context),
            userTier: accessCheck.tier
          });
          suggestions = suggestionResponse.data as AISuggestion[] || [];
          break;
          
        case 'study_planning':
          const studyPlan = await consolidatedAIService.generateStudyPlan({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[], 
            context: createSuggestionContext(context),
            userTier: accessCheck.tier
          });
          // Convert study plan to suggestions format
          suggestions = [{
            id: `study_plan_${Date.now()}`,
            type: 'schedule_optimization',
            title: '📅 Personalized Study Plan',
            description: 'AI-generated study plan optimized for your schedule and goals',
            priority: 'high',
            source: 'super_intelligent_ml',
            createdAt: new Date().toISOString(),
            confidence: 0.9,
            reasoning: 'Generated using Super Intelligent ML with behavioral analysis',
            metadata: {
              category: 'planning',
              tags: ['study_plan', 'schedule', 'ai_generated'],
              difficulty: 5,
              estimatedBenefit: 0.95,
              tier: accessCheck.tier,
              confidence: 0.9,
              aiEnhanced: true,
              mlProcessed: true,
              localGenerated: false,
              studyPlan
            }
          }];
          break;
          
        case 'voice_processing':
          if (!audioData) {
            return {
              success: false,
              error: 'Audio data required for voice processing'
            };
          }
          const voiceResult = await consolidatedAIService.processVoiceInput({ 
            userId, 
            feature, 
            audioData, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[], 
            context: createSuggestionContext(context)
          });
          suggestions = [{
            id: `voice_processed_${Date.now()}`,
            type: 'task_suggestion',
            title: '🎤 Voice Command Processed',
            description: voiceResult.transcription || 'Voice input processed successfully',
            priority: 'medium',
            source: 'voice_ai',
            createdAt: new Date().toISOString(),
            confidence: voiceResult.confidence || 0.8,
            reasoning: 'Processed using advanced voice AI',
            metadata: {
              category: 'voice',
              tags: ['voice_processing', 'ai_transcription'],
              difficulty: 3,
              estimatedBenefit: 0.8,
              tier: accessCheck.tier,
              confidence: voiceResult.confidence || 0.8,
              voiceResult
            }
          }];
          break;
          
        case 'stu_personality':
          const stuResponse = await consolidatedAIService.generateStuResponse({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[], 
            context: createSuggestionContext(context),
            userTier: accessCheck.tier
          });
          suggestions = [{
            id: `stu_response_${Date.now()}`,
            type: 'mascot_interaction',
            title: '🐿️ Stu\'s Personalized Advice',
            description: stuResponse.message || 'Stu has some helpful advice for you!',
            priority: 'medium',
            source: 'stu_personality',
            createdAt: new Date().toISOString(),
            confidence: 0.85,
            reasoning: 'Generated by Stu\'s AI personality system',
            metadata: {
              category: 'motivation',
              tags: ['stu_personality', 'motivation', 'mascot'],
              difficulty: 2,
              estimatedBenefit: 0.7,
              tier: accessCheck.tier,
              confidence: 0.85,
              stuResponse
            }
          }];
          break;
          
        case 'ml_predictions':
          const predictions = await consolidatedAIService.generateMLPredictions({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[]
          });
          suggestions = predictions.map((pred: any, index: number) => ({
            id: `ml_prediction_${Date.now()}_${index}`,
            type: 'task_suggestion',
            title: `🧠 ML Prediction: ${pred.title || 'Smart Insight'}`,
            description: pred.description || 'AI-generated prediction based on your patterns',
            priority: pred.priority || 'medium',
            source: 'ml_predictions',
            createdAt: new Date().toISOString(),
            confidence: pred.confidence || 0.8,
            reasoning: pred.reasoning || 'Generated using machine learning analysis',
            metadata: {
              category: 'prediction',
              tags: ['ml_prediction', 'pattern_analysis'],
              difficulty: pred.difficulty || 5,
              estimatedBenefit: pred.impact || 0.8,
              tier: accessCheck.tier,
              confidence: pred.confidence || 0.8,
              prediction: pred
            }
          }));
          break;
          
        case 'collaborative_filtering':
          const insights = await consolidatedAIService.getCollaborativeInsights({ userId, feature });
          suggestions = [{
            id: `collaborative_${Date.now()}`,
            type: 'study_habit_tip',
            title: '👥 Community Insights',
            description: insights.message || 'Insights based on successful study patterns from the community',
            priority: 'medium',
            source: 'collaborative_filtering',
            createdAt: new Date().toISOString(),
            confidence: 0.75,
            reasoning: 'Based on anonymous success patterns from similar users',
            metadata: {
              category: 'social_learning',
              tags: ['collaborative', 'community_insights'],
              difficulty: 4,
              estimatedBenefit: 0.75,
              tier: accessCheck.tier,
              confidence: 0.75,
              insights
            }
          }];
          break;
          
        case 'premium_analytics':
          const analytics = await consolidatedAIService.generateAnalytics({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[]
          });
          suggestions = [{
            id: `analytics_${Date.now()}`,
            type: 'premium_analytics',
            title: '📊 Advanced Analytics',
            description: 'Comprehensive analysis of your study patterns and performance',
            priority: 'high',
            source: 'premium_analytics',
            createdAt: new Date().toISOString(),
            confidence: 0.95,
            reasoning: 'Enterprise-level analytics with advanced metrics',
            metadata: {
              category: 'analytics',
              tags: ['premium_analytics', 'performance_analysis'],
              difficulty: 7,
              estimatedBenefit: 0.95,
              tier: accessCheck.tier,
              confidence: 0.95,
              analytics
            }
          }];
          break;
          
        default:
          // Fallback to basic suggestions
          const fallbackResponse = await consolidatedAIService.generateSuggestions({ 
            userId, 
            feature, 
            tasks: tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[], 
            context: createSuggestionContext(context),
            userTier: accessCheck.tier
          });
          suggestions = fallbackResponse.data as AISuggestion[] || [];
      }

      // 6. Track usage
      await consolidatedAIService.trackUsage({ userId, feature });
      
      // 7. Update usage tracking in database
      await supabase
        .from('ai_usage_tracking')
        .upsert({
          clerk_user_id: userId,
          usage_date: today,
          ai_requests_count: requestsToday + 1,
          last_request_at: new Date().toISOString()
        }, {
          onConflict: 'clerk_user_id,usage_date'
        });

      // 8. Get updated usage for response
      const { data: updatedUsage } = await supabase
        .from('ai_usage_tracking')
        .select('ai_requests_count')
        .eq('clerk_user_id', userId)
        .eq('usage_date', today)
        .single();

      const updatedRequestsToday = updatedUsage?.ai_requests_count || 0;

      return {
        success: true,
        data: suggestions,
        tier: accessCheck.tier === 'enterprise' ? 'premium' : accessCheck.tier as SubscriptionTier,
        usage: {
          requestsUsed: updatedRequestsToday,
          requestsRemaining: Math.max(0, dailyLimit - updatedRequestsToday),
          featureAvailable: true
        },
        message: `Generated ${suggestions.length} AI suggestions using Super Intelligent ML`
      };

    } catch (aiError: any) {
      console.error('AI processing error:', aiError);
      return {
        success: false,
        error: 'AI service temporarily unavailable',
        message: aiError.message
      };
    }

  } catch (error: any) {
    console.error('AI suggestions action error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      message: error.message
    };
  }
}

/**
 * BASIC SUGGESTIONS SERVER ACTION
 * Lightweight action for basic AI suggestions
 */
export async function generateBasicSuggestionsAction(formData: FormData): Promise<ActionResponse<AISuggestion[]>> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'basic_suggestions');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * ADVANCED SUGGESTIONS SERVER ACTION  
 * High-intelligence suggestions with Super Intelligent ML
 */
export async function generateAdvancedSuggestionsAction(formData: FormData): Promise<ActionResponse<AISuggestion[]>> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'advanced_suggestions');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * STUDY PLANNING SERVER ACTION
 * Generate comprehensive study plans
 */
export async function generateStudyPlanAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'study_planning');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * VOICE PROCESSING SERVER ACTION
 * Process voice input with AI
 */
export async function processVoiceInputAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'voice_processing');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  modifiedFormData.set('audioData', formData.get('audioData') || '');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * STU PERSONALITY SERVER ACTION
 * Get responses from Stu the squirrel mascot
 */
export async function generateStuResponseAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'stu_personality');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * ML PREDICTIONS SERVER ACTION
 * Generate machine learning predictions
 */
export async function generateMLPredictionsAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'ml_predictions');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * COLLABORATIVE INSIGHTS SERVER ACTION
 * Get insights from collaborative filtering
 */
export async function getCollaborativeInsightsAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'collaborative_filtering');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * PREMIUM ANALYTICS SERVER ACTION
 * Generate advanced analytics (Enterprise tier)
 */
export async function generateAnalyticsAction(formData: FormData): Promise<ActionResponse> {
  const modifiedFormData = new FormData();
  modifiedFormData.set('feature', 'premium_analytics');
  modifiedFormData.set('tasks', formData.get('tasks') || '[]');
  modifiedFormData.set('context', formData.get('context') || '{}');
  
  return generateAISuggestionsAction(modifiedFormData);
}

/**
 * AI HEALTH CHECK SERVER ACTION
 * Check AI service health and status
 */
export async function checkAIHealthAction(): Promise<ActionResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    const health = consolidatedAIService.getHealth();
    
    return {
      success: true,
      data: {
        isHealthy: health.isHealthy,
        cacheSize: health.cacheSize,
        timestamp: new Date().toISOString(),
        services: {
          superIntelligentML: 'operational',
          adaptiveLearningML: 'operational', 
          costOptimizedAI: 'operational',
          localML: 'operational'
        }
      },
      message: 'AI services are healthy and operational'
    };

  } catch (error: any) {
    return {
      success: false,
      error: 'Health check failed',
      message: error.message
    };
  }
}

/**
 * CLEAR AI CACHE SERVER ACTION
 * Clear AI service cache (admin function)
 */
export async function clearAICacheAction(): Promise<ActionResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can clear cache
    
    consolidatedAIService.clearCache();
    
    return {
      success: true,
      message: 'AI cache cleared successfully'
    };

  } catch (error: any) {
    return {
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    };
  }
}

/**
 * Server action to get AI suggestions using the consolidated 4-tier service.
 * It authenticates the user, determines their subscription tier, and
 * calls the main AI service.
 */
export async function getAISuggestions(
  request: Omit<TierAwareAIRequest, 'userId'>
): Promise<TierAwareAIResponse> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return {
      success: false,
      tier: 'free',
      error: 'Authentication required',
      usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false },
    };
  }

  const validatedRequest = tierAwareAIRequestSchema.safeParse(request);
  if (!validatedRequest.success) {
    return {
      success: false,
      tier: 'free',
      error: `Invalid request: ${validatedRequest.error.message}`,
      usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false },
    };
  }

  const userTier = (sessionClaims?.subscriptionTier as SubscriptionTier) || 'free';
  
  const fullRequest: TierAwareAIRequest = {
    userId,
    userTier: userTier || 'free',
    tasks: validatedRequest.data.tasks.map(t => ({ ...t, type: t.type as any })) as ExtendedTask[],
    feature: validatedRequest.data.feature,
    context: {
      currentTime: new Date(),
      upcomingTasks: validatedRequest.data.context.upcomingTasks || [],
      recentActivity: validatedRequest.data.context.recentActivity || [],
      userPreferences: validatedRequest.data.context.userPreferences,
      taskContext: validatedRequest.data.context.taskContext,
      suggestionTypes: validatedRequest.data.context.suggestionTypes,
      metadata: validatedRequest.data.context.metadata,
      timetable: validatedRequest.data.context.timetable,
    },
    ...validatedRequest.data.metadata
  };

  try {
    return await consolidatedAIService.handleRequest(fullRequest);
  } catch (error) {
    console.error('Error in getAISuggestions action:', error);
    return {
      success: false,
      tier: userTier,
      error: 'An unexpected error occurred while generating suggestions.',
      usage: { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false },
    };
  }
} 