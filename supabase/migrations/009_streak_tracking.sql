-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table for daily streak tracking
CREATE TABLE daily_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completion_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
COMMENT ON TABLE "daily_streaks" IS 'Tracks daily completion status for streak calculations.';

-- Table for streak milestones
CREATE TABLE streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_length INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('weekly', 'monthly', 'milestone', 'personal_best')),
  rewarded BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "streak_milestones" IS 'Records streak milestones and their rewards.';

-- Table for streak recovery attempts
CREATE TABLE streak_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_streak INTEGER NOT NULL,
  recovery_date DATE NOT NULL,
  recovery_type TEXT NOT NULL CHECK (recovery_type IN ('freeze', 'extend', 'bonus_day')),
  cost_coins INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recovery_date, recovery_type)
);
COMMENT ON TABLE "streak_recovery" IS 'Tracks streak recovery mechanisms and their usage.';

-- Table for streak sharing and social features
CREATE TABLE streak_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_length INTEGER NOT NULL,
  message TEXT,
  platform TEXT CHECK (platform IN ('internal', 'twitter', 'facebook', 'instagram')),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "streak_shares" IS 'Tracks streak sharing activities and social engagement.';

-- Table for streak predictions and analytics
CREATE TABLE streak_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  predicted_completion_probability DECIMAL(3,2) CHECK (predicted_completion_probability BETWEEN 0 AND 1),
  factors JSONB, -- Store prediction factors like study_time, day_of_week, etc.
  actual_completion BOOLEAN,
  accuracy DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prediction_date)
);
COMMENT ON TABLE "streak_predictions" IS 'AI predictions for streak maintenance and their accuracy.';

-- Indexes for performance
CREATE INDEX idx_daily_streaks_user_date ON daily_streaks(user_id, date DESC);
CREATE INDEX idx_daily_streaks_user_completed ON daily_streaks(user_id, completed, date DESC);
CREATE INDEX idx_streak_milestones_user_id ON streak_milestones(user_id, achieved_at DESC);
CREATE INDEX idx_streak_recovery_user_id ON streak_recovery(user_id, created_at DESC);
CREATE INDEX idx_streak_shares_user_id ON streak_shares(user_id, shared_at DESC);
CREATE INDEX idx_streak_predictions_user_date ON streak_predictions(user_id, prediction_date DESC);

-- Row Level Security (RLS) Policies
-- Daily Streaks
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily streaks" ON daily_streaks
  FOR ALL
  USING (auth.uid() = user_id);

-- Streak Milestones
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own streak milestones" ON streak_milestones
  FOR ALL
  USING (auth.uid() = user_id);

-- Streak Recovery
ALTER TABLE streak_recovery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own streak recovery" ON streak_recovery
  FOR ALL
  USING (auth.uid() = user_id);

-- Streak Shares
ALTER TABLE streak_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public streak shares" ON streak_shares
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own streak shares" ON streak_shares
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = user_id);

-- Streak Predictions
ALTER TABLE streak_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own streak predictions" ON streak_predictions
  FOR ALL
  USING (auth.uid() = user_id);

-- Functions for streak calculations
CREATE OR REPLACE FUNCTION calculate_current_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    max_check_days INTEGER := 365; -- Prevent infinite loops
    days_checked INTEGER := 0;
BEGIN
    -- Count consecutive completed days working backwards from today
    WHILE days_checked < max_check_days LOOP
        -- Check if this date has completion
        IF EXISTS (
            SELECT 1 FROM daily_streaks 
            WHERE user_id = p_user_id 
            AND date = check_date 
            AND completed = true
        ) THEN
            current_streak := current_streak + 1;
            check_date := check_date - INTERVAL '1 day';
            days_checked := days_checked + 1;
        ELSE
            -- If we're checking today and it's not completed, that's okay
            -- But if we're checking a past day and it's not completed, streak is broken
            IF check_date < CURRENT_DATE THEN
                EXIT;
            ELSE
                check_date := check_date - INTERVAL '1 day';
                days_checked := days_checked + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_streak_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    new_streak INTEGER;
    longest_streak INTEGER;
