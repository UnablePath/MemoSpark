-- Enhanced Real-time Messaging System Migration (Clerk-Compatible)
-- All user references use TEXT and profiles.clerk_user_id
-- All RLS and functions use auth.clerk_user_id()

-- First, enhance the existing messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES messages(id),
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'sent';

-- Create message reactions table (Clerk user_id TEXT)
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE, -- Clerk
    reaction_type VARCHAR(50) NOT NULL, -- emoji, thumbs_up, heart, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- Create typing indicators table (Clerk user_id TEXT)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE, -- Clerk
    conversation_id UUID NOT NULL, -- Either direct message pair or group chat
    is_typing BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 seconds',
    UNIQUE(user_id, conversation_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_type VARCHAR(20) DEFAULT 'direct', -- 'direct' or 'group'
    name VARCHAR(255), -- For group conversations
    description TEXT,
    created_by TEXT REFERENCES profiles(clerk_user_id), -- Clerk
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Create conversation participants table (Clerk user_id TEXT)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE, -- Clerk
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin', 'owner'
    muted BOOLEAN DEFAULT false,
    UNIQUE(conversation_id, user_id)
);

-- Create message read receipts table (Clerk user_id TEXT)
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE, -- Clerk
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update messages table to link to conversations
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON typing_indicators(expires_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions (Clerk)
CREATE POLICY "Users can view reactions on messages they can see" ON message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m 
            WHERE m.id = message_reactions.message_id 
            AND (m.sender_id = auth.clerk_user_id() OR m.recipient_id = auth.clerk_user_id())
        )
    );

CREATE POLICY "Users can add/remove their own reactions" ON message_reactions
    FOR ALL USING (user_id = auth.clerk_user_id());

-- RLS Policies for typing_indicators (Clerk)
CREATE POLICY "Users can view typing indicators in their conversations" ON typing_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = typing_indicators.conversation_id
            AND cp.user_id = auth.clerk_user_id()
        )
    );

CREATE POLICY "Users can manage their own typing indicators" ON typing_indicators
    FOR ALL USING (user_id = auth.clerk_user_id());

-- RLS Policies for conversations (Clerk)
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.clerk_user_id()
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (created_by = auth.clerk_user_id());

CREATE POLICY "Conversation owners/admins can update conversations" ON conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.clerk_user_id()
            AND cp.role IN ('owner', 'admin')
        )
    );

-- RLS Policies for conversation_participants (Clerk)
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants
            WHERE user_id = auth.clerk_user_id()
        )
    );

CREATE POLICY "Conversation owners/admins can manage participants" ON conversation_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.clerk_user_id()
            AND cp.role IN ('owner', 'admin')
        )
        OR user_id = auth.clerk_user_id() -- Users can manage their own participation
    );

-- RLS Policies for message_read_receipts (Clerk)
CREATE POLICY "Users can view read receipts for their messages" ON message_read_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_read_receipts.message_id
            AND (m.sender_id = auth.clerk_user_id() OR m.recipient_id = auth.clerk_user_id())
        )
    );

CREATE POLICY "Users can add their own read receipts" ON message_read_receipts
    FOR INSERT WITH CHECK (user_id = auth.clerk_user_id());

-- RLS Policies for message_attachments (Clerk)
CREATE POLICY "Users can view attachments on messages they can see" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND (m.sender_id = auth.clerk_user_id() OR m.recipient_id = auth.clerk_user_id())
        )
    );

CREATE POLICY "Users can add attachments to their messages" ON message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND m.sender_id = auth.clerk_user_id()
        )
    );

-- Functions for messaging operations (Clerk-compatible)

-- Function to get or create direct conversation between two users (TEXT)
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_id TEXT, user2_id TEXT)
RETURNS UUID AS $$
DECLARE
    conversation_uuid UUID;
BEGIN
    -- Try to find existing direct conversation
    SELECT c.id INTO conversation_uuid
    FROM conversations c
    WHERE c.conversation_type = 'direct'
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    LIMIT 1;
    
    -- If no conversation exists, create one
    IF conversation_uuid IS NULL THEN
        INSERT INTO conversations (conversation_type, created_by)
        VALUES ('direct', user1_id)
        RETURNING id INTO conversation_uuid;
        
        -- Add both users as participants
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        VALUES 
            (conversation_uuid, user1_id, 'member'),
            (conversation_uuid, user2_id, 'member');
    END IF;
    
    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark message as read (TEXT)
CREATE OR REPLACE FUNCTION mark_message_as_read(message_uuid UUID, reader_id TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO message_read_receipts (message_id, user_id)
    VALUES (message_uuid, reader_id)
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
    -- Update participant's last_read_at
    UPDATE conversation_participants 
    SET last_read_at = NOW()
    WHERE user_id = reader_id
    AND conversation_id = (
        SELECT conversation_id FROM messages WHERE id = message_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS VOID AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update typing indicator (TEXT)
CREATE OR REPLACE FUNCTION update_typing_indicator(user_uuid TEXT, conversation_uuid UUID, typing BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF typing THEN
        INSERT INTO typing_indicators (user_id, conversation_id, is_typing, expires_at)
        VALUES (user_uuid, conversation_uuid, true, NOW() + INTERVAL '10 seconds')
        ON CONFLICT (user_id, conversation_id)
        DO UPDATE SET 
            is_typing = true,
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '10 seconds';
    ELSE
        DELETE FROM typing_indicators 
        WHERE user_id = user_uuid AND conversation_id = conversation_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Trigger to clean up typing indicators when user sends message
CREATE OR REPLACE FUNCTION cleanup_typing_on_message()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE user_id = NEW.sender_id 
    AND conversation_id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_typing_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_typing_on_message();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create a cron job to clean up expired typing indicators (if pg_cron is available)
-- SELECT cron.schedule('cleanup-typing-indicators', '* * * * *', 'SELECT cleanup_expired_typing_indicators();');

COMMENT ON TABLE message_reactions IS 'Stores user reactions to messages (emoji, thumbs up, etc.)';
COMMENT ON TABLE typing_indicators IS 'Tracks real-time typing indicators with automatic expiration';
COMMENT ON TABLE conversations IS 'Groups messages into conversations (direct or group chat)';
COMMENT ON TABLE conversation_participants IS 'Manages user participation in conversations';
COMMENT ON TABLE message_read_receipts IS 'Tracks which messages have been read by which users';
COMMENT ON TABLE message_attachments IS 'Stores file attachments for messages'; 