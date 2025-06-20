-- MIGRATION: Final RLS Fix for Social & Messaging Features

-- This migration cleans up previous attempts and correctly implements RLS
-- for conversations and study groups using LEAKPROOF SECURITY DEFINER functions
-- to prevent infinite recursion errors.

-- =================================================================
-- 1. Drop all previous, faulty policies and functions to ensure a clean slate.
-- =================================================================

-- Drop functions from previous migrations
DROP FUNCTION IF EXISTS is_conversation_admin(uuid, text);
DROP FUNCTION IF EXISTS is_study_group_admin(uuid, text);
DROP FUNCTION IF EXISTS is_conversation_participant(uuid, text);
DROP FUNCTION IF EXISTS is_study_group_member(uuid, text);

-- Drop policies on conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

-- Drop policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;


-- Drop policies on study_group_members
DROP POLICY IF EXISTS "Users can view members of their own groups" ON public.study_group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.study_group_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.study_group_members;

-- =================================================================
-- 2. Create LEAKPROOF functions for Conversation & Study Group Checks
-- =================================================================

-- Function to check if a user is a participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(_conversation_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE LEAKPROOF SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = _conversation_id AND user_id = _user_id
    );
$$;

-- Function to check if a user is an admin or owner of a conversation
CREATE OR REPLACE FUNCTION is_conversation_admin(_conversation_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE LEAKPROOF SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = _conversation_id
        AND user_id = _user_id
        AND role IN ('owner', 'admin')
    );
$$;

-- Function to check if a user is a member of a study group
CREATE OR REPLACE FUNCTION is_study_group_member(_group_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE LEAKPROOF SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.study_group_members
        WHERE group_id = _group_id AND user_id = _user_id
    );
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION is_conversation_participant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_study_group_member(uuid, text) TO authenticated;


-- =================================================================
-- 3. Re-create all RLS policies for `conversations` and `conversation_participants`
-- =================================================================

-- Policies for `conversations`
CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (is_conversation_participant(id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (created_by = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Admins or owners can update conversations" ON public.conversations
    FOR UPDATE USING (is_conversation_admin(id, (auth.jwt() ->> 'sub')::text));

-- Policies for `conversation_participants`
CREATE POLICY "Users can view participants of their own conversations" ON public.conversation_participants
    FOR SELECT USING (is_conversation_participant(conversation_id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can leave conversations" ON public.conversation_participants
    FOR DELETE USING (user_id = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Admins can add or remove participants" ON public.conversation_participants
    FOR ALL USING (is_conversation_admin(conversation_id, (auth.jwt() ->> 'sub')::text));


-- =================================================================
-- 4. Re-create all RLS policies for `study_groups` and `study_group_members`
-- =================================================================

-- Policies for `study_groups`
DROP POLICY IF EXISTS "Allow public read access for study groups" ON public.study_groups;
CREATE POLICY "Users can view groups they are members of" ON public.study_groups
    FOR SELECT USING (is_study_group_member(id, (auth.jwt() ->> 'sub')::text));

-- Policies for `study_group_members`
CREATE POLICY "Users can view members of their own groups" ON public.study_group_members
    FOR SELECT USING (is_study_group_member(group_id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can leave their study groups" ON public.study_group_members
    FOR DELETE USING (user_id = (auth.jwt() ->> 'sub')::text);


-- =================================================================
-- 5. Fix `get_user_study_groups` RPC to be SECURITY DEFINER
-- This prevents recursion when the function is called.
-- =================================================================

CREATE OR REPLACE FUNCTION get_user_study_groups(p_user_id text)
RETURNS SETOF public.study_groups
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT sg.*
    FROM public.study_groups sg
    JOIN public.study_group_members sgm ON sg.id = sgm.group_id
    WHERE sgm.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_study_groups(text) TO authenticated;

-- Add comments for clarity
COMMENT ON FUNCTION is_conversation_participant IS 'LEAKPROOF and SECURITY DEFINER function to safely check conversation membership for RLS policies.';
COMMENT ON FUNCTION get_user_study_groups IS 'SECURITY DEFINER RPC to safely fetch all study groups for a given user, bypassing RLS on the underlying tables.'; 