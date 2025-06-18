-- Enhanced Push Notifications System with OneSignal Integration
-- Migration 014: Complete OneSignal Push Notification System

-- ===============================================
-- 1. Push Subscriptions Table (Enhanced for OneSignal)
-- ===============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- OneSignal Integration
  onesignal_player_id VARCHAR(255) UNIQUE,
  external_user_id VARCHAR(255), -- Links to Clerk user ID
  
  -- Legacy VAPID Support (for fallback)
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  
  -- Subscription metadata
  user_agent TEXT,
  device_type VARCHAR(50) DEFAULT 'web',
  is_active BOOLEAN DEFAULT true,
  
  -- Notification preferences
  categories JSON DEFAULT '{}',
  quiet_hours JSON DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}',
  frequency_limit JSON DEFAULT '{"daily": 10, "hourly": 3}',
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_onesignal_player_id ON push_subscriptions(onesignal_player_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_external_user_id ON push_subscriptions(external_user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- ===============================================
-- 2. Notification Categories (OneSignal Compatible)
-- ===============================================
CREATE TABLE IF NOT EXISTS notification_categories (
  id SERIAL PRIMARY KEY,
  category_key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  default_enabled BOOLEAN DEFAULT true,
  
  -- OneSignal configuration
  onesignal_channel_id VARCHAR(100),
  priority INTEGER DEFAULT 6, -- OneSignal priority (1-10)
  sound VARCHAR(100) DEFAULT 'default',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert OneSignal-optimized notification categories
INSERT INTO notification_categories (category_key, name, description, icon, default_enabled, onesignal_channel_id, priority) VALUES
('task_reminders', 'Task Reminders', 'Notifications for upcoming tasks and deadlines', 'alarm-clock', true, 'task_reminders', 8),
('achievements', 'Achievements', 'Celebration notifications for completed goals', 'trophy', true, 'achievements', 6),
('study_breaks', 'Study Breaks', 'Suggestions for healthy study breaks', 'coffee', true, 'study_breaks', 5),
('streaks', 'Streak Alerts', 'Notifications about study streaks and milestones', 'fire', true, 'streaks', 7),
('social', 'Social Updates', 'Friend activities and study group notifications', 'users', false, 'social', 4),
('system', 'System Alerts', 'Important app updates and maintenance notifications', 'bell', true, 'system', 9),
('wellness', 'Wellness Reminders', 'Mental health and wellness check-ins', 'heart', true, 'wellness', 6),
('ai_suggestions', 'AI Suggestions', 'Personalized study recommendations from AI', 'brain', true, 'ai_suggestions', 5)
ON CONFLICT (category_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  onesignal_channel_id = EXCLUDED.onesignal_channel_id,
  priority = EXCLUDED.priority;

-- ===============================================
-- 3. User Notification Preferences
-- ===============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES notification_categories(id),
  
  -- Preference settings
  enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  frequency_limit INTEGER DEFAULT 5, -- per day for this category
  
  -- Advanced settings
  delivery_schedule JSON DEFAULT '{"days": [1,2,3,4,5,6,0], "hours": [8,9,10,11,12,13,14,15,16,17,18,19,20]}',
  custom_sound VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- ===============================================
-- 4. OneSignal Notification Queue
-- ===============================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- OneSignal configuration
  onesignal_notification_id VARCHAR(255), -- Returned by OneSignal API
  external_id VARCHAR(255), -- Our tracking ID
  
  -- Notification content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category_key VARCHAR(50) REFERENCES notification_categories(category_key),
  
  -- Delivery configuration
  scheduled_for TIMESTAMP WITH TIME ZONE,
  send_after TIMESTAMP WITH TIME ZONE, -- OneSignal send_after
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- OneSignal response data
  onesignal_response JSON,
  error_message TEXT,
  
  -- Metadata
  data JSON DEFAULT '{}',
  url VARCHAR(500),
  buttons JSON,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_onesignal_id ON notification_queue(onesignal_notification_id);

-- ===============================================
-- 5. OneSignal Analytics and Tracking
-- ===============================================
CREATE TABLE IF NOT EXISTS notification_analytics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id INTEGER REFERENCES notification_queue(id),
  
  -- OneSignal tracking
  onesignal_notification_id VARCHAR(255),
  onesignal_player_id VARCHAR(255),
  
  -- Event tracking
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, dismissed
  category_key VARCHAR(50) REFERENCES notification_categories(category_key),
  
  -- User interaction data
  click_url VARCHAR(500),
  time_to_click INTEGER, -- seconds from delivery to click
  device_info JSON,
  
  -- Timestamp
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSON DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_timestamp ON notification_analytics(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_category ON notification_analytics(category_key);

-- ===============================================
-- 6. Functions and Triggers
-- ===============================================

-- Function: Update last_used_at for push subscriptions
CREATE OR REPLACE FUNCTION update_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE push_subscriptions 
  SET last_used_at = NOW(), updated_at = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update subscription usage when notification is sent
CREATE TRIGGER trigger_update_subscription_usage
  AFTER INSERT ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_last_used();

-- Function: Auto-populate notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category_id, enabled)
  SELECT NEW.user_id, id, default_enabled
  FROM notification_categories
  ON CONFLICT (user_id, category_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Create default preferences when user creates subscription
CREATE TRIGGER trigger_create_default_preferences
  AFTER INSERT ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function: Clean up old notifications and analytics
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Archive old notification queue items (keep for 30 days)
  DELETE FROM notification_queue 
  WHERE created_at < NOW() - INTERVAL '30 days' 
    AND status IN ('sent', 'delivered', 'failed');
  
  -- Archive old analytics (keep for 90 days)
  DELETE FROM notification_analytics 
  WHERE event_timestamp < NOW() - INTERVAL '90 days';
  
  -- Deactivate unused subscriptions (no activity for 60 days)
  UPDATE push_subscriptions 
  SET is_active = false 
  WHERE last_used_at < NOW() - INTERVAL '60 days' 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 7. Helper Views for OneSignal Integration
-- ===============================================

-- View: Active subscriptions with user details
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  ps.*,
  au.email,
  au.created_at as user_created_at
FROM push_subscriptions ps
JOIN auth.users au ON ps.user_id = au.id
WHERE ps.is_active = true;

-- View: Notification delivery stats
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  category_key,
  DATE(event_timestamp) as date,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_type = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE event_type = 'opened') as opened_count,
  COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked_count,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'opened')::float / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0) * 100, 2
  ) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'clicked')::float / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0) * 100, 2
  ) as click_rate
