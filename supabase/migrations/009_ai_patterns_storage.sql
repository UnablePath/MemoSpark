-- Migration: AI Patterns and Scheduling Storage
-- Description: Store user AI patterns, preferences, and scheduling data for learning

-- Create table for storing user AI patterns and preferences
CREATE TABLE user_ai_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create table for storing scheduled tasks (for tracking and learning)
CREATE TABLE scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS Policies for user_ai_patterns table
CREATE POLICY "Users can view their own AI patterns" ON user_ai_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI patterns" ON user_ai_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI patterns" ON user_ai_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI patterns" ON user_ai_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scheduled_tasks table
CREATE POLICY "Users can view their own scheduled tasks" ON scheduled_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled tasks" ON scheduled_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled tasks" ON scheduled_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled tasks" ON scheduled_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE user_ai_patterns IS 'Stores user AI learning patterns and scheduling preferences';
COMMENT ON TABLE scheduled_tasks IS 'Tracks scheduled tasks for learning and optimization';

COMMENT ON COLUMN user_ai_patterns.pattern_data IS 'JSON data containing learned patterns (productivity hours, difficulty trends, etc.)';
COMMENT ON COLUMN user_ai_patterns.preferences IS 'JSON data containing user preferences for scheduling';

COMMENT ON COLUMN scheduled_tasks.confidence_score IS 'AI confidence score (0-1) for this scheduling decision';
COMMENT ON COLUMN scheduled_tasks.reasoning IS 'AI reasoning for why this time slot was chosen';
COMMENT ON COLUMN scheduled_tasks.was_rescheduled IS 'Whether this task was moved from its original schedule';
COMMENT ON COLUMN scheduled_tasks.reschedule_reason IS 'Reason for rescheduling if applicable'; 