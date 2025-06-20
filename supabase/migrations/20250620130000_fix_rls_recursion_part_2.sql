-- MIGRATION: Fix RLS Infinite Recursion Part 2

-- =================================================================
-- 1. Create SECURITY DEFINER functions to check for admin/owner roles.
-- These will bypass RLS and prevent recursion in INSERT/UPDATE/DELETE policies.
-- =================================================================

CREATE OR REPLACE FUNCTION is_conversation_admin(_conversation_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = _conversation_id
        AND user_id = _user_id
        AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION is_study_group_admin(_group_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.study_group_members
        WHERE group_id = _group_id
        AND user_id = _user_id
        AND role IN ('owner', 'admin')
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_conversation_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_study_group_admin(uuid, text) TO authenticated;

-- =================================================================
-- 2. Update `conversation_participants` RLS policies
-- =================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;

-- Create new policy for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage participants" ON public.conversation_participants
FOR ALL
USING (is_conversation_admin(conversation_id, (auth.jwt() ->> 'sub')::text) OR user_id = (auth.jwt() ->> 'sub')::text)
WITH CHECK (is_conversation_admin(conversation_id, (auth.jwt() ->> 'sub')::text));


-- =================================================================
-- 3. Update `study_group_members` RLS policies
-- =================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage group members" ON public.study_group_members;

-- Create new policy for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage group members" ON public.study_group_members
FOR ALL
USING (is_study_group_admin(group_id, (auth.jwt() ->> 'sub')::text) OR user_id = (auth.jwt() ->> 'sub')::text)
WITH CHECK (is_study_group_admin(group_id, (auth.jwt() ->> 'sub')::text));

-- =================================================================
-- 4. Update `conversations` RLS Policy for SELECT
-- The original policy was also a source of recursion.
-- =================================================================
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" ON public.conversations
FOR SELECT
USING (is_conversation_participant(id, (auth.jwt() ->> 'sub')::text)); 