-- Migration: Create profiles table for Clerk-Supabase integration
-- Description: User profiles table with Clerk user ID and comprehensive onboarding data

-- Create learning style enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE learning_style_enum AS ENUM ('Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Unspecified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
    clerk_user_id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    year_of_study TEXT,
    learning_style learning_style_enum DEFAULT 'Unspecified',
    subjects TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    ai_preferences JSONB DEFAULT '{"difficulty": 5, "explanationStyle": "balanced", "interactionFrequency": "moderate"}',
    onboarding_completed BOOLEAN DEFAULT false,
    bio TEXT,
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Clerk integration
-- Using auth.jwt()->>'sub' to get the Clerk user ID from the JWT token

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING ((auth.jwt()->>'sub')::text = clerk_user_id);

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING ((auth.jwt()->>'sub')::text = clerk_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profiles synced from Clerk with MemoSpark-specific data';
COMMENT ON COLUMN profiles.clerk_user_id IS 'Primary key linking to Clerk user ID from JWT sub claim';
COMMENT ON COLUMN profiles.ai_preferences IS 'JSON configuration for AI interaction preferences';
COMMENT ON COLUMN profiles.subjects IS 'Array of user study subjects';
COMMENT ON COLUMN profiles.interests IS 'Array of user interests and hobbies';

-- Update existing tasks and timetable tables to link to profiles if needed
-- Note: These tables should use auth.uid() which maps to clerk_user_id via JWT
-- But we'll add a reference for data integrity if auth.users exists

-- Create a function to get clerk user id from auth context
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT (auth.jwt()->>'sub')::text;
$$;

-- Update the RLS policies for tasks and timetable tables to work with Clerk
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Create new Clerk-compatible policies for tasks
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (get_clerk_user_id() = user_id::text);

-- Update timetable_entries policies
DROP POLICY IF EXISTS "Users can view their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can insert their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can update their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can delete their own timetable entries" ON timetable_entries;

-- Create new Clerk-compatible policies for timetable_entries
CREATE POLICY "Users can view their own timetable entries" ON timetable_entries
    FOR SELECT USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can insert their own timetable entries" ON timetable_entries
    FOR INSERT WITH CHECK (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can update their own timetable entries" ON timetable_entries
    FOR UPDATE USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can delete their own timetable entries" ON timetable_entries
    FOR DELETE USING (get_clerk_user_id() = user_id::text); 