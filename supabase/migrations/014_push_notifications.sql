-- Push Notification System Migration
-- This migration creates tables for comprehensive push notification management

-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Notification categories for different types of notifications
CREATE TABLE IF NOT EXISTS notification_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  default_enabled BOOLEAN DEFAULT true,
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES notification_categories(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50),
  smart_timing BOOLEAN DEFAULT true,
  frequency_limit INTEGER DEFAULT 5, -- max notifications per hour
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Notification queue for scheduled/delayed notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES notification_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  icon_url VARCHAR(500),
  badge_url VARCHAR(500),
  action_url VARCHAR(500),
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
  priority INTEGER DEFAULT 1, -- 1=low, 2=normal, 3=high, 4=urgent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification analytics and tracking
CREATE TABLE IF NOT EXISTS notification_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES notification_categories(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notification_queue(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL, -- sent, delivered, clicked, dismissed
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  additional_data JSONB DEFAULT '{}'
);

-- Insert default notification categories
INSERT INTO notification_categories (name, display_name, description, default_enabled, icon, color) VALUES
('task_reminders', 'Task Reminders', 'Notifications about upcoming tasks and deadlines', true, '📋', '#3B82F6'),
('achievements', 'Achievements & Rewards', 'Celebration notifications for milestones and achievements', true, '🏆', '#10B981'),
('study_breaks', 'Study Break Suggestions', 'Smart recommendations for optimal break timing', true, '☕', '#F59E0B'),
('streaks', 'Streak Notifications', 'Daily streak reminders and celebrations', true, '🔥', '#EF4444'),
('social', 'Social Updates', 'Study group messages and peer activities', true, '👥', '#8B5CF6'),
('system', 'System Notifications', 'Important app updates and maintenance alerts', true, '⚙️', '#6B7280'),
('wellness', 'Wellness Check-ins', 'Stress level monitoring and wellness reminders', true, '💚', '#06B6D4'),
('ai_suggestions', 'AI Suggestions', 'Personalized study recommendations from AI', true, '🤖', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON notification_analytics(event_type);

-- Create RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Notification queue policies
CREATE POLICY "Users can view their own notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update notification queue
CREATE POLICY "Service role can manage notification queue" ON notification_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Notification analytics policies
CREATE POLICY "Users can view their own notification analytics" ON notification_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notification analytics" ON notification_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- Notification categories are readable by all authenticated users
CREATE POLICY "Authenticated users can read notification categories" ON notification_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to automatically create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category_id, enabled, smart_timing, frequency_limit)
  SELECT NEW.id, id, default_enabled, true, 5
  FROM notification_categories;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when a user is created
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Function to update notification queue status and track analytics
CREATE OR REPLACE FUNCTION track_notification_event(
  p_notification_id UUID,
  p_event_type VARCHAR(20),
  p_user_agent TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  notification_record RECORD;
BEGIN
  -- Get notification details
  SELECT user_id, category_id INTO notification_record
  FROM notification_queue
  WHERE id = p_notification_id;
  
  -- Insert analytics record
  INSERT INTO notification_analytics (
    user_id, 
    category_id, 
    notification_id, 
    event_type, 
    user_agent, 
    additional_data
  ) VALUES (
    notification_record.user_id,
    notification_record.category_id,
    p_notification_id,
    p_event_type,
    p_user_agent,
    p_additional_data
  );
  
  -- Update notification status if sent
  IF p_event_type = 'sent' THEN
    UPDATE notification_queue 
    SET status = 'sent', sent_at = NOW()
    WHERE id = p_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 