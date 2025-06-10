import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  SubscriptionTier,
  SubscriptionTierConfig, 
  UserSubscription, 
  UserSubscriptionData,
  SubscriptionLimits,
  SubscriptionCheckResult,
  DEFAULT_TIER_CONFIGS
} from '../../types/subscription';

export class SubscriptionTierManager {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    // Use provided client or create new one
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Get user's current subscription data with tier info and usage
   */
  async getUserSubscriptionData(clerkUserId: string): Promise<UserSubscriptionData | null> {
    try {
      // Get user's subscription
      const { data: subscription, error: subError } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('status', 'active')
        .single();

      if (subError) {
        console.log('No active subscription found, creating free tier subscription');
        return await this.createFreeSubscription(clerkUserId);
      }

      // Get tier configuration
      const { data: tier, error: tierError } = await this.supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', subscription.tier_id)
        .single();

      if (tierError) {
        throw new Error(`Failed to fetch tier configuration: ${tierError.message}`);
      }

      // Get current usage
      const { data: usage, error: usageError } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .single();

      // If no usage record for today, create one
      const todayUsage = usage || await this.createTodayUsageRecord(clerkUserId);

      // Calculate limits
      const limits = this.calculateLimits(tier, todayUsage);

      return {
        subscription,
        tier,
        usage: todayUsage,
        limits
      };
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      throw error;
    }
  }

  /**
   * Get user's current tier (with fallback to free)
   */
  async getUserTier(clerkUserId: string): Promise<SubscriptionTier> {
    try {
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select('tier_id')
        .eq('clerk_user_id', clerkUserId)
        .eq('status', 'active')
        .single();

      return (subscription?.tier_id as SubscriptionTier) || 'free';
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return 'free'; // Fallback to free tier
    }
  }

  /**
   * Check if user can make an AI request
   */
  async canUserMakeAIRequest(clerkUserId: string, feature?: string): Promise<SubscriptionCheckResult> {
    try {
      const subscriptionData = await this.getUserSubscriptionData(clerkUserId);
      
      if (!subscriptionData) {
        return {
          can_proceed: false,
          tier: 'free',
          remaining_requests: 0,
          limit_type: 'daily',
          upgrade_required: true,
          message: 'Unable to verify subscription status'
        };
      }

      const { tier, limits } = subscriptionData;

      // Check if feature is available for this tier
      if (feature && !this.isFeatureAvailable(tier.features, feature)) {
        return {
          can_proceed: false,
          tier: tier.id as SubscriptionTier,
          remaining_requests: limits.daily_ai_requests - limits.daily_used,
          limit_type: 'daily',
          upgrade_required: true,
          message: `${feature} is not available in your current plan`
        };
      }

      // Check daily limits
      if (!limits.can_use_ai) {
        const limitType = limits.daily_used >= limits.daily_ai_requests ? 'daily' : 'monthly';
        return {
          can_proceed: false,
          tier: tier.id as SubscriptionTier,
          remaining_requests: 0,
          limit_type: limitType,
          upgrade_required: tier.id === 'free',
          message: `You've reached your ${limitType} AI request limit`
        };
      }

      return {
        can_proceed: true,
        tier: tier.id as SubscriptionTier,
        remaining_requests: limits.daily_ai_requests - limits.daily_used,
        limit_type: 'none',
        upgrade_required: false
      };
    } catch (error) {
      console.error('Error checking AI request permission:', error);
      return {
        can_proceed: false,
        tier: 'free',
        remaining_requests: 0,
        limit_type: 'daily',
        upgrade_required: true,
        message: 'Error checking permissions'
      };
    }
  }

  /**
   * Get all available subscription tiers
   */
  async getAvailableTiers(): Promise<SubscriptionTierConfig[]> {
    try {
      const { data: tiers, error } = await this.supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch subscription tiers: ${error.message}`);
      }

      return tiers || [];
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      // Return default tiers as fallback
      return Object.values(DEFAULT_TIER_CONFIGS).map(config => ({
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    }
  }

  /**
   * Create or update user subscription
   */
  async updateUserSubscription(
    clerkUserId: string, 
    tierId: SubscriptionTier,
    stripeData?: {
      subscription_id: string;
      customer_id: string;
      current_period_start: Date;
      current_period_end: Date;
    }
  ): Promise<UserSubscription> {
    try {
      const subscriptionData = {
        clerk_user_id: clerkUserId,
        tier_id: tierId,
        status: 'active' as const,
        stripe_subscription_id: stripeData?.subscription_id || null,
        stripe_customer_id: stripeData?.customer_id || null,
        current_period_start: stripeData?.current_period_start?.toISOString() || null,
        current_period_end: stripeData?.current_period_end?.toISOString() || null,
        cancel_at_period_end: false,
        metadata: {},
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'clerk_user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel user subscription
   */
  async cancelUserSubscription(clerkUserId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_subscriptions')
        .update({ 
          status: 'cancelled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Private helper methods

  private async createFreeSubscription(clerkUserId: string): Promise<UserSubscriptionData> {
    try {
      // Create free subscription
      const freeSubscription = await this.updateUserSubscription(clerkUserId, 'free');
      
      // Get free tier config
      const freeTier = DEFAULT_TIER_CONFIGS.free;
      const tierWithTimestamps = {
        ...freeTier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create today's usage record
      const todayUsage = await this.createTodayUsageRecord(clerkUserId);

      // Calculate limits
      const limits = this.calculateLimits(tierWithTimestamps, todayUsage);

      return {
        subscription: freeSubscription,
        tier: tierWithTimestamps,
        usage: todayUsage,
        limits
      };
    } catch (error) {
      console.error('Error creating free subscription:', error);
      throw error;
    }
  }

  private async createTodayUsageRecord(clerkUserId: string) {
    try {
      const { data, error } = await this.supabase
        .from('ai_usage_tracking')
        .upsert({
          clerk_user_id: clerkUserId,
          usage_date: new Date().toISOString().split('T')[0],
          ai_requests_count: 0,
          feature_usage: {},
          reset_at: new Date().toISOString()
        }, {
          onConflict: 'clerk_user_id,usage_date',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create usage record: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating usage record:', error);
      throw error;
    }
  }

  private calculateLimits(tier: SubscriptionTierConfig, usage: any): SubscriptionLimits {
    const dailyUsed = usage.ai_requests_count || 0;
    const monthlyUsed = dailyUsed; // Simplified - in real app, calculate monthly total
    
    const canUseAI = dailyUsed < tier.ai_requests_per_day && 
                     monthlyUsed < tier.ai_requests_per_month;

    return {
      daily_ai_requests: tier.ai_requests_per_day,
      monthly_ai_requests: tier.ai_requests_per_month,
      daily_used: dailyUsed,
      monthly_used: monthlyUsed,
      can_use_ai: canUseAI,
      days_until_reset: 1, // Always 1 for daily reset
      features_available: tier.features
    };
  }

  private isFeatureAvailable(features: any, feature: string): boolean {
    // Map feature names to tier features
    const featureMap: Record<string, string> = {
      'task_suggestions': 'task_suggestions',
      'study_planning': 'study_planning',
      'voice_notes': 'voice_notes',
      'premium_features': 'premium_features',
      'stu_personality': 'premium_features',
      'ml_predictions': 'premium_features'
    };

    const mappedFeature = featureMap[feature] || feature;
    return features[mappedFeature] === true;
  }
} 