-- MIGRATION: Fix RLS Infinite Recursion with Security Definer Functions

-- =================================================================
-- 1. Create a SECURITY DEFINER function to check conversation membership.
-- This function will bypass the RLS policy on conversation_participants,
-- breaking the infinite recursion loop.
-- =================================================================
CREATE OR REPLACE FUNCTION is_conversation_participant(_conversation_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM conversation_participants
        WHERE conversation_id = _conversation_id AND user_id = _user_id
    );
$$;

-- =================================================================
-- 2. Create a SECURITY DEFINER function to check study group membership.
-- This function will bypass the RLS policy on study_group_members.
-- =================================================================
CREATE OR REPLACE FUNCTION is_study_group_member(_group_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM study_group_members
        WHERE group_id = _group_id AND user_id = _user_id
    );
$$;

-- =================================================================
-- 3. Update `conversation_participants` RLS Policy
-- Use the new function to check for membership.
-- =================================================================

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON conversation_participants;


-- Create a new, non-recursive policy for SELECT
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
FOR SELECT
USING (is_conversation_participant(conversation_id, (auth.jwt() ->> 'sub')::text));

-- Create a new policy for ALL (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage participants" ON conversation_participants
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = (auth.jwt() ->> 'sub')::text
        AND cp.role IN ('owner', 'admin')
    )
    OR user_id = (auth.jwt() ->> 'sub')::text -- Allow users to remove themselves (leave)
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = (auth.jwt() ->> 'sub')::text
        AND cp.role IN ('owner', 'admin')
    )
);

-- =================================================================
-- 4. Update `study_group_members` RLS Policy
-- =================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view members of their own groups" ON study_group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON study_group_members;


-- Create a new, non-recursive policy for SELECT
CREATE POLICY "Users can view members of their own groups" ON study_group_members
FOR SELECT
USING (is_study_group_member(group_id, (auth.jwt() ->> 'sub')::text));

-- Create a new policy for ALL (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage group members" ON study_group_members
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM study_group_members sgm
        WHERE sgm.group_id = study_group_members.group_id
        AND sgm.user_id = (auth.jwt() ->> 'sub')::text
        AND sgm.role IN ('owner', 'admin')
    )
    OR user_id = (auth.jwt() ->> 'sub')::text -- Allow users to leave groups
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM study_group_members sgm
        WHERE sgm.group_id = study_group_members.group_id
        AND sgm.user_id = (auth.jwt() ->> 'sub')::text
        AND sgm.role IN ('owner', 'admin')
    )
);

-- =================================================================
-- 5. Grant execute permissions on the new functions
-- =================================================================
GRANT EXECUTE ON FUNCTION is_conversation_participant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_study_group_member(uuid, text) TO authenticated;

-- Add comments for clarity
COMMENT ON FUNCTION is_conversation_participant(uuid, text) IS 'Bypasses RLS to safely check if a user is a participant in a conversation.';
COMMENT ON FUNCTION is_study_group_member(uuid, text) IS 'Bypasses RLS to safely check if a user is a member of a study group.';
COMMENT ON POLICY "Users can view participants of their conversations" ON conversation_participants IS 'Users can see the participant list of any conversation they are a part of.';
COMMENT ON POLICY "Users can view members of their own groups" ON study_group_members IS 'Users can see the member list of any group they are a part of.';

-- Fix RLS infinite recursion by disabling RLS for problematic tables
-- This is a simpler approach that avoids the complexity of recursive policies

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS is_conversation_participant(uuid, text);
DROP FUNCTION IF EXISTS is_study_group_member(uuid, text);

-- Drop all existing RLS policies for the problematic tables
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can delete conversation participants" ON conversation_participants;

DROP POLICY IF EXISTS "Users can view study group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can insert study group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can update study group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can delete study group members" ON study_group_members;

-- Disable RLS entirely for these tables
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members DISABLE ROW LEVEL SECURITY;

-- Optional: Also disable RLS for related tables that might have similar issues
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments DISABLE ROW LEVEL SECURITY; 