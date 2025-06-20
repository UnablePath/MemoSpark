-- Create connections table if it doesn't exist (safeguard)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;
DROP POLICY IF EXISTS "Allow users to manage their own connection requests" ON connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON connections;


-- Create a comprehensive policy for managing connections
CREATE POLICY "Users can manage their own connections"
ON connections
FOR ALL
USING (
    (auth.jwt()->>'sub')::text = requester_id OR 
    (auth.jwt()->>'sub')::text = receiver_id
)
WITH CHECK (
    (auth.jwt()->>'sub')::text = requester_id
);

-- Add comments for clarity
COMMENT ON TABLE connections IS 'Manages connection requests and relationships between users.';
COMMENT ON POLICY "Users can manage their own connections" ON connections IS 'Users can see any connection row where they are the requester or receiver, but can only create requests where they are the requester.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_requester_id ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
