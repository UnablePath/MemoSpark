-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table for coin transactions (earning and spending history)
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for earning, negative for spending
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  source TEXT NOT NULL, -- task_completion, achievement, bonus_event, shop_purchase, streak_recovery, etc.
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional context (task_id, achievement_id, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "coin_transactions" IS 'Tracks all coin earning and spending transactions for audit and history.';

-- Table for earning sources and their rates
CREATE TABLE coin_earning_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  base_amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  multiplier_factors JSONB DEFAULT '{}', -- For difficulty, streak, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "coin_earning_sources" IS 'Defines different ways users can earn coins and their base amounts.';

-- Table for spending categories and costs
CREATE TABLE coin_spending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  requirements JSONB DEFAULT '{}', -- Level, streak, etc. requirements
  metadata JSONB DEFAULT '{}', -- Additional item properties
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "coin_spending_categories" IS 'Defines items users can purchase with coins and their costs.';

-- Table for bonus events and multipliers
CREATE TABLE coin_bonus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('daily', 'weekly', 'special', 'streak', 'achievement')),
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- 1.5 = 50% bonus
  bonus_amount INTEGER DEFAULT 0, -- Fixed bonus amount
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Event activation conditions
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "coin_bonus_events" IS 'Manages special coin earning events and multipliers.';

-- Table for user bonus event participation
CREATE TABLE user_bonus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_event_id UUID NOT NULL REFERENCES coin_bonus_events(id) ON DELETE CASCADE,
  participated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bonus_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, bonus_event_id)
);
COMMENT ON TABLE "user_bonus_events" IS 'Tracks user participation in bonus events.';

-- Indexes for performance
CREATE INDEX idx_coin_transactions_user_id_created ON coin_transactions(user_id, created_at DESC);
CREATE INDEX idx_coin_transactions_source ON coin_transactions(source);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(transaction_type);
CREATE INDEX idx_coin_earning_sources_active ON coin_earning_sources(is_active);
CREATE INDEX idx_coin_spending_categories_available ON coin_spending_categories(is_available);
CREATE INDEX idx_coin_bonus_events_active ON coin_bonus_events(is_active, start_date, end_date);
CREATE INDEX idx_user_bonus_events_user_id ON user_bonus_events(user_id);

-- Insert default earning sources
INSERT INTO coin_earning_sources (source_name, base_amount, description, multiplier_factors) VALUES
('task_completion', 10, 'Complete a task', '{"difficulty_easy": 1.0, "difficulty_medium": 1.5, "difficulty_hard": 2.0}'),
('daily_streak', 5, 'Daily streak bonus', '{"streak_multiplier": 0.1}'),
('achievement_unlock', 50, 'Unlock an achievement', '{"rarity_common": 1.0, "rarity_rare": 2.0, "rarity_legendary": 5.0}'),
('tutorial_completion', 15, 'Complete a tutorial step', '{}'),
('social_interaction', 3, 'Like, comment, or share', '{}'),
('first_login_daily', 5, 'First login of the day', '{}'),
('crashout_post', 2, 'Create a crashout post', '{}'),
('milestone_reached', 100, 'Reach a significant milestone', '{"milestone_level": 1.0}'),
('bonus_event', 25, 'Participate in special events', '{}'),
('referral_bonus', 200, 'Successful user referral', '{}')
ON CONFLICT (source_name) DO NOTHING;

-- Insert default spending categories
INSERT INTO coin_spending_categories (category_name, item_name, cost, description, requirements, metadata) VALUES
('streak_recovery', 'Streak Freeze', 50, 'Freeze your streak for one missed day', '{}', '{"type": "freeze", "duration": "1_day"}'),
('streak_recovery', 'Streak Extend', 100, 'Extend your streak deadline by 12 hours', '{}', '{"type": "extend", "duration": "12_hours"}'),
('streak_recovery', 'Bonus Day', 75, 'Add a bonus completion day to your streak', '{}', '{"type": "bonus_day", "effect": "add_completion"}'),
('customization', 'Stu Hat Collection', 150, 'Unlock new hats for Stu mascot', '{"level": 5}', '{"category": "cosmetic", "items": ["wizard_hat", "graduation_cap", "party_hat"]}'),
('customization', 'Theme Color Pack', 200, 'Unlock premium color themes', '{"level": 10}', '{"category": "cosmetic", "themes": ["galaxy", "sunset", "ocean"]}'),
('boosts', 'XP Multiplier 2x', 300, 'Double XP for 24 hours', '{"level": 15}', '{"type": "multiplier", "factor": 2.0, "duration": "24_hours"}'),
('boosts', 'Streak Shield', 500, 'Protect streak from breaking for 3 days', '{"current_streak": 14}', '{"type": "protection", "duration": "3_days"}'),
('social', 'Study Group Premium', 400, 'Create premium study groups with extra features', '{"level": 20}', '{"type": "feature_unlock", "features": ["large_groups", "custom_themes", "priority_support"]}'),
('wellness', 'Stress Relief Pack', 100, 'Unlock premium stress relief activities', '{}', '{"type": "feature_unlock", "activities": ["meditation_timer", "breathing_exercises", "calming_sounds"]}'),
('productivity', 'AI Assistant Boost', 250, 'Extra AI suggestions for 7 days', '{"level": 8}', '{"type": "service_boost", "duration": "7_days", "boost_type": "ai_suggestions"}}')
ON CONFLICT (category_name, item_name) DO NOTHING;

