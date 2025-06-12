-- Migration: Fix Clerk integration and add leaderboard functionality
-- Description: Fixes user ID type mismatches and adds missing leaderboard view

-- First, let's fix the reminders table to use TEXT for user_id to match Clerk IDs
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;
ALTER TABLE reminders ALTER COLUMN user_id TYPE TEXT;

-- Update reminders to reference profiles instead of auth.users
ALTER TABLE reminders ADD CONSTRAINT reminders_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Fix user_achievements table to use TEXT for user_id
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
ALTER TABLE user_achievements ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Fix user_stats table to use TEXT for user_id
ALTER TABLE user_stats DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
ALTER TABLE user_stats ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_stats ADD CONSTRAINT user_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Fix crashout_posts table to use TEXT for user_id
ALTER TABLE crashout_posts DROP CONSTRAINT IF EXISTS crashout_posts_user_id_fkey;
ALTER TABLE crashout_posts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE crashout_posts ADD CONSTRAINT crashout_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Fix post_reactions table to use TEXT for user_id
ALTER TABLE post_reactions DROP CONSTRAINT IF EXISTS post_reactions_user_id_fkey;
ALTER TABLE post_reactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE post_reactions ADD CONSTRAINT post_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Fix user_mood_tracking table to use TEXT for user_id
ALTER TABLE user_mood_tracking DROP CONSTRAINT IF EXISTS user_mood_tracking_user_id_fkey;
ALTER TABLE user_mood_tracking ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_mood_tracking ADD CONSTRAINT user_mood_tracking_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update RLS policies to use Clerk user IDs instead of auth.uid()
-- Create helper function to get current Clerk user ID from JWT
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT (auth.jwt()->>'sub')::text;
$$;

-- Update reminders RLS policies
DROP POLICY IF EXISTS "Users can manage their own reminders" ON reminders;
CREATE POLICY "Users can manage their own reminders" ON reminders
  FOR ALL
  USING (auth.clerk_user_id() = user_id);

-- Update user_achievements RLS policies  
DROP POLICY IF EXISTS "Users can view their own earned achievements" ON user_achievements;
CREATE POLICY "Users can view their own earned achievements" ON user_achievements
  FOR SELECT
  USING (auth.clerk_user_id() = user_id);

-- Update user_stats RLS policies
DROP POLICY IF EXISTS "Users can manage their own stats" ON user_stats;
CREATE POLICY "Users can manage their own stats" ON user_stats
  FOR ALL
  USING (auth.clerk_user_id() = user_id);

-- Update crashout_posts RLS policies
DROP POLICY IF EXISTS "Users can view public or their own posts" ON crashout_posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON crashout_posts;

CREATE POLICY "Users can view public or their own posts" ON crashout_posts
  FOR SELECT
  USING (privacy_level IN ('public', 'anonymous') OR auth.clerk_user_id() = user_id);

CREATE POLICY "Users can manage their own posts" ON crashout_posts
  FOR ALL
  USING (auth.clerk_user_id() = user_id);

-- Update post_reactions RLS policies
DROP POLICY IF EXISTS "Users can manage their own reactions" ON post_reactions;
DROP POLICY IF EXISTS "Users can view reactions on posts they can see" ON post_reactions;

CREATE POLICY "Users can manage their own reactions" ON post_reactions
  FOR ALL
  USING (auth.clerk_user_id() = user_id);
  
CREATE POLICY "Users can view reactions on posts they can see" ON post_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crashout_posts
      WHERE id = post_id
      AND (privacy_level IN ('public', 'anonymous') OR auth.clerk_user_id() = user_id)
    )
  );

-- Update user_mood_tracking RLS policies
DROP POLICY IF EXISTS "Users can manage their own mood tracking" ON user_mood_tracking;
CREATE POLICY "Users can manage their own mood tracking" ON user_mood_tracking
  FOR ALL
  USING (auth.clerk_user_id() = user_id);

-- Create leaderboard view (since the code expects a leaderboard table)
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  us.user_id,
  COALESCE(p.full_name, p.email, 'Anonymous User') as user_name,
  us.total_points,
  RANK() OVER (ORDER BY us.total_points DESC) as rank
FROM user_stats us
LEFT JOIN profiles p ON p.clerk_user_id = us.user_id
WHERE us.total_points > 0
ORDER BY us.total_points DESC;

-- Add RLS policy for leaderboard view
ALTER VIEW leaderboard SET (security_invoker = on);

-- Update the get_user_rank function to work with TEXT user_ids
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id TEXT)
RETURNS INT AS $$
DECLARE
    rank INT;
BEGIN
    SELECT r.rank INTO rank
    FROM (
        SELECT user_id, RANK() OVER (ORDER BY total_points DESC) as rank
        FROM user_stats
    ) r
    WHERE r.user_id = p_user_id;
    RETURN COALESCE(rank, 0);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for the new TEXT user_id columns
DROP INDEX IF EXISTS idx_reminders_user_id_due_date;
CREATE INDEX idx_reminders_user_id_due_date ON reminders(user_id, due_date);

DROP INDEX IF EXISTS idx_user_achievements_user_id;
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- Add some sample achievements if the table is empty
INSERT INTO achievements (name, description, icon, type, criteria, points_reward) VALUES
('First Task', 'Complete your first task', '🎯', 'task_completion', '{"tasks": 1}', 50),
('Early Bird', 'Complete 5 tasks', '🌅', 'task_completion', '{"tasks": 5}', 100),
('Study Streak', 'Maintain a 7-day study streak', '🔥', 'streak', '{"days": 7}', 150),
('Reminder Pro', 'Complete 10 reminders', '⏰', 'task_completion', '{"reminders": 10}', 100)
ON CONFLICT (name) DO NOTHING;

-- Ensure we have a profiles record for any existing users
-- This is a safety measure for development
DO $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.clerk_user_id();
    
    IF current_user_id IS NOT NULL THEN
        INSERT INTO profiles (clerk_user_id, onboarding_completed, created_at, updated_at)
        VALUES (current_user_id, false, NOW(), NOW())
        ON CONFLICT (clerk_user_id) DO NOTHING;
        
        -- Also ensure user_stats exists
        INSERT INTO user_stats (user_id, total_points, current_streak, longest_streak, coins, level, created_at, updated_at)
        VALUES (current_user_id, 0, 0, 0, 0, 1, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$; 