-- MIGRATION: Final RLS Fix for Social & Messaging Features (v3)

-- This migration cleans up previous attempts and correctly implements RLS
-- for conversations and study groups using SECURITY DEFINER functions
-- to prevent infinite recursion errors. It removes LEAKPROOF to support non-superuser roles.

-- =================================================================
-- 1. Drop all previous policies and functions using CASCADE
-- to ensure a completely clean slate and remove dependency issues.
-- =================================================================

DROP FUNCTION IF EXISTS is_conversation_admin(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS is_study_group_admin(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS is_conversation_participant(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS is_study_group_member(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_study_groups(text) CASCADE;

-- Drop any lingering policies that might have been created in previous attempts
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins or owners can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can update participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view members of their own groups" ON public.study_group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.study_group_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.study_group_members;
DROP POLICY IF EXISTS "Users can leave their study groups" ON public.study_group_members;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.study_groups;
DROP POLICY IF EXISTS "Users can create study groups" ON public.study_groups;


-- =================================================================
-- 2. Create SECURITY DEFINER functions for Conversation & Study Group Checks
-- =================================================================

CREATE OR REPLACE FUNCTION is_conversation_participant(_conversation_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = _conversation_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION is_conversation_admin(_conversation_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = _conversation_id
        AND user_id = _user_id
        AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION is_study_group_member(_group_id uuid, _user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.study_group_members
        WHERE group_id = _group_id AND user_id = _user_id
    );
$$;

GRANT EXECUTE ON FUNCTION is_conversation_participant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_study_group_member(uuid, text) TO authenticated;


-- =================================================================
-- 3. Re-create RLS policies for `conversations` and `conversation_participants`
-- =================================================================

CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (is_conversation_participant(id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (created_by = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Admins or owners can update conversations" ON public.conversations
    FOR UPDATE USING (is_conversation_admin(id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can view participants of their own conversations" ON public.conversation_participants
    FOR SELECT USING (is_conversation_participant(conversation_id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can leave conversations" ON public.conversation_participants
    FOR DELETE USING (user_id = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Admins can add participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (is_conversation_admin(conversation_id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Admins can update participants" ON public.conversation_participants
    FOR UPDATE USING (is_conversation_admin(conversation_id, (auth.jwt() ->> 'sub')::text));


-- =================================================================
-- 4. Re-create RLS policies for `study_groups` and `study_group_members`
-- =================================================================

CREATE POLICY "Users can view groups they are members of" ON public.study_groups
    FOR SELECT USING (is_study_group_member(id, (auth.jwt() ->> 'sub')::text));
    
CREATE POLICY "Users can create study groups" ON public.study_groups
    FOR INSERT WITH CHECK (created_by = (auth.jwt() ->> 'sub')::text);

CREATE POLICY "Users can view members of their own groups" ON public.study_group_members
    FOR SELECT USING (is_study_group_member(group_id, (auth.jwt() ->> 'sub')::text));

CREATE POLICY "Users can leave their study groups" ON public.study_group_members
    FOR DELETE USING (user_id = (auth.jwt() ->> 'sub')::text);


-- =================================================================
-- 5. Re-create `get_user_study_groups` RPC with SECURITY DEFINER
-- =================================================================

CREATE OR REPLACE FUNCTION get_user_study_groups(p_user_id text)
RETURNS SETOF public.study_groups
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT sg.*
    FROM public.study_groups sg
    JOIN public.study_group_members sgm ON sg.id = sgm.group_id
    WHERE sgm.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_study_groups(text) TO authenticated; 