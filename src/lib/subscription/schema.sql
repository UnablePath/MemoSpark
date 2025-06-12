-- Migration: Create subscription management tables
-- Description: Subscription tiers, user subscriptions, and AI usage tracking

-- Create subscription tier enum
DO $$ BEGIN
    CREATE TYPE subscription_tier_enum AS ENUM ('free', 'premium', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM ('active', 'inactive', 'cancelled', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription_tiers table (defines tier capabilities)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    ai_requests_per_day INTEGER DEFAULT 10,
    ai_requests_per_month INTEGER DEFAULT 300,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
    status subscription_status_enum DEFAULT 'active',
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one active subscription per user
    CONSTRAINT unique_active_subscription UNIQUE(clerk_user_id) WHERE status = 'active'
);

-- Create ai_usage_tracking table
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ai_requests_count INTEGER DEFAULT 0,
    feature_usage JSONB DEFAULT '{}', -- Track specific AI features used
    reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- One record per user per day
    CONSTRAINT unique_daily_usage UNIQUE(clerk_user_id, usage_date)
);

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_usage_tracking_updated_at
    BEFORE UPDATE ON ai_usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_tiers (read-only for users)
CREATE POLICY "Anyone can view active subscription tiers" ON subscription_tiers
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR SELECT USING ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
    FOR UPDATE USING ((auth.jwt()->>'sub')::text = clerk_user_id);

-- RLS Policies for ai_usage_tracking
CREATE POLICY "Users can view their own usage" ON ai_usage_tracking
    FOR SELECT USING ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can insert their own usage" ON ai_usage_tracking
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can update their own usage" ON ai_usage_tracking
    FOR UPDATE USING ((auth.jwt()->>'sub')::text = clerk_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_clerk_user_id ON user_subscriptions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_clerk_user_id ON ai_usage_tracking(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_date ON ai_usage_tracking(usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_date ON ai_usage_tracking(clerk_user_id, usage_date);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, display_name, description, price_monthly, price_yearly, ai_requests_per_day, ai_requests_per_month, features) VALUES
('free', 'free', 'Free', 'Basic AI assistance with limited requests', 0, 0, 10, 300, '{"basic_ai": true, "task_suggestions": true, "study_planning": false, "voice_notes": false, "premium_features": false}'),
('premium', 'premium', 'Premium', 'Full AI capabilities with enhanced features', 9.99, 99.99, 100, 3000, '{"basic_ai": true, "task_suggestions": true, "study_planning": true, "voice_notes": true, "premium_features": true, "priority_support": true}'),
('enterprise', 'enterprise', 'Enterprise', 'Unlimited AI with advanced analytics', 29.99, 299.99, 1000, 30000, '{"basic_ai": true, "task_suggestions": true, "study_planning": true, "voice_notes": true, "premium_features": true, "priority_support": true, "analytics": true, "unlimited_ai": true}')
ON CONFLICT (id) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE subscription_tiers IS 'Defines available subscription tiers and their capabilities';
COMMENT ON TABLE user_subscriptions IS 'Links users to their current subscription tier';
COMMENT ON TABLE ai_usage_tracking IS 'Tracks daily AI usage for rate limiting';
COMMENT ON COLUMN user_subscriptions.clerk_user_id IS 'Links to Clerk user via profiles table';
COMMENT ON COLUMN ai_usage_tracking.feature_usage IS 'JSON tracking of specific AI features used'; 