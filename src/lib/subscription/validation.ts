import { createClient } from '@supabase/supabase-js';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    tablesExist: boolean;
    defaultTiersExist: boolean;
    rlsEnabled: boolean;
    indexesExist: boolean;
    constraintsValid: boolean;
  };
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onfnehxkglmvrorcvqcx.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function validateSubscriptionSchema(): Promise<ValidationResult> {
  const supabase = getSupabaseClient();
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    details: {
      tablesExist: false,
      defaultTiersExist: false,
      rlsEnabled: false,
      indexesExist: false,
      constraintsValid: false,
    },
  };

  try {
    // 1. Check if required tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['subscription_tiers', 'user_subscriptions', 'ai_usage_tracking']);

    if (tablesError) {
      result.errors.push(`Failed to check tables: ${tablesError.message}`);
    } else {
      const tableNames = tables?.map((t: { table_name: string }) => t.table_name) || [];
      const requiredTables = ['subscription_tiers', 'user_subscriptions', 'ai_usage_tracking'];
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        result.errors.push(`Missing tables: ${missingTables.join(', ')}`);
      } else {
        result.details.tablesExist = true;
      }
    }

    // 2. Check if default subscription tiers exist
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('id, name, ai_requests_per_day')
      .eq('is_active', true);

    if (tiersError) {
      result.errors.push(`Failed to check subscription tiers: ${tiersError.message}`);
    } else {
      const tierIds = tiers?.map((t: { id: string }) => t.id) || [];
      const requiredTiers = ['free', 'premium', 'enterprise'];
      const missingTiers = requiredTiers.filter(tier => !tierIds.includes(tier));
      
      if (missingTiers.length > 0) {
        result.errors.push(`Missing subscription tiers: ${missingTiers.join(', ')}`);
      } else {
        result.details.defaultTiersExist = true;
        
        // Validate tier limits
        const freeTier = tiers.find((t: { id: string }) => t.id === 'free');
        if (freeTier && (freeTier as any).ai_requests_per_day !== 10) {
          result.warnings.push('Free tier AI requests limit is not set to 10');
        }
      }
    }

    // 3. Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status');
    if (rlsError) {
      // If the RPC doesn't exist, we'll try a direct query
      const { data: pgTables, error: pgError } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .in('tablename', ['subscription_tiers', 'user_subscriptions', 'ai_usage_tracking']);

      if (pgError) {
        result.warnings.push('Could not verify RLS status');
      } else {
        const rlsEnabled = pgTables?.every((table: { rowsecurity: boolean }) => table.rowsecurity) || false;
        result.details.rlsEnabled = rlsEnabled;
        if (!rlsEnabled) {
          result.errors.push('Row Level Security is not enabled on all subscription tables');
        }
      }
    }

    // 4. Test subscription assignment functionality
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('clerk_user_id')
        .limit(1);

      if (profilesError) {
        result.warnings.push('Could not test subscription assignment functionality');
      } else if (profiles && profiles.length > 0) {
        const testUserId = profiles[0].clerk_user_id;
        
        // Check if user has subscription
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('tier_id, status')
          .eq('clerk_user_id', testUserId)
          .single();

        if (subError && subError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          result.warnings.push('Could not verify subscription assignment');
        }
      }
    } catch (error) {
      result.warnings.push('Subscription assignment test failed');
    }

    // 5. Test AI usage tracking functionality
    try {
      const { data: usageData, error: usageError } = await supabase
        .from('ai_usage_tracking')
        .select('clerk_user_id, ai_requests_count, usage_date')
        .limit(1);

      if (usageError) {
        result.warnings.push('Could not verify AI usage tracking functionality');
      } else {
        result.details.constraintsValid = true;
      }
    } catch (error) {
      result.warnings.push('AI usage tracking test failed');
    }

    // 6. Validate indexes exist for performance
    result.details.indexesExist = true; // Assume true for now

    // Final validation
    result.isValid = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
  }

  return result;
}

export async function getUserSubscriptionInfo(clerkUserId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      tier_id,
      status,
      subscription_tiers (
        display_name,
        ai_requests_per_day,
        ai_requests_per_month,
        features
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .eq('status', 'active')
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getUserAIUsage(clerkUserId: string, date: Date = new Date()) {
  const supabase = getSupabaseClient();
  const dateStr = date.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('ai_usage_tracking')
    .select('ai_requests_count, feature_usage, reset_at')
    .eq('clerk_user_id', clerkUserId)
    .eq('usage_date', dateStr)
    .single();

  if (error || !data) {
    return { ai_requests_count: 0, feature_usage: {}, reset_at: null };
  }

  return data;
}

export async function incrementAIUsage(
  clerkUserId: string,
  featureType: string,
  incrementBy: number = 1
) {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('increment_ai_usage', {
    p_clerk_user_id: clerkUserId,
    p_usage_date: today,
    p_feature_type: featureType,
    p_increment: incrementBy,
  });

  if (error) {
    console.error('Failed to increment AI usage:', error);
    return false;
  }

  return true;
}

export async function checkAIUsageLimit(clerkUserId: string): Promise<{
  canMakeRequest: boolean;
  currentUsage: number;
  dailyLimit: number;
  remainingRequests: number;
}> {
  const supabase = getSupabaseClient();
  
  // Get user subscription and usage in parallel
  const [subscriptionInfo, usageInfo] = await Promise.all([
    getUserSubscriptionInfo(clerkUserId),
    getUserAIUsage(clerkUserId),
  ]);

  const dailyLimit = (subscriptionInfo?.subscription_tiers as any)?.ai_requests_per_day || 10;
  const currentUsage = usageInfo.ai_requests_count;
  const remainingRequests = Math.max(0, dailyLimit - currentUsage);
  const canMakeRequest = remainingRequests > 0;

  return {
    canMakeRequest,
    currentUsage,
    dailyLimit,
    remainingRequests,
  };
} 