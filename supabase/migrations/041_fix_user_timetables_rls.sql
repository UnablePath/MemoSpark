-- Migration: Fix user_timetables RLS policies and add auto user_id trigger for Clerk integration
-- Description: Update user_timetables to work with Clerk user IDs and auto-populate user_id

-- Drop old policies on user_timetables
DROP POLICY IF EXISTS "Users can view their own timetable entries" ON user_timetables;
DROP POLICY IF EXISTS "Users can insert their own timetable entries" ON user_timetables;
DROP POLICY IF EXISTS "Users can update their own timetable entries" ON user_timetables;
DROP POLICY IF EXISTS "Users can delete their own timetable entries" ON user_timetables;

-- Create new Clerk-compatible policies for user_timetables
CREATE POLICY "Users can view their own user_timetables" ON user_timetables
    FOR SELECT USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can insert their own user_timetables" ON user_timetables
    FOR INSERT WITH CHECK (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can update their own user_timetables" ON user_timetables
    FOR UPDATE USING (get_clerk_user_id() = user_id::text);

CREATE POLICY "Users can delete their own user_timetables" ON user_timetables
    FOR DELETE USING (get_clerk_user_id() = user_id::text);

-- Create a function to automatically set user_id from Clerk JWT
CREATE OR REPLACE FUNCTION set_user_id_from_clerk()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the Clerk user ID from the JWT token
  NEW.user_id = (get_clerk_user_id())::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set user_id on INSERT
DROP TRIGGER IF EXISTS set_user_id_trigger ON user_timetables;
CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT ON user_timetables
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_clerk();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_timetables TO authenticated;

-- Update the view policies as well for consistency
DROP POLICY IF EXISTS "Users can view their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can insert their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can update their own timetable entries" ON timetable_entries;
DROP POLICY IF EXISTS "Users can delete their own timetable entries" ON timetable_entries;

-- Since timetable_entries is a view, we don't need policies on it
-- The policies on user_timetables will handle the security

-- Add helpful comment
COMMENT ON TRIGGER set_user_id_trigger ON user_timetables IS 'Automatically sets user_id from Clerk JWT token on insert'; 