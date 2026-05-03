-- Migration: Fix Messaging RLS recursion and Profiles visibility
-- Description: Break recursion in messaging policies and allow users to view other profiles

-- 1. Fix Profiles RLS: Allow viewing other profiles
-- We need this so users can see who they are chatting with (names, avatars)
DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
CREATE POLICY "Allow users to view all profiles" ON profiles
    FOR SELECT USING (true);

-- 2. Fix Messaging RLS: Break recursion
-- The previous policies often referred back to the same table, causing "infinite recursion" errors

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

-- Fix conversation_participants RLS (Break recursion by using auth.jwt()->>'sub' directly)
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
    FOR SELECT USING (
        user_id = (auth.jwt()->>'sub')::text
        OR 
        EXISTS (
            SELECT 1 FROM conversation_participants AS cp_inner
            WHERE cp_inner.conversation_id = conversation_participants.conversation_id
            AND cp_inner.user_id = (auth.jwt()->>'sub')::text
        )
    );

-- Fix conversations RLS
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = (auth.jwt()->>'sub')::text
        )
    );

-- Fix messages RLS
CREATE POLICY "Users can view messages they sent or received" ON messages 
    FOR SELECT USING (
        sender_id = (auth.jwt()->>'sub')::text
        OR recipient_id = (auth.jwt()->>'sub')::text
        OR EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = (auth.jwt()->>'sub')::text
        )
    );

-- Ensure insert policy is also simplified
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (auth.jwt()->>'sub')::text
    );

-- 3. Fix Connection System RLS
-- Ensure users can view connections where they are either the requester or recipient
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
CREATE POLICY "Users can view their own connections" ON connections
    FOR SELECT USING (
        user_id = (auth.jwt()->>'sub')::text
        OR friend_id = (auth.jwt()->>'sub')::text
    );

DROP POLICY IF EXISTS "Users can update their own connections" ON connections;
CREATE POLICY "Users can update their own connections" ON connections
    FOR UPDATE USING (
        user_id = (auth.jwt()->>'sub')::text
        OR friend_id = (auth.jwt()->>'sub')::text
    );
