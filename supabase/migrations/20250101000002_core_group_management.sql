-- Core Group Management Schema
-- Part 1: Basic tables and permissions

-- 1. Enhance study_group_members with admin roles and permissions
ALTER TABLE study_group_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_invite": true, "can_remove_members": false, "can_edit_group": false, "can_manage_sessions": false, "can_share_resources": true}'::jsonb,
ADD COLUMN IF NOT EXISTS joined_via_invite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMP WITH TIME ZONE;

-- 2. Create group_invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL,
    invitee_id TEXT NOT NULL,
    invitee_email TEXT,
    invitee_name TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create group_roles table
CREATE TABLE IF NOT EXISTS group_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default roles
INSERT INTO group_roles (name, display_name, description, permissions, is_default) VALUES
('owner', 'Owner', 'Full control over the group', 
 '{"can_invite": true, "can_remove_members": true, "can_edit_group": true, "can_manage_sessions": true, "can_share_resources": true, "can_delete_group": true, "can_assign_roles": true}', 
 true),
('admin', 'Admin', 'Manage group operations and members', 
 '{"can_invite": true, "can_remove_members": true, "can_edit_group": true, "can_manage_sessions": true, "can_share_resources": true, "can_assign_roles": false, "can_delete_group": false}', 
 false),
('moderator', 'Moderator', 'Help manage content and sessions', 
 '{"can_invite": true, "can_remove_members": false, "can_edit_group": false, "can_manage_sessions": true, "can_share_resources": true, "can_assign_roles": false, "can_delete_group": false}', 
 false),
('member', 'Member', 'Standard group member', 
 '{"can_invite": false, "can_remove_members": false, "can_edit_group": false, "can_manage_sessions": false, "can_share_resources": true, "can_assign_roles": false, "can_delete_group": false}', 
 true)
ON CONFLICT (name) DO NOTHING;

-- 5. Add role_id to study_group_members
ALTER TABLE study_group_members 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES group_roles(id);

-- 6. Update existing members
UPDATE study_group_members 
SET role_id = (SELECT id FROM group_roles WHERE name = 'owner')
WHERE role = 'owner';

UPDATE study_group_members 
SET role_id = (SELECT id FROM group_roles WHERE name = 'member')
WHERE role_id IS NULL;

-- 7. Enable RLS
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;

-- 8. Basic RLS policies
CREATE POLICY "Users can view invitations they sent or received" ON group_invitations
    FOR SELECT USING (
        get_clerk_user_id() = inviter_id OR 
        get_clerk_user_id() = invitee_id
    );

CREATE POLICY "Users can create invitations if they have permission" ON group_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM study_group_members 
            WHERE group_id = group_invitations.group_id 
            AND user_id = get_clerk_user_id()
            AND (permissions->>'can_invite')::boolean = true
        )
    );

CREATE POLICY "Authenticated users can view group roles" ON group_roles
    FOR SELECT USING (true);
