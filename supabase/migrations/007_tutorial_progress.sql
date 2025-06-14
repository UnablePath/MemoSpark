-- Migration: Create tutorial progress tracking
-- Description: Track user tutorial progress and completion state

-- Create tutorial steps enum
DO $$ BEGIN
    CREATE TYPE tutorial_step_enum AS ENUM (
        'welcome',
        'navigation',
        'task_creation',
        'ai_suggestions',
        'social_features',
        'crashout_room',
        'achievements',
        'completion'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tutorial progress table
CREATE TABLE IF NOT EXISTS tutorial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    current_step tutorial_step_enum NOT NULL DEFAULT 'welcome',
    completed_steps tutorial_step_enum[] DEFAULT '{}',
    is_completed BOOLEAN DEFAULT false,
    is_skipped BOOLEAN DEFAULT false,
    step_data JSONB DEFAULT '{}', -- Store step-specific data like preferences
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create tutorial analytics table for improvement insights
CREATE TABLE IF NOT EXISTS tutorial_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    step tutorial_step_enum NOT NULL,
    action TEXT NOT NULL, -- 'started', 'completed', 'skipped', 'replay'
    time_spent_seconds INTEGER,
    interaction_count INTEGER DEFAULT 0,
    stu_interactions INTEGER DEFAULT 0,
    help_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tutorial rewards table
CREATE TABLE IF NOT EXISTS tutorial_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step tutorial_step_enum NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('coins', 'achievement', 'unlock')),
    reward_value INTEGER NOT NULL,
    reward_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tutorial rewards
INSERT INTO tutorial_rewards (step, reward_type, reward_value, reward_data) VALUES
('welcome', 'coins', 10, '{"message": "Welcome to StudySpark!"}'),
('navigation', 'coins', 5, '{"message": "You''re getting the hang of this!"}'),
('task_creation', 'coins', 15, '{"message": "Great job creating your first task!"}'),
('ai_suggestions', 'coins', 20, '{"message": "AI is now your study buddy!"}'),
('social_features', 'coins', 10, '{"message": "Ready to connect with others!"}'),
('crashout_room', 'coins', 10, '{"message": "Stress relief unlocked!"}'),
('achievements', 'coins', 5, '{"message": "You understand the game now!"}'),
('completion', 'achievement', 100, '{"achievement_type": "tutorial_master", "message": "Tutorial completed! You''re ready to conquer your studies!"}')
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tutorial_progress_updated_at
    BEFORE UPDATE ON tutorial_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own tutorial progress" ON tutorial_progress
    FOR ALL USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can insert their own tutorial analytics" ON tutorial_analytics
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can view their own tutorial analytics" ON tutorial_analytics
    FOR SELECT USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Anyone can view tutorial rewards" ON tutorial_rewards
    FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_tutorial_progress_user_id ON tutorial_progress(user_id);
CREATE INDEX idx_tutorial_progress_current_step ON tutorial_progress(current_step);
CREATE INDEX idx_tutorial_analytics_user_id ON tutorial_analytics(user_id);
CREATE INDEX idx_tutorial_analytics_step_action ON tutorial_analytics(step, action);
CREATE INDEX idx_tutorial_rewards_step ON tutorial_rewards(step);

-- Comments for documentation
COMMENT ON TABLE tutorial_progress IS 'Tracks individual user tutorial progress and completion state';
COMMENT ON TABLE tutorial_analytics IS 'Captures tutorial interaction data for UX improvements';
COMMENT ON TABLE tutorial_rewards IS 'Defines rewards given at each tutorial step';
COMMENT ON COLUMN tutorial_progress.step_data IS 'JSON data storing step-specific user choices and preferences';
COMMENT ON COLUMN tutorial_analytics.metadata IS 'Additional context data for analytics and debugging'; 