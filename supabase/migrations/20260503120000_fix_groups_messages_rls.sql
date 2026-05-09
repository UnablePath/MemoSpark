-- Fix messages RLS to allow users to view messages in group conversations they are a part of
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;

CREATE POLICY "Users can view messages they sent or received" ON messages 
  FOR SELECT USING (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub') 
    OR recipient_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    OR conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
    AND (
      recipient_id IS NOT NULL 
      OR conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = (SELECT clerk_user_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
      )
    )
  );
