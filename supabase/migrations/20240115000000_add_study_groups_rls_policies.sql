-- Enable RLS on all study group tables
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Study Groups Policies
-- Anyone can view public groups
CREATE POLICY "study_groups_select_public" ON study_groups FOR SELECT USING (
  metadata->>'privacy_level' IS NULL OR metadata->>'privacy_level' = 'public'
);

-- Members can view their groups (including private ones)
CREATE POLICY "study_groups_select_members" ON study_groups FOR SELECT USING (
  id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Authenticated users can create groups
CREATE POLICY "study_groups_insert" ON study_groups FOR INSERT WITH CHECK (
  auth.uid()::text = created_by
);

-- Group creators and admins can update groups
CREATE POLICY "study_groups_update" ON study_groups FOR UPDATE USING (
  created_by = auth.uid()::text OR
  id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Group creators can delete groups
CREATE POLICY "study_groups_delete" ON study_groups FOR DELETE USING (
  created_by = auth.uid()::text
);

-- Study Group Members Policies
-- Members can view other members in their groups
CREATE POLICY "study_group_members_select" ON study_group_members FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Group admins and creators can add members
CREATE POLICY "study_group_members_insert" ON study_group_members FOR INSERT WITH CHECK (
  group_id IN (
    SELECT id FROM study_groups 
    WHERE created_by = auth.uid()::text
  ) OR
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  ) OR
  user_id = auth.uid()::text -- Users can join groups themselves
);

-- Group admins, creators, and users themselves can remove members
CREATE POLICY "study_group_members_delete" ON study_group_members FOR DELETE USING (
  group_id IN (
    SELECT id FROM study_groups 
    WHERE created_by = auth.uid()::text
  ) OR
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  ) OR
  user_id = auth.uid()::text -- Users can leave groups themselves
);

-- Study Group Resources Policies
-- Members can view resources in their groups
CREATE POLICY "study_group_resources_select" ON study_group_resources FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Members can add resources to their groups
CREATE POLICY "study_group_resources_insert" ON study_group_resources FOR INSERT WITH CHECK (
  user_id = auth.uid()::text AND
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Resource creators and group admins can update resources
CREATE POLICY "study_group_resources_update" ON study_group_resources FOR UPDATE USING (
  user_id = auth.uid()::text OR
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Resource creators and group admins can delete resources
CREATE POLICY "study_group_resources_delete" ON study_group_resources FOR DELETE USING (
  user_id = auth.uid()::text OR
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Study Group Invitations Policies
-- Users can view invitations sent to them
CREATE POLICY "study_group_invitations_select_invitee" ON study_group_invitations FOR SELECT USING (
  invitee_id = auth.uid()::text
);

-- Group members can view invitations for their groups
CREATE POLICY "study_group_invitations_select_members" ON study_group_invitations FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Group members can send invitations
CREATE POLICY "study_group_invitations_insert" ON study_group_invitations FOR INSERT WITH CHECK (
  inviter_id = auth.uid()::text AND
  group_id IN (
    SELECT group_id FROM study_group_members 
    WHERE user_id = auth.uid()::text
  )
);

-- Invitees can update their invitation status
CREATE POLICY "study_group_invitations_update" ON study_group_invitations FOR UPDATE USING (
  invitee_id = auth.uid()::text
);

-- Conversations Policies
-- Participants can view conversations they're part of
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  )
);

-- Authenticated users can create conversations
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Conversation participants can update conversations
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
  id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  )
);

-- Messages Policies
-- Participants can view messages in their conversations
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  )
);

-- Participants can send messages to their conversations
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()::text AND
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  )
);

-- Message senders can update their own messages
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  sender_id = auth.uid()::text
);

-- Message senders can delete their own messages
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (
  sender_id = auth.uid()::text
);

-- Conversation Participants Policies
-- Participants can view other participants in their conversations
CREATE POLICY "conversation_participants_select" ON conversation_participants FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  )
);

-- Authenticated users can add themselves as participants
CREATE POLICY "conversation_participants_insert" ON conversation_participants FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
);

-- Participants can update their own participation status
CREATE POLICY "conversation_participants_update" ON conversation_participants FOR UPDATE USING (
  user_id = auth.uid()::text
);

-- Participants can remove themselves from conversations
CREATE POLICY "conversation_participants_delete" ON conversation_participants FOR DELETE USING (
  user_id = auth.uid()::text
);

