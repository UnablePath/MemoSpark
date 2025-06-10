import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AIUsageTracking, 
  AIFeatureUsage, 
  UsageIncrementResult,
  SubscriptionCheckResult 
} from '../../types/subscription';
import { SubscriptionTierManager } from '../subscription/SubscriptionTierManager';

export class AIUsageTracker {
  private supabase: SupabaseClient;
  private subscriptionManager: SubscriptionTierManager;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.subscriptionManager = new SubscriptionTierManager(this.supabase);
  }

  /**
   * Track an AI request and check limits before proceeding
   * This is the main method that should be called before any AI operation
   */
  async trackAIRequest(
    clerkUserId: string, 
    feature: string = 'basic_ai'
  ): Promise<SubscriptionCheckResult & { canProceed: boolean }> {
    try {
      // First check if user can make the request
      const permissionCheck = await this.subscriptionManager.canUserMakeAIRequest(clerkUserId, feature);
      
      if (!permissionCheck.can_proceed) {
        return {
          ...permissionCheck,
          canProceed: false
        };
      }

      // Increment usage count
      const incrementResult = await this.incrementUsage(clerkUserId, feature);
      
      if (!incrementResult.success) {
        return {
          ...permissionCheck,
          can_proceed: false,
          canProceed: false,
          message: 'Failed to track usage'
        };
      }

      return {
        ...permissionCheck,
        canProceed: true,
        remaining_requests: incrementResult.remaining
      };
    } catch (error) {
      console.error('Error tracking AI request:', error);
      return {
        can_proceed: false,
        canProceed: false,
        tier: 'free',
        remaining_requests: 0,
        limit_type: 'daily',
        upgrade_required: true,
        message: 'Error tracking request'
      };
    }
  }

  /**
   * Increment usage count for a specific feature
   */
  async incrementUsage(
    clerkUserId: string, 
    feature: string = 'basic_ai'
  ): Promise<UsageIncrementResult> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get current usage record or create new one
      let { data: usage, error: selectError } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('usage_date', today)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch usage: ${selectError.message}`);
      }

      // If no record exists, create one
      if (!usage) {
        const { data: newUsage, error: insertError } = await this.supabase
          .from('ai_usage_tracking')
          .insert({
            clerk_user_id: clerkUserId,
            usage_date: today,
            ai_requests_count: 1,
            feature_usage: { [feature]: 1 },
            reset_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create usage record: ${insertError.message}`);
        }

        // Get user limits to calculate remaining
        const subscriptionData = await this.subscriptionManager.getUserSubscriptionData(clerkUserId);
        const dailyLimit = subscriptionData?.tier.ai_requests_per_day || 10;

        return {
          success: true,
          new_count: 1,
          remaining: Math.max(0, dailyLimit - 1),
          limit_reached: dailyLimit <= 1
        };
      }

      // Update existing record
      const newTotalCount = (usage.ai_requests_count || 0) + 1;
      const currentFeatureUsage = usage.feature_usage || {};
      const newFeatureUsage = {
        ...currentFeatureUsage,
        [feature]: ((currentFeatureUsage[feature] as number) || 0) + 1
      };

      const { data: updatedUsage, error: updateError } = await this.supabase
        .from('ai_usage_tracking')
        .update({
          ai_requests_count: newTotalCount,
          feature_usage: newFeatureUsage,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update usage: ${updateError.message}`);
      }

      // Get user limits to calculate remaining
      const subscriptionData = await this.subscriptionManager.getUserSubscriptionData(clerkUserId);
      const dailyLimit = subscriptionData?.tier.ai_requests_per_day || 10;

      return {
        success: true,
        new_count: newTotalCount,
        remaining: Math.max(0, dailyLimit - newTotalCount),
        limit_reached: newTotalCount >= dailyLimit
      };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return {
        success: false,
        new_count: 0,
        remaining: 0,
        limit_reached: true
      };
    }
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(clerkUserId: string): Promise<AIUsageTracking | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('usage_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch usage: ${error.message}`);
      }

      return usage || null;
    } catch (error) {
      console.error('Error fetching current usage:', error);
      return null;
    }
  }

  /**
   * Get usage history for a user (last 30 days)
   */
  async getUsageHistory(clerkUserId: string, days: number = 30): Promise<AIUsageTracking[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .gte('usage_date', startDate.toISOString().split('T')[0])
        .order('usage_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch usage history: ${error.message}`);
      }

      return usage || [];
    } catch (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }
  }

  /**
   * Get total monthly usage for a user
   */
  async getMonthlyUsage(clerkUserId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startDate = startOfMonth.toISOString().split('T')[0];

      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('ai_requests_count')
        .eq('clerk_user_id', clerkUserId)
        .gte('usage_date', startDate);

      if (error) {
        throw new Error(`Failed to fetch monthly usage: ${error.message}`);
      }

      return usage?.reduce((total, record) => total + (record.ai_requests_count || 0), 0) || 0;
    } catch (error) {
      console.error('Error fetching monthly usage:', error);
      return 0;
    }
  }

  /**
   * Reset usage for a user (admin function)
   */
  async resetUserUsage(clerkUserId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await this.supabase
        .from('ai_usage_tracking')
        .update({
          ai_requests_count: 0,
          feature_usage: {},
          reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', clerkUserId)
        .eq('usage_date', today);

      if (error) {
        throw new Error(`Failed to reset usage: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error resetting usage:', error);
      return false;
    }
  }

  /**
   * Get usage analytics for dashboard
   */
  async getUsageAnalytics(clerkUserId: string): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    topFeatures: Array<{ feature: string; count: number }>;
    dailyAverage: number;
  }> {
    try {
      const history = await this.getUsageHistory(clerkUserId, 30);
      const today = new Date().toISOString().split('T')[0];
      const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const monthStart = thisMonth.toISOString().split('T')[0];

      const todayUsage = history.find(record => record.usage_date === today)?.ai_requests_count || 0;
      const weekUsage = history
        .filter(record => record.usage_date >= thisWeek)
        .reduce((sum, record) => sum + (record.ai_requests_count || 0), 0);
      const monthUsage = history
        .filter(record => record.usage_date >= monthStart)
        .reduce((sum, record) => sum + (record.ai_requests_count || 0), 0);

      // Calculate top features
      const featureMap = new Map<string, number>();
      history.forEach(record => {
        const features = record.feature_usage || {};
        Object.entries(features).forEach(([feature, count]) => {
          featureMap.set(feature, (featureMap.get(feature) || 0) + (count as number));
        });
      });

      const topFeatures = Array.from(featureMap.entries())
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const dailyAverage = history.length > 0 
        ? monthUsage / Math.min(history.length, 30)
        : 0;

      return {
        today: todayUsage,
        thisWeek: weekUsage,
        thisMonth: monthUsage,
        topFeatures,
        dailyAverage: Math.round(dailyAverage * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      return {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        topFeatures: [],
        dailyAverage: 0
      };
    }
  }

  /**
   * Convenience method to check if user can use a specific AI feature
   */
  async canUseFeature(clerkUserId: string, feature: string): Promise<boolean> {
    try {
      const result = await this.subscriptionManager.canUserMakeAIRequest(clerkUserId, feature);
      return result.can_proceed;
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  }

  /**
   * Bulk usage tracking for multiple features in one request
   */
  async trackBulkUsage(
    clerkUserId: string, 
    features: string[]
  ): Promise<{ success: boolean; results: UsageIncrementResult[] }> {
    try {
      const results: UsageIncrementResult[] = [];
      
      for (const feature of features) {
        const result = await this.incrementUsage(clerkUserId, feature);
        results.push(result);
        
        // If any increment fails, stop processing
        if (!result.success) {
          return { success: false, results };
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('Error tracking bulk usage:', error);
      return { success: false, results: [] };
    }
  }
} 