BEGIN
    -- Only process if marking as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Calculate new current streak
        new_streak := calculate_current_streak(NEW.user_id);
        
        -- Get current longest streak
        SELECT COALESCE(longest_streak, 0) INTO longest_streak
        FROM user_stats 
        WHERE user_id = NEW.user_id;
        
        -- Update user stats
        INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity, updated_at)
        VALUES (NEW.user_id, new_streak, GREATEST(longest_streak, new_streak), NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            current_streak = new_streak,
            longest_streak = GREATEST(user_stats.longest_streak, new_streak),
            last_activity = NOW(),
            updated_at = NOW();
            
        -- Check for milestone achievements
        PERFORM check_streak_milestone(NEW.user_id, new_streak);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_streak_milestone(p_user_id UUID, p_streak_length INTEGER)
RETURNS VOID AS $$
DECLARE
    milestone_type TEXT;
BEGIN
    -- Determine milestone type
    CASE 
        WHEN p_streak_length % 30 = 0 THEN milestone_type := 'monthly';
        WHEN p_streak_length % 7 = 0 THEN milestone_type := 'weekly';
        WHEN p_streak_length IN (10, 25, 50, 100, 200, 365, 500, 1000) THEN milestone_type := 'milestone';
        ELSE RETURN; -- No milestone reached
    END CASE;
    
    -- Record milestone if not already recorded
    INSERT INTO streak_milestones (user_id, streak_length, milestone_type)
    VALUES (p_user_id, p_streak_length, milestone_type)
    ON CONFLICT (user_id, streak_length) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic streak updates
CREATE TRIGGER trigger_update_streak_on_completion
    AFTER INSERT OR UPDATE ON daily_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_streak_on_completion();

-- Function to mark daily completion
CREATE OR REPLACE FUNCTION mark_daily_completion(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_tasks_completed INTEGER DEFAULT 1,
    p_points_earned INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
    completion_successful BOOLEAN := false;
BEGIN
    INSERT INTO daily_streaks (user_id, date, completed, tasks_completed, points_earned, completion_time)
    VALUES (p_user_id, p_date, true, p_tasks_completed, p_points_earned, NOW())
    ON CONFLICT (user_id, date) DO UPDATE SET
        completed = true,
        tasks_completed = daily_streaks.tasks_completed + p_tasks_completed,
        points_earned = daily_streaks.points_earned + p_points_earned,
        completion_time = COALESCE(daily_streaks.completion_time, NOW()),
        updated_at = NOW();
        
    completion_successful := true;
    RETURN completion_successful;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use streak recovery
CREATE OR REPLACE FUNCTION use_streak_recovery(
    p_user_id UUID,
    p_recovery_type TEXT,
    p_target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS BOOLEAN AS $$
DECLARE
    recovery_cost INTEGER;
    user_coins INTEGER;
    recovery_successful BOOLEAN := false;
BEGIN
    -- Determine recovery cost
    CASE p_recovery_type
        WHEN 'freeze' THEN recovery_cost := 50;
        WHEN 'extend' THEN recovery_cost := 100;
        WHEN 'bonus_day' THEN recovery_cost := 75;
        ELSE RAISE EXCEPTION 'Invalid recovery type: %', p_recovery_type;
    END CASE;
    
    -- Check if user has enough coins
    SELECT COALESCE(coins, 0) INTO user_coins
    FROM user_stats 
    WHERE user_id = p_user_id;
    
    IF user_coins >= recovery_cost THEN
        -- Deduct coins
        UPDATE user_stats 
        SET coins = coins - recovery_cost, updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Record recovery usage
        INSERT INTO streak_recovery (user_id, original_streak, recovery_date, recovery_type, cost_coins, success, used_at)
        SELECT p_user_id, current_streak, p_target_date, p_recovery_type, recovery_cost, true, NOW()
        FROM user_stats 
        WHERE user_id = p_user_id;
        
        -- Mark the target date as completed (recovery effect)
        PERFORM mark_daily_completion(p_user_id, p_target_date, 0, 0);
        
        recovery_successful := true;
    END IF;
    
    RETURN recovery_successful;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 