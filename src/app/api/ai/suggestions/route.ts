import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin, createServerSupabaseWithClerkJwt } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generatePostgresBackedSuggestions, generatePremiumFeature } from '@/lib/ai/serverSuggestionPipeline';
import type { AIFeatureType } from '@/types/ai';
import type { SubscriptionTier } from '@/types/subscription';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type guard to check if a string is a valid AIFeatureType
function isAIFeatureType(feature: string): feature is AIFeatureType {
  const validFeatures: AIFeatureType[] = [
    'basic_suggestions',
    'advanced_suggestions',
    'study_planning',
    'voice_processing',
    'stu_personality',
    'ml_predictions',
    'collaborative_filtering',
    'premium_analytics'
  ];
  return (validFeatures as string[]).includes(feature);
}

/**
 * POST /api/ai/suggestions
 * Generate AI suggestions with tier-aware processing
 */
export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    // Get Clerk authentication
    const authResult = await auth();
    userId = authResult.userId;
    const getToken = authResult.getToken;
    
    if (!userId) {
      console.log('AI Suggestions API: No userId provided');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('AI Suggestions API: Processing request for user:', userId);

    // Parse request body with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.log('AI Suggestions API: Empty request body received');
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Suggestions API] Invalid JSON in request body:', {
        message: parseError instanceof Error ? parseError.message : 'Unknown error',
        error: parseError
      });
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { feature, tasks, context, accessCheck } = body;

    if (!feature || typeof feature !== 'string' || !isAIFeatureType(feature)) {
      console.log('AI Suggestions API: Invalid feature type:', feature);
      return NextResponse.json({ error: 'A valid feature type is required' }, { status: 400 });
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('AI Suggestions API: Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Service configuration error',
        message: 'Missing required environment variables'
      }, { status: 500 });
    }

    // Get Clerk token for Supabase authentication
    let clerkToken;
    try {
      clerkToken = await getToken();
      if (!clerkToken) {
        console.log('AI Suggestions API: No Clerk token available');
        return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
      }
    } catch (tokenError) {
      console.error('[AI Suggestions API] Error getting Clerk token:', {
        message: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        error: tokenError,
        userId
      });
      return NextResponse.json({ error: 'Token retrieval failed' }, { status: 401 });
    }

    // Create Supabase client with Clerk integration
    const supabase = createServerSupabaseWithClerkJwt(clerkToken);
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client initialization failed' }, { status: 500 });
    }

    // Check user subscription status with better error handling
    let userTier: SubscriptionTier = 'free';
    try {
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('tier_id')
        .eq('clerk_user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.log('AI Suggestions API: Subscription query error (defaulting to free):', subError.message);
        // Don't fail the request, just default to free tier
      } else if (subscription) {
        userTier = (subscription.tier_id as SubscriptionTier) || 'free';
      } else {
        // No subscription found, user needs to be created with default free tier
        console.log('AI Suggestions API: No subscription found for user, creating default free subscription');
        try {
          // Use admin client to create initial subscription
          if (supabaseServerAdmin) {
            await supabaseServerAdmin
              .from('user_subscriptions')
              .insert({
                clerk_user_id: userId,
                tier_id: 'free',
                status: 'active'
              });
            console.log('AI Suggestions API: Created default free subscription for user');
          }
        } catch (insertError) {
          console.log('AI Suggestions API: Failed to create default subscription, continuing with free tier');
        }
      }
    } catch (subscriptionError) {
      console.error('[AI Suggestions API] Subscription check failed for user:', userId, {
        message: subscriptionError instanceof Error ? subscriptionError.message : 'Unknown error',
        error: subscriptionError
      });
      // Continue with free tier as fallback
    }

    // LAUNCH MODE OVERRIDE: Grant premium access during launch period without changing subscription
    const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';
    let effectiveTier = userTier; // Keep original tier for logging/tracking
    if (isLaunchMode) {
      effectiveTier = 'premium'; // Give premium access without modifying actual subscription
      console.log('AI Suggestions API: Launch mode active - granting premium access for launch period');
    }

    console.log('AI Suggestions API: User subscription tier:', userTier, '| Effective tier:', effectiveTier);

    // Check usage limits with better error handling
    const today = new Date().toISOString().split('T')[0];
    let requestsToday = 0;
    
    try {
      const { data: usage, error: usageError } = await supabase
        .from('ai_usage_tracking')
        .select('ai_requests_count')
        .eq('clerk_user_id', userId)
        .eq('usage_date', today)
        .single();

      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.log('AI Suggestions API: Usage query error:', usageError.message);
      } else {
        requestsToday = usage?.ai_requests_count || 0;
      }
    } catch (usageError) {
      console.error('[AI Suggestions API] Usage check failed for user:', userId, {
        message: usageError instanceof Error ? usageError.message : 'Unknown error',
        error: usageError
      });
      // Continue with 0 requests as fallback
    }

    // More generous limits during launch mode
    const dailyLimit = isLaunchMode 
      ? (effectiveTier === 'free' ? 1000 : effectiveTier === 'premium' ? 5000 : -1)  // Launch mode limits
      : (effectiveTier === 'free' ? 10 : effectiveTier === 'premium' ? 100 : -1);    // Production limits

    console.log('AI Suggestions API: Environment:', process.env.NODE_ENV, 'Launch mode:', isLaunchMode, 'Daily limit:', dailyLimit);

    // Check if user has exceeded limits (skip in launch mode if desired)
    if (!isLaunchMode && dailyLimit > 0 && requestsToday >= dailyLimit) {
      console.log('AI Suggestions API: Daily limit exceeded for user:', userId, 'requests:', requestsToday, 'limit:', dailyLimit);
      return NextResponse.json({
        success: false,
        tier: effectiveTier,
        usage: {
          requestsUsed: requestsToday,
          requestsRemaining: 0,
          featureAvailable: false
        },
        upgradeRequired: userTier === 'free' && !isLaunchMode,
        message: 'Daily AI request limit reached',
        error: 'Request limit exceeded'
      }, { status: 403 });
    }

    // Log when in launch mode for easier debugging
    if (isLaunchMode) {
      console.log('AI Suggestions API: Launch mode - rate limiting relaxed. Requests today:', requestsToday);
    }

    // Check feature tier requirements
    const featureRequirements: Record<AIFeatureType, SubscriptionTier> = {
      basic_suggestions: 'free',
      advanced_suggestions: 'premium',
      study_planning: 'premium',
      voice_processing: 'premium',
      stu_personality: 'premium',
      ml_predictions: 'premium',
      collaborative_filtering: 'premium',
      premium_analytics: 'premium'
    };

    const requiredTier = featureRequirements[feature];
    const tierHierarchy: Record<SubscriptionTier, number> = { free: 0, premium: 1 };
    const hasRequiredTier = tierHierarchy[effectiveTier] >= tierHierarchy[requiredTier];

    if (!hasRequiredTier) {
      console.log('AI Suggestions API: Feature not available - subscription tier:', userTier, 'effective tier:', effectiveTier, 'required:', requiredTier);
      return NextResponse.json({
        success: false,
        tier: effectiveTier,
        usage: {
          requestsUsed: requestsToday,
          requestsRemaining: Math.max(0, dailyLimit - requestsToday),
          featureAvailable: false
        },
        upgradeRequired: userTier === 'free' && !isLaunchMode,
        message: `${feature} requires ${requiredTier} tier or higher`,
        error: 'Feature not available in current tier'
      }, { status: 403 });
    }

    // Read-only tier/usage probe: skip the suggestion pipeline and do NOT
    // increment daily usage. `useTieredAI.refreshUsage` fires on every mount
    // across multiple components; without this guard each mount consumes
    // AI quota just to look up tier/usage state.
    if (accessCheck === true) {
      return NextResponse.json({
        success: true,
        data: null,
        tier: effectiveTier,
        subscriptionTier: userTier,
        launchMode: isLaunchMode,
        usage: {
          requestsUsed: requestsToday,
          requestsRemaining: dailyLimit > 0 ? Math.max(0, dailyLimit - requestsToday) : 9999,
          featureAvailable: hasRequiredTier,
        },
        upgradeRequired: false,
        message: 'Access check only',
      });
    }

    const aiResult = await processAIRequest(feature, tasks, userId, context, supabase, effectiveTier);
    
    // Track usage if successful
    if (aiResult.success) {
      await trackUsage(userId, feature);
    }

    // Get updated usage info
    let updatedRequestsToday = requestsToday;
    try {
      const { data: updatedUsage } = await supabase
        .from('ai_usage_tracking')
        .select('ai_requests_count')
        .eq('clerk_user_id', userId)
        .eq('usage_date', today)
        .single();

      updatedRequestsToday = updatedUsage?.ai_requests_count || requestsToday;
    } catch (error) {
      console.log('AI Suggestions API: Updated usage fetch failed, using cached value');
    }

    return NextResponse.json({
      success: aiResult.success,
      data: aiResult.data,
      tier: effectiveTier,
      subscriptionTier: userTier, // Include actual subscription tier for transparency
      launchMode: isLaunchMode, // Let frontend know if launch mode is active
      usage: {
        requestsUsed: updatedRequestsToday,
        requestsRemaining: Math.max(0, dailyLimit - updatedRequestsToday),
        featureAvailable: hasRequiredTier
      },
      upgradeRequired: false,
      message: aiResult.message
    });

  } catch (error: any) {
    console.error('[AI Suggestions API] Critical error processing AI request:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
      userId
    });
    return NextResponse.json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Process AI request based on feature type
 */
