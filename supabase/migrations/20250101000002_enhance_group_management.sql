-- Enhanced Group Management Features
-- This migration adds comprehensive group management capabilities

-- 1. Enhance study_group_members with admin roles and permissions
ALTER TABLE study_group_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_invite": true, "can_remove_members": false, "can_edit_group": false, "can_manage_sessions": false, "can_share_resources": true}'::jsonb,
ADD COLUMN IF NOT EXISTS joined_via_invite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMP WITH TIME ZONE;

-- 2. Create group_invitations table for proper invite management
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL, -- Clerk user ID
    invitee_id TEXT NOT NULL, -- Clerk user ID
    invitee_email TEXT, -- For external invites
    invitee_name TEXT, -- For external invites
    message TEXT, -- Personal message from inviter
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create group_roles table for predefined role templates
CREATE TABLE IF NOT EXISTS group_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default group roles
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

-- 6. Update existing members to have default roles
UPDATE study_group_members 
SET role_id = (SELECT id FROM group_roles WHERE name = 'owner')
WHERE role = 'owner';

UPDATE study_group_members 
SET role_id = (SELECT id FROM group_roles WHERE name = 'member')
WHERE role_id IS NULL;

-- 7. Create group_audit_log for tracking important actions
CREATE TABLE IF NOT EXISTS group_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user ID
    action TEXT NOT NULL,
    target_type TEXT, -- 'member', 'invitation', 'group', 'session'
    target_id UUID, -- ID of the affected item
    details JSONB, -- Additional context about the action
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);
CREATE INDEX IF NOT EXISTS idx_group_audit_log_group_id ON group_audit_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_audit_log_user_id ON group_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_role_id ON study_group_members(role_id);

-- 9. RLS Policies for new tables
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_audit_log ENABLE ROW LEVEL SECURITY;

-- Group invitations policies
CREATE POLICY "Users can view invitations they sent or received" ON group_invitations
    FOR SELECT USING (
        get_clerk_user_id() = inviter_id OR 
        get_clerk_user_id() = invitee_id OR
        EXISTS (
            SELECT 1 FROM study_group_members 
            WHERE group_id = group_invitations.group_id 
            AND user_id = get_clerk_user_id()
            AND (permissions->>'can_invite')::boolean = true
        )
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

CREATE POLICY "Users can update invitations they sent or received" ON group_invitations
    FOR UPDATE USING (
        get_clerk_user_id() = inviter_id OR 
        get_clerk_user_id() = invitee_id
    );

-- Group roles policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view group roles" ON group_roles
    FOR SELECT USING (true);

-- Group audit log policies
CREATE POLICY "Users can view audit logs for groups they're members of" ON group_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_group_members 
            WHERE group_id = group_audit_log.group_id 
            AND user_id = get_clerk_user_id()
        )
    );

CREATE POLICY "System can insert audit logs" ON group_audit_log
    FOR INSERT WITH CHECK (true);

