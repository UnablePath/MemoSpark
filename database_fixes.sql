-- Manual Database Fixes for StudySpark
-- Run this script in Supabase SQL Editor to fix authentication and table issues

-- 1. Temporarily disable RLS on existing tables for development
ALTER TABLE coin_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- 2. Create the missing daily_streaks table with correct schema
DROP TABLE IF EXISTS daily_streaks CASCADE;

CREATE TABLE daily_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    activity_count INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    tasks_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    completion_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 3. Create indexes for performance
CREATE INDEX idx_daily_streaks_user_date ON daily_streaks(user_id, date DESC);
CREATE INDEX idx_daily_streaks_user_completed ON daily_streaks(user_id, completed, date DESC);

-- 4. Disable RLS on daily_streaks for development
ALTER TABLE daily_streaks DISABLE ROW LEVEL SECURITY;

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
CREATE TRIGGER update_daily_streaks_updated_at 
    BEFORE UPDATE ON daily_streaks
    FOR EACH ROW 
    EXECUTE FUNCTION update_daily_streaks_updated_at();

-- 7. Update the calculate_current_streak function to work with TEXT user_id
CREATE OR REPLACE FUNCTION calculate_current_streak(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    max_check_days INTEGER := 365;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Insert some sample data for testing (optional)
INSERT INTO daily_streaks (user_id, date, completed, tasks_completed, points_earned)
VALUES 
    ('user_2x6ScOzuNYSkQs7COBP9DkrdHDC', CURRENT_DATE - INTERVAL '2 days', true, 3, 150),
    ('user_2x6ScOzuNYSkQs7COBP9DkrdHDC', CURRENT_DATE - INTERVAL '1 day', true, 5, 250),
    ('user_2x6ScOzuNYSkQs7COBP9DkrdHDC', CURRENT_DATE, false, 0, 0)
ON CONFLICT (user_id, date) DO NOTHING;

-- 9. Insert sample coin balance for testing (optional)
INSERT INTO coin_balances (user_id, current_balance, lifetime_earned, lifetime_spent)
VALUES ('user_2x6ScOzuNYSkQs7COBP9DkrdHDC', 500, 1000, 500)
ON CONFLICT (user_id) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    lifetime_earned = EXCLUDED.lifetime_earned,
    lifetime_spent = EXCLUDED.lifetime_spent;

-- Note: After testing, you should re-enable RLS with proper policies:
-- ALTER TABLE coin_balances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;
-- 
-- And create appropriate RLS policies that work with your authentication system. 