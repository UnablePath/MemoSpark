-- Fix daily_streaks table to use TEXT user_id for Clerk compatibility
-- Drop the existing table if it exists (since it's incompatible)
DROP TABLE IF EXISTS daily_streaks CASCADE;

-- Recreate daily_streaks table with TEXT user_id
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

-- Create indexes for performance
CREATE INDEX idx_daily_streaks_user_date ON daily_streaks(user_id, date DESC);
CREATE INDEX idx_daily_streaks_user_completed ON daily_streaks(user_id, completed, date DESC);

-- Temporarily disable RLS for development (will be re-enabled later with proper policies)
ALTER TABLE daily_streaks DISABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_streaks_updated_at 
    BEFORE UPDATE ON daily_streaks
    FOR EACH ROW 
    EXECUTE FUNCTION update_daily_streaks_updated_at();

-- Update the calculate_current_streak function to work with TEXT user_id
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