-- 10. Functions for group management
CREATE OR REPLACE FUNCTION get_user_group_permissions(p_group_id UUID, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    member_permissions JSONB;
BEGIN
    SELECT permissions INTO member_permissions
    FROM study_group_members sgm
    JOIN group_roles gr ON sgm.role_id = gr.id
    WHERE sgm.group_id = p_group_id AND sgm.user_id = p_user_id;
    
    RETURN COALESCE(member_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_user_perform_action(p_group_id UUID, p_user_id TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
BEGIN
    SELECT permissions INTO user_permissions
    FROM study_group_members sgm
    JOIN group_roles gr ON sgm.role_id = gr.id
    WHERE sgm.group_id = p_group_id AND sgm.user_id = p_user_id;
    
    RETURN COALESCE(user_permissions->>p_action, 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_group_action(
    p_group_id UUID,
    p_user_id TEXT,
    p_action TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO group_audit_log (group_id, user_id, action, target_type, target_id, details)
    VALUES (p_group_id, p_user_id, p_action, p_target_type, p_target_id, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Update existing RLS policies to use new permission functions
DROP POLICY IF EXISTS "Users can update groups they created" ON study_groups;
CREATE POLICY "Users can update groups if they have permission" ON study_groups
    FOR UPDATE USING (
        can_user_perform_action(id, get_clerk_user_id(), 'can_edit_group')
    );

DROP POLICY IF EXISTS "Users can delete groups they created" ON study_groups;
CREATE POLICY "Users can delete groups if they have permission" ON study_groups
    FOR DELETE USING (
        can_user_perform_action(id, get_clerk_user_id(), 'can_delete_group')
    );

-- 12. Trigger to automatically log group actions
CREATE OR REPLACE FUNCTION trigger_log_group_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_group_action(
            NEW.group_id,
            NEW.user_id,
            'member_joined',
            'member',
            NEW.id,
            jsonb_build_object('role', NEW.role, 'joined_at', NEW.joined_at)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role != NEW.role THEN
            PERFORM log_group_action(
                NEW.group_id,
                NEW.user_id,
                'role_changed',
                'member',
                NEW.id,
                jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_group_action(
            OLD.group_id,
            OLD.user_id,
            'member_left',
            'member',
            OLD.id,
            jsonb_build_object('role', OLD.role, 'left_at', NOW())
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_group_member_changes
    AFTER INSERT OR UPDATE OR DELETE ON study_group_members
    FOR EACH ROW EXECUTE FUNCTION trigger_log_group_changes();

-- 13. Function to send group invitation
CREATE OR REPLACE FUNCTION send_group_invitation(
    p_group_id UUID,
    p_inviter_id TEXT,
    p_invitee_id TEXT DEFAULT NULL,
    p_invitee_email TEXT DEFAULT NULL,
    p_invitee_name TEXT DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    group_name TEXT;
BEGIN
    -- Get group name for validation
    SELECT name INTO group_name FROM study_groups WHERE id = p_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found';
    END IF;
    
    -- Check if inviter has permission
    IF NOT can_user_perform_action(p_group_id, p_inviter_id, 'can_invite') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users';
    END IF;
    
    -- Check if user is already a member
    IF p_invitee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM study_group_members 
        WHERE group_id = p_group_id AND user_id = p_invitee_id
    ) THEN
        RAISE EXCEPTION 'User is already a member of this group';
    END IF;
    
    -- Check if invitation already exists
    IF p_invitee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM group_invitations 
        WHERE group_id = p_group_id AND invitee_id = p_invitee_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Invitation already sent to this user';
    END IF;
    
    -- Create invitation
    INSERT INTO group_invitations (group_id, inviter_id, invitee_id, invitee_email, invitee_name, message)
    VALUES (p_group_id, p_inviter_id, p_invitee_id, p_invitee_email, p_invitee_name, p_message)
    RETURNING id INTO invitation_id;
    
    -- Log the action
    PERFORM log_group_action(
        p_group_id,
        p_inviter_id,
        'invitation_sent',
        'invitation',
        invitation_id,
        jsonb_build_object('invitee_id', p_invitee_id, 'invitee_email', p_invitee_email)
    );
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Function to accept/decline invitation
CREATE OR REPLACE FUNCTION respond_to_invitation(
    p_invitation_id UUID,
    p_response TEXT, -- 'accepted' or 'declined'
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record RECORD;
    group_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM group_invitations 
    WHERE id = p_invitation_id AND invitee_id = p_user_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;
    
    group_id := invitation_record.group_id;
    
    -- Update invitation status
    UPDATE group_invitations 
    SET status = p_response,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_response = 'accepted' THEN NOW() ELSE NULL END,
        declined_at = CASE WHEN p_response = 'declined' THEN NOW() ELSE NULL END
    WHERE id = p_invitation_id;
    
    -- If accepted, add user to group
    IF p_response = 'accepted' THEN
        INSERT INTO study_group_members (group_id, user_id, role, joined_via_invite, invite_accepted_at)
        VALUES (
            group_id, 
            p_user_id, 
            (SELECT id FROM group_roles WHERE is_default = true LIMIT 1),
            true,
            NOW()
        );
        
        -- Log the action
        PERFORM log_group_action(
            group_id,
            p_user_id,
            'invitation_accepted',
            'invitation',
            p_invitation_id
        );
    ELSE
        -- Log the decline
        PERFORM log_group_action(
            group_id,
            p_user_id,
            'invitation_declined',
            'invitation',
            p_invitation_id
        );
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Function to change member role
CREATE OR REPLACE FUNCTION change_member_role(
    p_group_id UUID,
    p_admin_user_id TEXT,
    p_member_user_id TEXT,
    p_new_role_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    new_role_id UUID;
    admin_permissions JSONB;
BEGIN
    -- Check if admin has permission to assign roles
    admin_permissions := get_user_group_permissions(p_group_id, p_admin_user_id);
    IF NOT (admin_permissions->>'can_assign_roles')::boolean THEN
        RAISE EXCEPTION 'Insufficient permissions to change member roles';
    END IF;
    
    -- Get the new role ID
    SELECT id INTO new_role_id FROM group_roles WHERE name = p_new_role_name;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role not found';
    END IF;
    
    -- Update member role
    UPDATE study_group_members 
    SET role_id = new_role_id,
        role = p_new_role_name,
        updated_at = NOW()
    WHERE group_id = p_group_id AND user_id = p_member_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found in group';
    END IF;
    
    -- Log the action
    PERFORM log_group_action(
        p_group_id,
        p_admin_user_id,
        'role_changed',
        'member',
        NULL,
        jsonb_build_object('member_user_id', p_member_user_id, 'new_role', p_new_role_name)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Function to remove member from group
CREATE OR REPLACE FUNCTION remove_group_member(
    p_group_id UUID,
    p_admin_user_id TEXT,
    p_member_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    admin_permissions JSONB;
    member_role TEXT;
BEGIN
    -- Check if admin has permission to remove members
    admin_permissions := get_user_group_permissions(p_group_id, p_admin_user_id);
    IF NOT (admin_permissions->>'can_remove_members')::boolean THEN
        RAISE EXCEPTION 'Insufficient permissions to remove members';
    END IF;
    
    -- Get member role to check if they can be removed
    SELECT role INTO member_role 
    FROM study_group_members 
    WHERE group_id = p_group_id AND user_id = p_member_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found in group';
    END IF;
    
    -- Prevent removing owners (they must transfer ownership first)
    IF member_role = 'owner' THEN
        RAISE EXCEPTION 'Cannot remove group owner. Transfer ownership first.';
    END IF;
    
    -- Remove member
    DELETE FROM study_group_members 
    WHERE group_id = p_group_id AND user_id = p_member_user_id;
    
    -- Log the action
    PERFORM log_group_action(
        p_group_id,
        p_admin_user_id,
        'member_removed',
        'member',
        NULL,
        jsonb_build_object('removed_user_id', p_member_user_id, 'removed_role', member_role)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Function to transfer group ownership
CREATE OR REPLACE FUNCTION transfer_group_ownership(
    p_group_id UUID,
    p_current_owner_id TEXT,
    p_new_owner_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    new_owner_role_id UUID;
    owner_role_id UUID;
BEGIN
    -- Verify current user is owner
    IF NOT EXISTS (
        SELECT 1 FROM study_group_members 
        WHERE group_id = p_group_id AND user_id = p_current_owner_id AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only group owner can transfer ownership';
    END IF;
    
    -- Verify new owner is a member
    IF NOT EXISTS (
        SELECT 1 FROM study_group_members 
        WHERE group_id = p_group_id AND user_id = p_new_owner_id
    ) THEN
        RAISE EXCEPTION 'New owner must be a member of the group';
    END IF;
    
    -- Get role IDs
    SELECT id INTO owner_role_id FROM group_roles WHERE name = 'owner';
    SELECT id INTO new_owner_role_id FROM group_roles WHERE name = 'admin';
    
    -- Update roles
    UPDATE study_group_members 
    SET role_id = owner_role_id,
        role = 'owner',
        updated_at = NOW()
    WHERE group_id = p_group_id AND user_id = p_new_owner_id;
    
    UPDATE study_group_members 
    SET role_id = new_owner_role_id,
        role = 'admin',
        updated_at = NOW()
    WHERE group_id = p_group_id AND user_id = p_current_owner_id;
    
    -- Log the action
    PERFORM log_group_action(
        p_group_id,
        p_current_owner_id,
        'ownership_transferred',
        'group',
        NULL,
        jsonb_build_object('new_owner_id', p_new_owner_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
