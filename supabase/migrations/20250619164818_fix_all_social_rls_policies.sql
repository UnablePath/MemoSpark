-- MIGRATION: Comprehensive RLS Policy Fix for All Social Features

-- =================================================================
-- 1. Fix `profiles` table RLS for general visibility
-- This is critical for users to be able to see each other's names/avatars.
-- =================================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create a new policy that allows any authenticated user to view profiles.
-- The policies for INSERT, UPDATE, DELETE remain restrictive, so users can only modify their own profile.
CREATE POLICY "Allow authenticated users to view profiles" ON profiles
FOR SELECT
USING (auth.role() = 'authenticated');


-- =================================================================
-- 2. Fix and Standardize `conversations` table RLS
-- This fixes the "create group" error.
-- =================================================================

-- Drop old, inconsistent policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Conversation owners/admins can update conversations" ON conversations;

-- Create new, standardized policies using the correct user ID function
CREATE POLICY "Users can view their conversations" ON conversations
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = (auth.jwt() ->> 'sub')::text
    )
);

CREATE POLICY "Users can create conversations" ON conversations
FOR INSERT WITH CHECK (created_by = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Admins can update conversations" ON conversations
FOR UPDATE USING (
    EXISTS (
        SELECT 1
        FROM conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = (auth.jwt() ->> 'sub')::text
        AND cp.role IN ('owner', 'admin')
    )
);


-- =================================================================
-- 3. Fix and Standardize `conversation_participants` table RLS
-- =================================================================

-- Drop old, inconsistent policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Conversation owners/admins can manage participants" ON conversation_participants;

-- Create new, standardized policies
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
FOR SELECT USING (
    conversation_id IN (
        SELECT conversation_id
        FROM conversation_participants
        WHERE user_id = (auth.jwt() ->> 'sub')::text
    )
);

CREATE POLICY "Admins can manage participants" ON conversation_participants
FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = (auth.jwt() ->> 'sub')::text
        AND cp.role IN ('owner', 'admin')
    )
    OR user_id = (auth.jwt() ->> 'sub')::text -- Users can leave conversations
);


-- Add comments for clarity
COMMENT ON POLICY "Allow authenticated users to view profiles" ON profiles IS 'Allows any logged-in user to see basic profile info of others, required for social features.';
COMMENT ON POLICY "Users can create conversations" ON conversations IS 'Ensures a user can only create a conversation for themself.';
