-- Migration: Fix AI Patterns table for Clerk integration
-- Description: Update user_ai_patterns table to use clerk_user_id instead of UUID user_id

-- First, let's check if the old table exists and drop it
DROP TABLE IF EXISTS user_ai_patterns CASCADE;

-- Create the new user_ai_patterns table with proper Clerk integration
CREATE TABLE user_ai_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    
    -- Schedule patterns
    preferred_study_times JSONB, -- Array of time slots
    productivity_peaks JSONB, -- Times when user is most productive
    break_preferences JSONB, -- Preferred break duration and frequency
    
    -- Learning patterns
    learning_style TEXT, -- 'visual', 'auditory', 'kinesthetic', 'mixed'
    attention_span INTEGER, -- Minutes
    difficulty_preference TEXT, -- 'easy_to_hard', 'hard_first', 'mixed'
    
    -- Stress and wellness patterns
    stress_triggers JSONB, -- Array of stress triggers
    stress_relief_preferences JSONB, -- Preferred stress relief activities
    motivation_factors JSONB, -- What motivates the user
    
    -- Task management patterns
    task_completion_style TEXT, -- 'batch', 'sequential', 'priority_based'
    deadline_pressure_response TEXT, -- 'thrives', 'struggles', 'balanced'
    collaboration_preference TEXT, -- 'solo', 'group', 'mixed'
    
    -- Notification preferences
    notification_timing JSONB, -- When to send notifications
    reminder_frequency TEXT, -- 'low', 'medium', 'high'
    
    -- Confidence scores for each pattern (0-1)
    pattern_confidence JSONB DEFAULT '{}',
    
    -- Analysis metadata
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    data_sources JSONB DEFAULT '[]', -- Which questionnaires contributed to this pattern
    analysis_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create scheduled_tasks table with proper Clerk integration
DROP TABLE IF EXISTS scheduled_tasks CASCADE;

CREATE TABLE scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    was_rescheduled BOOLEAN DEFAULT false,
    reschedule_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_ai_patterns_user_id ON user_ai_patterns(user_id);
CREATE INDEX idx_user_ai_patterns_updated_at ON user_ai_patterns(updated_at);

CREATE INDEX idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_task_id ON scheduled_tasks(task_id);
CREATE INDEX idx_scheduled_tasks_scheduled_start ON scheduled_tasks(scheduled_start);
CREATE INDEX idx_scheduled_tasks_created_at ON scheduled_tasks(created_at);

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_ai_patterns_updated_at
    BEFORE UPDATE ON user_ai_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at
    BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_ai_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_ai_patterns table using Clerk authentication
CREATE POLICY "Users can view their own AI patterns" ON user_ai_patterns
    FOR SELECT USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can insert their own AI patterns" ON user_ai_patterns
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can update their own AI patterns" ON user_ai_patterns
    FOR UPDATE USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can delete their own AI patterns" ON user_ai_patterns
    FOR DELETE USING ((auth.jwt()->>'sub')::text = user_id);

-- RLS Policies for scheduled_tasks table using Clerk authentication
CREATE POLICY "Users can view their own scheduled tasks" ON scheduled_tasks
    FOR SELECT USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can insert their own scheduled tasks" ON scheduled_tasks
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can update their own scheduled tasks" ON scheduled_tasks
    FOR UPDATE USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "Users can delete their own scheduled tasks" ON scheduled_tasks
    FOR DELETE USING ((auth.jwt()->>'sub')::text = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ai_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_tasks TO authenticated;

-- Add helpful comments
COMMENT ON TABLE user_ai_patterns IS 'Stores user AI learning patterns and scheduling preferences with Clerk integration';
COMMENT ON TABLE scheduled_tasks IS 'Tracks scheduled tasks for learning and optimization with Clerk integration';

COMMENT ON COLUMN user_ai_patterns.user_id IS 'References profiles.clerk_user_id for Clerk integration';
COMMENT ON COLUMN scheduled_tasks.user_id IS 'References profiles.clerk_user_id for Clerk integration';
COMMENT ON COLUMN user_ai_patterns.pattern_confidence IS 'JSON data containing confidence scores for each pattern type';
COMMENT ON COLUMN scheduled_tasks.confidence_score IS 'AI confidence score (0-1) for this scheduling decision';
COMMENT ON COLUMN scheduled_tasks.reasoning IS 'AI reasoning for why this time slot was chosen'; 