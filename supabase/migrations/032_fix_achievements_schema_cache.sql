-- Fix Achievements Schema Cache Issue
-- Migration: 032_fix_achievements_schema_cache.sql

-- 1. Refresh schema cache by recreating the achievements table constraints
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS achievements CASCADE;

-- 2. Recreate achievements table with explicit schema
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  type TEXT NOT NULL CHECK (type IN ('streak', 'task_completion', 'social', 'wellness', 'tutorial', 'points_earned')),
  criteria JSONB NOT NULL DEFAULT '{}',
  points_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'System achievements that users can unlock';
COMMENT ON COLUMN achievements.criteria IS 'JSON criteria for unlocking this achievement';

-- 3. Re-enable RLS and create policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view achievements" ON achievements
  FOR SELECT
  USING (true);

CREATE POLICY "Only system can manage achievements" ON achievements
  FOR ALL
  USING (false);

-- 4. Create indexes for performance
CREATE INDEX idx_achievements_type ON achievements(type);
CREATE INDEX idx_achievements_points ON achievements(points_reward);
CREATE INDEX idx_achievements_criteria ON achievements USING GIN(criteria);

-- 5. Recreate user_achievements table with proper foreign key
DROP TABLE IF EXISTS user_achievements CASCADE;

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub'
  ));

CREATE POLICY "System can manage user achievements" ON user_achievements
  FOR ALL
  USING (false);

-- 6. Create indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- 7. Grant permissions
GRANT SELECT ON achievements TO authenticated;
GRANT SELECT ON user_achievements TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Insert some basic achievements to test
INSERT INTO achievements (name, description, icon, type, criteria, points_reward) VALUES
('Welcome to MemoSpark!', 'Complete onboarding and start your learning journey!', '🎉', 'tutorial', '{"step": "onboarding_complete"}', 10),
('First Task', 'Create your very first task!', '📝', 'task_completion', '{"tasks": 1}', 20),
('Streak Starter', 'Begin your first study streak!', '🔥', 'streak', '{"days": 1}', 15)
ON CONFLICT (name) DO NOTHING;

-- 9. Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- 10. Create a direct insertion function that bypasses ORM
CREATE OR REPLACE FUNCTION insert_achievement_direct(
  p_name TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_type TEXT,
  p_criteria JSONB,
  p_points_reward INTEGER
)
RETURNS UUID AS $$
DECLARE
  achievement_id UUID;
BEGIN
  INSERT INTO achievements (name, description, icon, type, criteria, points_reward)
  VALUES (p_name, p_description, p_icon, p_type, p_criteria, p_points_reward)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO achievement_id;
  
  RETURN achievement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION insert_achievement_direct TO authenticated; 