async function processAIRequest(
  feature: string,
  tasks: any[],
  userId: string,
  context: any,
  supabase: SupabaseClient,
  effectiveTier: SubscriptionTier,
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    switch (feature) {
      case 'basic_suggestions':
        return await generateBasicSuggestions(tasks, userId, context, supabase, effectiveTier);
      
      case 'advanced_suggestions':
        return await generateAdvancedSuggestions(tasks, userId, context, supabase, effectiveTier);
      
      case 'study_planning':
      case 'voice_processing':
      case 'stu_personality':
      case 'ml_predictions':
      case 'collaborative_filtering':
      case 'premium_analytics':
        // Premium features: deterministic, pattern-backed heuristics (no placeholders)
        if (effectiveTier !== 'premium') {
          return { success: false, message: 'Premium tier required' };
        }
        return await generatePremiumFeature(
          supabase as any,
          userId,
          feature as any,
          tasks,
          context,
        );
      
      default:
        return {
          success: false,
          message: `Unsupported feature: ${feature}`
        };
    }
  } catch (error: any) {
    console.error(`[AI Suggestions API] Error processing feature ${feature} for user ${userId}:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    });
    return {
      success: false,
      message: `Failed to process ${feature}: ${error.message}`
    };
  }
}

/**
 * Generate basic AI suggestions
 */
async function generateBasicSuggestions(
  tasks: any[],
  userId: string,
  context: any,
  supabase: SupabaseClient,
  effectiveTier: SubscriptionTier,
) {
  const tier = effectiveTier === 'premium' ? 'premium' : 'free';
  const result = await generatePostgresBackedSuggestions(supabase, userId, tasks, context, {
    advanced: false,
    effectiveTier: tier,
  });
  return {
    success: result.success,
    data: {
      ...result.data,
      context,
    },
    message: result.message,
  };
}

/**
 * Generate advanced AI suggestions
 */
async function generateAdvancedSuggestions(
  tasks: any[],
  userId: string,
  context: any,
  supabase: SupabaseClient,
  effectiveTier: SubscriptionTier,
) {
  const tier = effectiveTier === 'premium' ? 'premium' : 'free';
  const result = await generatePostgresBackedSuggestions(supabase, userId, tasks, context, {
    advanced: true,
    effectiveTier: tier,
  });
  return {
    success: result.success,
    data: {
      ...result.data,
      context,
    },
    message: result.message,
  };
}


/**
 * Track usage in the database bypassing RLS
 */
async function trackUsage(userId: string, feature: string) {
  const supabase = supabaseServerAdmin;
  if (!supabase) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Try to get existing usage record
    const { data: existingUsage } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();

    if (existingUsage) {
      // Update existing record
      const newCount = (Number(existingUsage.ai_requests_count) || 0) + 1;
      const featureUsage = (existingUsage.feature_usage as Record<string, number>) || {};
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;

      await supabase
        .from('ai_usage_tracking')
        .update({
          ai_requests_count: newCount,
          feature_usage: featureUsage,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id);
    } else {
      // Create new record
      await supabase
        .from('ai_usage_tracking')
        .insert({
          clerk_user_id: userId,
          usage_date: today,
          ai_requests_count: 1,
          feature_usage: { [feature]: 1 },
          reset_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('[AI Suggestions API] Error tracking usage in database:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
      userId,
      feature
    });
    // Don't throw error, just log it
  }
} 