-- Function to get user coin balance
CREATE OR REPLACE FUNCTION get_user_coin_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    coin_balance INTEGER;
BEGIN
    SELECT COALESCE(coins, 0) INTO coin_balance
    FROM user_stats
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(coin_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add coins to user account
CREATE OR REPLACE FUNCTION add_coins_to_user(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    transaction_successful BOOLEAN := false;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Coin amount must be positive';
    END IF;
    
    -- Update user stats
    UPDATE user_stats 
    SET coins = coins + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description, metadata)
    VALUES (p_user_id, p_amount, 'earned', p_source, p_description, p_metadata);
    
    transaction_successful := true;
    RETURN transaction_successful;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add coins: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend coins from user account
CREATE OR REPLACE FUNCTION spend_user_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    transaction_successful BOOLEAN := false;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Coin amount must be positive';
    END IF;
    
    -- Get current balance
    SELECT COALESCE(coins, 0) INTO current_balance
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Check if user has enough coins
    IF current_balance >= p_amount THEN
        -- Update user stats
        UPDATE user_stats 
        SET coins = coins - p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Record transaction
        INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description, metadata)
        VALUES (p_user_id, -p_amount, 'spent', p_source, p_description, p_metadata);
        
        transaction_successful := true;
    ELSE
        RAISE EXCEPTION 'Insufficient coins. Current balance: %, Required: %', current_balance, p_amount;
    END IF;
    
    RETURN transaction_successful;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to spend coins: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate coin earning with bonuses
CREATE OR REPLACE FUNCTION calculate_coin_earning(
    p_user_id UUID,
    p_source TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    base_amount INTEGER;
    final_amount INTEGER;
    user_level INTEGER;
    user_streak INTEGER;
    multiplier DECIMAL(3,2) := 1.0;
    bonus_amount INTEGER := 0;
BEGIN
    -- Get base amount for source
    SELECT base_amount INTO base_amount
    FROM coin_earning_sources
    WHERE source_name = p_source AND is_active = true;
    
    IF base_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get user stats for multiplier calculations
    SELECT level, current_streak INTO user_level, user_streak
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Apply level-based bonus (1% per level)
    multiplier := multiplier + (COALESCE(user_level, 1) * 0.01);
    
    -- Apply streak bonus for task completion (0.5% per day up to 50%)
    IF p_source = 'task_completion' THEN
        multiplier := multiplier + LEAST(COALESCE(user_streak, 0) * 0.005, 0.5);
    END IF;
    
    -- Check for active bonus events
    SELECT COALESCE(MAX(be.multiplier), 1.0), COALESCE(MAX(be.bonus_amount), 0)
    INTO multiplier, bonus_amount
    FROM coin_bonus_events be
    WHERE be.is_active = true
    AND (be.start_date IS NULL OR be.start_date <= NOW())
    AND (be.end_date IS NULL OR be.end_date >= NOW());
    
    -- Calculate final amount
    final_amount := ROUND(base_amount * multiplier) + bonus_amount;
    
    RETURN GREATEST(final_amount, 1); -- Minimum 1 coin
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user transaction history
CREATE OR REPLACE FUNCTION get_user_coin_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    amount INTEGER,
    transaction_type TEXT,
    source TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.amount,
        ct.transaction_type,
        ct.source,
        ct.description,
        ct.metadata,
        ct.created_at
    FROM coin_transactions ct
    WHERE ct.user_id = p_user_id
    ORDER BY ct.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coin spending analytics
CREATE OR REPLACE FUNCTION get_coin_analytics(p_user_id UUID)
RETURNS TABLE (
    total_earned INTEGER,
    total_spent INTEGER,
    current_balance INTEGER,
    transactions_count INTEGER,
    most_common_earning_source TEXT,
    most_common_spending_category TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0)::INTEGER as total_earned,
        COALESCE(SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END), 0)::INTEGER as total_spent,
        get_user_coin_balance(p_user_id) as current_balance,
        COUNT(*)::INTEGER as transactions_count,
        (
            SELECT ct2.source
            FROM coin_transactions ct2
            WHERE ct2.user_id = p_user_id AND ct2.amount > 0
            GROUP BY ct2.source
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_common_earning_source,
        (
            SELECT ct3.source
            FROM coin_transactions ct3
            WHERE ct3.user_id = p_user_id AND ct3.amount < 0
            GROUP BY ct3.source
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_common_spending_category
    FROM coin_transactions ct
    WHERE ct.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically update user stats updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coin_earning_sources_updated_at
    BEFORE UPDATE ON coin_earning_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coin_spending_categories_updated_at
    BEFORE UPDATE ON coin_spending_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_earning_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_spending_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_bonus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bonus_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own coin transactions" ON coin_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert coin transactions" ON coin_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view earning sources" ON coin_earning_sources
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view spending categories" ON coin_spending_categories
    FOR SELECT USING (is_available = true);

CREATE POLICY "Users can view active bonus events" ON coin_bonus_events
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their bonus event participation" ON user_bonus_events
    FOR ALL USING (auth.uid() = user_id);