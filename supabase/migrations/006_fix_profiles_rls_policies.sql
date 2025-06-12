-- Migration: Fix profiles table RLS policies for Clerk integration
-- Description: Updates RLS policies to allow user profile creation and proper authentication

-- First, let's check the current RLS policies on profiles table
-- and remove any that are blocking user creation

-- Drop existing RLS policies that might be too restrictive
DROP POLICY IF EXISTS "Users can only access their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Create new RLS policies that work with Clerk authentication
-- Policy for viewing profiles (SELECT)
CREATE POLICY "Allow users to view their own profile" ON profiles
  FOR SELECT USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy for creating profiles (INSERT) - Allow creation for authenticated users
CREATE POLICY "Allow authenticated users to create profiles" ON profiles
  FOR INSERT WITH CHECK (
    -- Allow if the clerk_user_id matches the authenticated user
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy for updating profiles (UPDATE)
CREATE POLICY "Allow users to update their own profile" ON profiles
  FOR UPDATE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  ) WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy for deleting profiles (DELETE) - Users can delete their own profile
CREATE POLICY "Allow users to delete their own profile" ON profiles
  FOR DELETE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Ensure RLS is enabled on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon; -- For public profile views if needed

-- Create an index on clerk_user_id for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- Also fix the tasks table RLS policies to work with the new profile structure
-- Drop existing task RLS policies
DROP POLICY IF EXISTS "Users can only access their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only delete their own tasks" ON tasks;

-- Create new task RLS policies using clerk_user_id
CREATE POLICY "Allow users to view their own tasks" ON tasks
  FOR SELECT USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Allow users to create their own tasks" ON tasks
  FOR INSERT WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Allow users to update their own tasks" ON tasks
  FOR UPDATE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  ) WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Allow users to delete their own tasks" ON tasks
  FOR DELETE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Ensure RLS is enabled on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Grant permissions on tasks
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;

-- Create index on clerk_user_id for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_clerk_user_id ON tasks(clerk_user_id);

-- Fix any other tables that might have similar issues
-- User timetables
DROP POLICY IF EXISTS "Users can only access their own timetables" ON user_timetables;
CREATE POLICY "Allow users to access their own timetables" ON user_timetables
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- AI suggestion feedback
DROP POLICY IF EXISTS "Users can only access their own feedback" ON ai_suggestion_feedback;
CREATE POLICY "Allow users to access their own feedback" ON ai_suggestion_feedback
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_timetables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestion_feedback TO authenticated; 