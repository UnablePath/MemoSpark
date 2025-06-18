-- Simple Push Subscriptions Table for OneSignal Integration
-- Run this in your Supabase SQL editor

-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  onesignal_player_id TEXT UNIQUE,
  device_type TEXT DEFAULT 'web',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add external_user_id column if it doesn't exist (for Clerk integration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'push_subscriptions' 
                AND column_name = 'external_user_id') THEN
    ALTER TABLE push_subscriptions ADD COLUMN external_user_id TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_onesignal_player_id ON push_subscriptions(onesignal_player_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_external_user_id ON push_subscriptions(external_user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to access their own subscriptions
DROP POLICY IF EXISTS push_subscriptions_user_access ON push_subscriptions;
CREATE POLICY push_subscriptions_user_access ON push_subscriptions
  FOR ALL USING (auth.uid()::text = user_id);

-- Create a simple notification_analytics table (optional)
CREATE TABLE IF NOT EXISTS notification_analytics (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  onesignal_notification_id TEXT,
  event_type TEXT NOT NULL,
  category_key TEXT,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_timestamp ON notification_analytics(event_timestamp DESC);

-- Enable RLS for analytics
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for analytics
DROP POLICY IF EXISTS notification_analytics_user_access ON notification_analytics;
CREATE POLICY notification_analytics_user_access ON notification_analytics
  FOR ALL USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE push_subscriptions TO authenticated;
GRANT ALL ON TABLE notification_analytics TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated; 