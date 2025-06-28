-- Migration: Add streak_visibility column to profiles table
-- Description: Add streak visibility preference for leaderboard privacy controls
-- Required by: StreakTracker.getStreakVisibility() and StreakTracker.updateStreakVisibility()

-- Add the streak_visibility column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS streak_visibility BOOLEAN DEFAULT FALSE;

-- Add index for performance (leaderboard queries filter by this column)
CREATE INDEX IF NOT EXISTS idx_profiles_streak_visibility 
ON profiles(streak_visibility);

-- Add helpful comment
COMMENT ON COLUMN profiles.streak_visibility IS 'Whether user streak data should be visible on public leaderboards';

-- Update existing records to have default value (FALSE for privacy)
UPDATE profiles 
SET streak_visibility = FALSE 
WHERE streak_visibility IS NULL; 