FROM notification_analytics
GROUP BY category_key, DATE(event_timestamp);

-- ===============================================
-- 8. RLS Policies
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- Push subscriptions: Users can only access their own
CREATE POLICY push_subscriptions_user_access ON push_subscriptions
  FOR ALL USING (auth.uid()::text = user_id);

-- Notification preferences: Users can only access their own
CREATE POLICY notification_preferences_user_access ON notification_preferences
  FOR ALL USING (auth.uid()::text = user_id);

-- Notification queue: Users can only see their own notifications
CREATE POLICY notification_queue_user_access ON notification_queue
  FOR SELECT USING (auth.uid()::text = user_id);

-- Analytics: Users can only see their own analytics
CREATE POLICY notification_analytics_user_access ON notification_analytics
  FOR SELECT USING (auth.uid()::text = user_id);

-- Categories: Public read access (no RLS needed as it's reference data)
ALTER TABLE notification_categories DISABLE ROW LEVEL SECURITY;

-- ===============================================
-- 9. OneSignal Integration Functions
-- ===============================================

-- Function: Get user's OneSignal player ID
CREATE OR REPLACE FUNCTION get_user_onesignal_player_id(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  player_id TEXT;
BEGIN
  SELECT onesignal_player_id INTO player_id
  FROM push_subscriptions
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;
  
  RETURN player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Store OneSignal notification result
CREATE OR REPLACE FUNCTION store_onesignal_result(
  p_user_id TEXT,
  p_onesignal_id TEXT,
  p_title TEXT,
  p_message TEXT,
  p_category TEXT,
  p_response JSON
)
RETURNS INTEGER AS $$
DECLARE
  queue_id INTEGER;
BEGIN
  INSERT INTO notification_queue (
    user_id, 
    onesignal_notification_id, 
    title, 
    message, 
    category_key, 
    status, 
    onesignal_response,
    sent_at
  ) VALUES (
    p_user_id,
    p_onesignal_id,
    p_title,
    p_message,
    p_category,
    'sent',
    p_response,
    NOW()
  ) RETURNING id INTO queue_id;
  
  -- Track analytics
  INSERT INTO notification_analytics (
    user_id,
    notification_id,
    onesignal_notification_id,
    event_type,
    category_key
  ) VALUES (
    p_user_id,
    queue_id,
    p_onesignal_id,
    'sent',
    p_category
  );
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================================
-- 10. Initial Data Setup
-- ===============================================

-- Create system notification for OneSignal welcome
INSERT INTO notification_queue (
  user_id,
  title,
  message,
  category_key,
  status,
  created_at
) 
SELECT 
  '00000000-0000-0000-0000-000000000000', -- System user
  'OneSignal Integration Ready! 🚀',
  'Your MemoSpark app now supports real-time push notifications via OneSignal. No more cron job limitations!',
  'system',
  'sent',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM notification_queue 
  WHERE title = 'OneSignal Integration Ready! 🚀'
);

COMMIT; 