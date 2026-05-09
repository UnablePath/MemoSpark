-- Migration: Fix group chat history loading + admin-controlled history visibility
-- Root cause: messages RLS only checked conversation_participants but study group members
-- are not always added to conversation_participants. This adds a parallel study_group_members
-- check using text cast so Clerk user IDs (text) match correctly.
-- Also adds history_visible_to_new_members flag for admin control.

-- 1. Add history visibility control to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS history_visible_to_new_members BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN conversations.history_visible_to_new_members IS
  'When false, members see only messages sent after their conversation_participants.joined_at date.';

-- 2. Fix messages SELECT RLS: allow access via study_group_members (text cast) OR conversation_participants
-- This resolves the root cause: study_group_members.user_id is UUID but auth.jwt()->>'sub' is text.
-- We use a separate security-definer helper to avoid type cast errors.

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _clerk_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _clerk_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, text) TO authenticated;

-- Check if user is a member of the study group linked to a conversation (handles UUID→text mismatch)
CREATE OR REPLACE FUNCTION public.is_study_group_chat_member(_conversation_id uuid, _clerk_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.study_group_members sgm
      ON (c.metadata->>'study_group_id')::uuid = sgm.group_id
    WHERE c.id = _conversation_id
      AND sgm.user_id::text = _clerk_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_study_group_chat_member(uuid, text) TO authenticated;

-- 3. Drop and recreate messages policies with both access paths
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;

CREATE POLICY "Users can view messages they sent or received" ON messages
FOR SELECT USING (
  sender_id = (auth.jwt() ->> 'sub')::text
  OR recipient_id = (auth.jwt() ->> 'sub')::text
  OR is_conversation_participant(conversation_id, (auth.jwt() ->> 'sub')::text)
  OR is_study_group_chat_member(conversation_id, (auth.jwt() ->> 'sub')::text)
);

DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;

CREATE POLICY "Users can insert their own messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = (auth.jwt() ->> 'sub')::text
  AND (
    recipient_id IS NOT NULL
    OR is_conversation_participant(conversation_id, (auth.jwt() ->> 'sub')::text)
    OR is_study_group_chat_member(conversation_id, (auth.jwt() ->> 'sub')::text)
  )
);

-- 4. Index to make is_study_group_chat_member fast at scale
CREATE INDEX IF NOT EXISTS idx_conversations_study_group_id
  ON conversations ((metadata->>'study_group_id'));

CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id_text
  ON study_group_members (cast(user_id as text));

-- 5. Ensure conversation_participants has an index for the is_conversation_participant helper
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_user
  ON conversation_participants (conversation_id, user_id);

-- 6. Auto-add study group members to conversation_participants when a group chat exists
-- This function is called client-side when a user opens the group chat tab.
CREATE OR REPLACE FUNCTION public.ensure_group_chat_participant(
  _conversation_id uuid,
  _clerk_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Only add if user is a study group member for this conversation's group
  IF is_study_group_chat_member(_conversation_id, _clerk_user_id) THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (_conversation_id, _clerk_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_group_chat_participant(uuid, text) TO authenticated;
