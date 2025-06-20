-- Fix auth structure for messaging and study groups to use Clerk consistently
-- Enable realtime for messaging tables

-- Drop existing policies that reference columns we need to modify
DROP POLICY IF EXISTS "Allow creator to manage group" ON study_groups;
DROP POLICY IF EXISTS "Allow members to view group" ON study_groups;
DROP POLICY IF EXISTS "Allow admin to manage members" ON study_group_members;
DROP POLICY IF EXISTS "Allow members to view other members" ON study_group_members;
DROP POLICY IF EXISTS "Allow inviter/invitee to manage invitations" ON study_group_invitations;
DROP POLICY IF EXISTS "Allow members to access resources" ON study_group_resources;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON messages;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Conversation owners/admins can update conversations" ON conversations;
DROP POLICY IF EXISTS "Users can add/remove their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
DROP POLICY IF EXISTS "Users can manage their own typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Users can view typing indicators in their conversations" ON typing_indicators;

-- First, update study group tables to use text (clerk_user_id) instead of uuid
ALTER TABLE study_groups 
  ALTER COLUMN created_by TYPE text;

ALTER TABLE study_group_members 
  ALTER COLUMN user_id TYPE text;

ALTER TABLE study_group_invitations 
  ALTER COLUMN inviter_id TYPE text,
  ALTER COLUMN invitee_id TYPE text;

ALTER TABLE study_group_resources 
  ALTER COLUMN user_id TYPE text;

-- Add foreign key constraints to reference profiles.clerk_user_id
ALTER TABLE study_groups 
  ADD CONSTRAINT study_groups_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

ALTER TABLE study_group_members 
  ADD CONSTRAINT study_group_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

ALTER TABLE study_group_invitations 
  ADD CONSTRAINT study_group_invitations_inviter_id_fkey 
  FOREIGN KEY (inviter_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  ADD CONSTRAINT study_group_invitations_invitee_id_fkey 
  FOREIGN KEY (invitee_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

ALTER TABLE study_group_resources 
  ADD CONSTRAINT study_group_resources_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update messages table foreign keys to reference profiles
ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_recipient_id_fkey 
  FOREIGN KEY (recipient_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update message_reactions to reference profiles
ALTER TABLE message_reactions 
  ADD CONSTRAINT message_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update typing_indicators to reference profiles
ALTER TABLE typing_indicators 
  ADD CONSTRAINT typing_indicators_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Update conversations to reference profiles
ALTER TABLE conversations 
  ADD CONSTRAINT conversations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE;

-- Enable row level security on all messaging tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view messages they sent or received" ON messages 
  FOR SELECT USING (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub') 
    OR recipient_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can insert their own messages" ON messages 
  FOR INSERT WITH CHECK (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can update their own messages" ON messages 
  FOR UPDATE USING (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can delete their own messages" ON messages 
  FOR DELETE USING (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations they created" ON conversations 
  FOR SELECT USING (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can insert conversations" ON conversations 
  FOR INSERT WITH CHECK (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can update conversations they created" ON conversations 
  FOR UPDATE USING (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Create RLS policies for study groups
CREATE POLICY "Users can view study groups they created or are members of" ON study_groups 
  FOR SELECT USING (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    OR id IN (
      SELECT group_id FROM study_group_members 
      WHERE user_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert study groups" ON study_groups 
  FOR INSERT WITH CHECK (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can update study groups they created" ON study_groups 
  FOR UPDATE USING (
    created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Create RLS policies for study group members
CREATE POLICY "Users can view study group members for groups they belong to" ON study_group_members 
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM study_group_members 
      WHERE user_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can manage study group members for groups they created" ON study_group_members 
  FOR ALL USING (
    group_id IN (
      SELECT id FROM study_groups 
      WHERE created_by = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- Set replica identity to FULL for realtime
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE study_groups REPLICA IDENTITY FULL;
ALTER TABLE study_group_members REPLICA IDENTITY FULL;
ALTER TABLE study_group_invitations REPLICA IDENTITY FULL;
ALTER TABLE study_group_resources REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE study_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE study_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE study_group_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE study_group_resources; 