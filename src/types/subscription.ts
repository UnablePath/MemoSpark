// Subscription system types for MemoSpark
// Matches the database schema in src/lib/subscription/schema.sql

export type SubscriptionTier = 'free' | 'premium';

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due';

export interface SubscriptionTierConfig {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  ai_requests_per_day: number;
  ai_requests_per_month: number;
  features: SubscriptionFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionFeatures {
  basic_ai: boolean;
  task_suggestions: boolean;
  study_planning: boolean;
  voice_notes: boolean;
  premium_features: boolean;
  priority_support?: boolean;
  analytics?: boolean;
  unlimited_ai?: boolean;
}

export interface UserSubscription {
  id: string;
  clerk_user_id: string;
  tier_id: string;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIUsageTracking {
  id: string;
  clerk_user_id: string;
  usage_date: string;
  ai_requests_count: number;
  feature_usage: AIFeatureUsage;
  reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface AIFeatureUsage {
  task_suggestions?: number;
  study_planning?: number;
  voice_transcription?: number;
  stu_personality?: number;
  ml_predictions?: number;
  [key: string]: number | undefined;
}

// Combined subscription data for UI components
export interface UserSubscriptionData {
  subscription: UserSubscription;
  tier: SubscriptionTierConfig;
  usage: AIUsageTracking;
  limits: SubscriptionLimits;
}

export interface SubscriptionLimits {
  daily_ai_requests: number;
  monthly_ai_requests: number;
  daily_used: number;
  monthly_used: number;
  can_use_ai: boolean;
  days_until_reset: number;
  features_available: SubscriptionFeatures;
}

// API response types
export interface SubscriptionCheckResult {
  can_proceed: boolean;
  tier: SubscriptionTier;
  remaining_requests: number;
  limit_type: 'daily' | 'monthly' | 'none';
  upgrade_required: boolean;
  message?: string;
}

export interface UsageIncrementResult {
  success: boolean;
  new_count: number;
  remaining: number;
  limit_reached: boolean;
}

// Stripe integration types
export interface StripeSubscriptionData {
  subscription_id: string;
  customer_id: string;
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

// Constants for default tiers with Ghana Cedis pricing
export const DEFAULT_TIER_CONFIGS: Record<SubscriptionTier, Omit<SubscriptionTierConfig, 'created_at' | 'updated_at'>> = {
  free: {
    id: 'free',
    name: 'free',
    display_name: 'Free',
    description: 'Basic AI assistance with limited requests',
    price_monthly: 0,
    price_yearly: 0,
    ai_requests_per_day: 10,
    ai_requests_per_month: 300,
    features: {
      basic_ai: true,
      task_suggestions: true,
      study_planning: false,
      voice_notes: false,
      premium_features: false,
    },
    is_active: true,
  },
  premium: {
    id: 'premium',
    name: 'premium',
    display_name: 'Premium',
    description: 'Full AI capabilities with enhanced features',
    price_monthly: 20, // 20 Ghana Cedis
    price_yearly: 212, // 212 Ghana Cedis (save 20%)
    ai_requests_per_day: 100,
    ai_requests_per_month: 3000,
    features: {
      basic_ai: true,
      task_suggestions: true,
      study_planning: true,
      voice_notes: true,
      premium_features: true,
      priority_support: true,
    },
    is_active: true,
  },
}; 