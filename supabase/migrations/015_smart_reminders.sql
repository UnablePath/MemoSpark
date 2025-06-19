-- Enhanced Smart Reminder System Database Schema
-- Migration: 015_smart_reminders.sql

-- User reminder patterns table for AI learning
CREATE TABLE IF NOT EXISTS user_reminder_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  preferred_study_times TEXT[] DEFAULT ARRAY['09:00', '14:00', '20:00'],
  average_task_duration INTEGER DEFAULT 60, -- minutes
  completion_rate DECIMAL(3,2) DEFAULT 0.80, -- 0.00 to 1.00
  procrastination_tendency DECIMAL(3,2) DEFAULT 0.30, -- 0.00 to 1.00
  stress_level INTEGER DEFAULT 5, -- 1-10 scale
  preferred_reminder_frequency TEXT DEFAULT 'normal' CHECK (preferred_reminder_frequency IN ('minimal', 'normal', 'frequent')),
  quiet_hours JSONB DEFAULT '{"start": "22:00", "end": "08:00"}',
  timezone TEXT DEFAULT 'UTC',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Reminder analytics table for tracking effectiveness
CREATE TABLE IF NOT EXISTS reminder_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('scheduled', 'snooze', 'overdue', 'smart')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  user_response TEXT DEFAULT 'ignored' CHECK (user_response IN ('ignored', 'snoozed', 'completed', 'rescheduled')),
  response_time_minutes INTEGER DEFAULT 0,
  effectiveness_score INTEGER DEFAULT 0 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced notification queue for smart reminders
CREATE TABLE IF NOT EXISTS smart_reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'smart',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  message TEXT NOT NULL,
  stu_animation TEXT DEFAULT 'encouraging',
  priority_level INTEGER DEFAULT 5 CHECK (priority_level >= 1 AND priority_level <= 10),
  snooze_options INTEGER[] DEFAULT ARRAY[5, 15, 30, 60],
  is_final_reminder BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  onesignal_notification_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminder preferences table (user-configurable settings)
CREATE TABLE IF NOT EXISTS reminder_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'normal' CHECK (frequency IN ('minimal', 'normal', 'frequent')),
  quiet_hours_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  weekends_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  stu_animations BOOLEAN DEFAULT TRUE,
  smart_timing BOOLEAN DEFAULT TRUE,
  adaptive_scheduling BOOLEAN DEFAULT TRUE,
  snooze_options INTEGER[] DEFAULT ARRAY[5, 15, 30, 60],
  default_reminder_offsets INTEGER[] DEFAULT ARRAY[1440, 60, 15], -- 1 day, 1 hour, 15 min
  procrastination_compensation DECIMAL(3,2) DEFAULT 0.30,
  stress_level_adjustment BOOLEAN DEFAULT TRUE,
  priority_based_timing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reminder_patterns_user_id ON user_reminder_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_analytics_user_id ON reminder_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_analytics_sent_at ON reminder_analytics(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_analytics_task_id ON reminder_analytics(task_id);
CREATE INDEX IF NOT EXISTS idx_smart_reminder_queue_user_id ON smart_reminder_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_reminder_queue_scheduled_for ON smart_reminder_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_smart_reminder_queue_status ON smart_reminder_queue(status);
CREATE INDEX IF NOT EXISTS idx_reminder_preferences_user_id ON reminder_preferences(user_id);

-- RLS Policies
ALTER TABLE user_reminder_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_reminder_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;

-- User can only access their own reminder patterns
CREATE POLICY user_reminder_patterns_policy ON user_reminder_patterns
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- User can only access their own reminder analytics
CREATE POLICY reminder_analytics_policy ON reminder_analytics
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- User can only access their own reminder queue
CREATE POLICY smart_reminder_queue_policy ON smart_reminder_queue
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- User can only access their own preferences
CREATE POLICY reminder_preferences_policy ON reminder_preferences
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- Service role policies for server-side operations
CREATE POLICY service_user_reminder_patterns_policy ON user_reminder_patterns
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_reminder_analytics_policy ON reminder_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_smart_reminder_queue_policy ON smart_reminder_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_reminder_preferences_policy ON reminder_preferences
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for automatic pattern learning
CREATE OR REPLACE FUNCTION update_user_reminder_pattern()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user patterns based on task completion behavior
  INSERT INTO user_reminder_patterns (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    last_updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update patterns when tasks are completed
CREATE TRIGGER update_reminder_patterns_on_task_completion
  AFTER UPDATE OF completed ON tasks
  FOR EACH ROW
  WHEN (NEW.completed = TRUE AND OLD.completed = FALSE)
  EXECUTE FUNCTION update_user_reminder_pattern();

-- Function to clean up old analytics data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_reminder_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM reminder_analytics
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM smart_reminder_queue
  WHERE status IN ('sent', 'failed', 'cancelled')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_reminder_patterns IS 'Stores AI learning data about user behavior patterns for smart reminder optimization';
COMMENT ON TABLE reminder_analytics IS 'Tracks effectiveness and user responses to reminders for continuous AI improvement';
COMMENT ON TABLE smart_reminder_queue IS 'Enhanced queue for managing smart reminders with Stu animations and adaptive timing';
COMMENT ON TABLE reminder_preferences IS 'User-configurable preferences for the proactive reminder system';

COMMENT ON COLUMN user_reminder_patterns.completion_rate IS 'Historical task completion rate (0.0 to 1.0)';
COMMENT ON COLUMN user_reminder_patterns.procrastination_tendency IS 'Tendency to delay tasks (0.0 = never, 1.0 = always)';
COMMENT ON COLUMN reminder_analytics.effectiveness_score IS 'Reminder effectiveness rating (1-10 scale)';
COMMENT ON COLUMN smart_reminder_queue.stu_animation IS 'Stu mascot animation type for this reminder';
COMMENT ON COLUMN reminder_preferences.procrastination_compensation IS 'How much earlier to send reminders for procrastinators';

-- Insert default preferences for existing users
INSERT INTO reminder_preferences (user_id)
SELECT DISTINCT user_id FROM profiles
ON CONFLICT (user_id) DO NOTHING; 