-- Migration: Refine Crashout Posts Schema and RLS Policy
-- Description: This migration standardizes the privacy setting on the `crashout_posts`
-- table to use a boolean `is_private` and creates a more explicit and secure RLS policy.

-- Step 1: Add the new `is_private` column with a default value
ALTER TABLE public.crashout_posts
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Update the new `is_private` column based on the old `privacy_level`
-- This ensures data integrity during the transition.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='crashout_posts' AND column_name='privacy_level'
  ) THEN
    UPDATE public.crashout_posts
    SET is_private = (privacy_level = 'private');
  END IF;
END $$;

-- Step 3: Drop the old `privacy_level` column
ALTER TABLE public.crashout_posts
DROP COLUMN IF EXISTS privacy_level;

-- Step 4: Drop the old RLS policies to replace them
DROP POLICY IF EXISTS "Users can view public or their own posts" ON public.crashout_posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.crashout_posts;

-- Step 5: Create the new, more explicit RLS policies

-- Policy for SELECT:
-- Allows a user to see a post if:
-- 1. The post is NOT private (it's public).
-- 2. The user is the author of the post (they can see their own private posts).
CREATE POLICY "Users can view public posts and their own private posts"
ON public.crashout_posts
FOR SELECT
USING (
  is_private = false OR user_id = (auth.jwt() ->> 'sub')::text
);

-- Policy for INSERT, UPDATE, DELETE:
-- Allows a user to create, modify, or delete ONLY their own posts.
CREATE POLICY "Users can manage their own posts"
ON public.crashout_posts
FOR (INSERT, UPDATE, DELETE)
USING (
  user_id = (auth.jwt() ->> 'sub')::text
)
WITH CHECK (
  user_id = (auth.jwt() ->> 'sub')::text
); 