-- Group Management Functions
-- Part 2: Functions and additional features

-- 1. Create group_audit_log table
CREATE TABLE IF NOT EXISTS group_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_id ON group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);
CREATE INDEX IF NOT EXISTS idx_group_audit_log_group_id ON group_audit_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_audit_log_user_id ON group_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_role_id ON study_group_members(role_id);

-- 3. Enable RLS for audit log
ALTER TABLE group_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for audit log
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

-- 5. Functions for group management
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

-- 6. Function to send group invitation
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

-- 7. Function to accept/decline invitation
CREATE OR REPLACE FUNCTION respond_to_invitation(
    p_invitation_id UUID,
    p_response TEXT,
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
            (SELECT name FROM group_roles WHERE is_default = true LIMIT 1),
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

-- 8. Function to change member role
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

-- 9. Function to remove member from group
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

-- 10. Function to transfer group ownership
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
