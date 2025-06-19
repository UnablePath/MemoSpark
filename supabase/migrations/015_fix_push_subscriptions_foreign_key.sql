-- Migration 015: Fix push_subscriptions foreign key constraint
-- The table was incorrectly referencing auth.users which doesn't exist in Clerk setup
-- We need to reference profiles table instead or remove the constraint

-- Drop the incorrect foreign key constraint
ALTER TABLE push_subscriptions 
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- Update the user_id column to reference profiles table
-- First, we need to update existing data to use clerk_user_id instead
UPDATE push_subscriptions 
SET user_id = external_user_id 
WHERE external_user_id IS NOT NULL;

-- Add the correct foreign key constraint to profiles table
ALTER TABLE push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update the column comment for clarity
COMMENT ON COLUMN push_subscriptions.user_id IS 'References profiles.clerk_user_id (Clerk user ID)';
COMMENT ON COLUMN push_subscriptions.external_user_id IS 'Clerk user ID for external reference (same as user_id)';

-- Ensure RLS policies work with Clerk authentication
DROP POLICY IF EXISTS push_subscriptions_user_access ON push_subscriptions;

CREATE POLICY push_subscriptions_user_access ON push_subscriptions
    FOR ALL USING (
        (auth.jwt()->>'sub')::text = user_id OR 
        (auth.jwt()->>'sub')::text = external_user_id
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_clerk ON push_subscriptions(user_id); 