-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table for Reminders
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID, -- Optional link to a task
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  points INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "reminders" IS 'Stores user-created reminders for tasks or events.';

-- Table for Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- e.g., 'trophy', 'star'
  type TEXT NOT NULL CHECK (type IN ('streak', 'task_completion', 'social', 'wellness')),
  criteria JSONB NOT NULL, -- e.g., {"days": 7}, {"tasks": 20}
  points_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "achievements" IS 'Defines all available achievements in the system.';

-- Table to track user achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER,
  max_progress INTEGER,
  UNIQUE(user_id, achievement_id)
);
COMMENT ON TABLE "user_achievements" IS 'Tracks which achievements a user has earned.';

-- Table for user gamification stats
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "user_stats" IS 'Stores gamification-related statistics for each user.';

-- Table for Crashout Room posts
CREATE TABLE crashout_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('stressed', 'overwhelmed', 'frustrated', 'anxious', 'exhausted')),
  privacy_level TEXT CHECK (privacy_level IN ('private', 'public', 'anonymous')) NOT NULL DEFAULT 'public',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE "crashout_posts" IS 'Stores posts for the Crashout Room forum.';

-- Table for reactions to Crashout Room posts
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES crashout_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'understanding', 'you_got_this')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);
COMMENT ON TABLE "post_reactions" IS 'Stores user reactions to Crashout Room posts.';

-- Table for user mood tracking
CREATE TABLE user_mood_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
COMMENT ON TABLE "user_mood_tracking" IS 'Tracks user mood over time for wellness features.';

-- Indexes for performance
CREATE INDEX idx_reminders_user_id_due_date ON reminders(user_id, due_date);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_crashout_posts_created_at ON crashout_posts(created_at DESC);
CREATE INDEX idx_crashout_posts_privacy ON crashout_posts(privacy_level, created_at DESC);
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_user_mood_tracking_user_id ON user_mood_tracking(user_id, timestamp DESC);


-- Row Level Security (RLS) Policies
-- Reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reminders" ON reminders
  FOR ALL
  USING (auth.uid() = user_id);

-- Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view achievements" ON achievements
  FOR SELECT
  USING (true);

-- User Achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own earned achievements" ON user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- User Stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own stats" ON user_stats
  FOR ALL
  USING (auth.uid() = user_id);

-- Crashout Posts
ALTER TABLE crashout_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public or their own posts" ON crashout_posts
  FOR SELECT
  USING (privacy_level IN ('public', 'anonymous') OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own posts" ON crashout_posts
  FOR ALL
  USING (auth.uid() = user_id);

-- Post Reactions
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reactions" ON post_reactions
  FOR ALL
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can view reactions on posts they can see" ON post_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crashout_posts
      WHERE id = post_id
    )
  );

-- User Mood Tracking
ALTER TABLE user_mood_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mood tracking" ON user_mood_tracking
  FOR ALL
  USING (auth.uid() = user_id);
  
-- Functions for post moderation (placeholders)
CREATE OR REPLACE FUNCTION flag_post(post_id_to_flag UUID)
RETURNS void AS $$
BEGIN
  UPDATE crashout_posts
  SET is_flagged = true, updated_at = NOW()
  WHERE id = post_id_to_flag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
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
    RETURN rank;
END;
$$ LANGUAGE plpgsql; 