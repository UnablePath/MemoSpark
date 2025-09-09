'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  useGroupMembers, 
  useGroupInvitations, 
  useUserInvitations,
  useGroupRoles,
  useGroupAuditLog,
  useSendGroupInvitation,
  useRespondToInvitation,
  useChangeMemberRole,
  useRemoveGroupMember,
  useTransferGroupOwnership,
  useGroupRealtime
} from '@/hooks/useStudyGroupQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  UserMinus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  Settings,
  History
} from 'lucide-react';
import { toast } from 'sonner';

interface GroupManagementPanelProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export default function GroupManagementPanel({ 
  groupId, 
  groupName, 
  isOwner 
}: GroupManagementPanelProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newRoleId, setNewRoleId] = useState('');

  // Data hooks
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: groupInvitations, isLoading: invitationsLoading } = useGroupInvitations(groupId);
  const { data: userInvitations, isLoading: userInvitationsLoading } = useUserInvitations(user?.id);
  const { data: roles, isLoading: rolesLoading } = useGroupRoles();
  const { data: auditLog, isLoading: auditLoading } = useGroupAuditLog(groupId);

  // Realtime updates for this group
  useGroupRealtime(groupId);

  // Mutation hooks
  const sendInvitation = useSendGroupInvitation();
  const respondToInvitation = useRespondToInvitation();
  const changeMemberRole = useChangeMemberRole();
  const removeMember = useRemoveGroupMember();
  const transferOwnership = useTransferGroupOwnership();

  // Get current user's permissions in this group
  const currentUserMember = members?.find((m: any) => m.user_id === user?.id);
  const currentUserPermissions = currentUserMember?.group_roles?.permissions || {};
  const canInvite = Boolean(isOwner || currentUserPermissions.can_invite);
  const canManageMembers = Boolean(isOwner || currentUserPermissions.can_manage_members);
  const canChangeRoles = Boolean(isOwner || currentUserPermissions.can_change_roles);

  const renderPermissionBadges = (permissions: any) => {
    if (!permissions) return null;
    const items: { key: string; label: string; icon: React.ReactNode }[] = [];
    if (permissions.can_invite) {
      items.push({ key: 'invite', label: 'Invite', icon: <UserPlus className="w-3 h-3" /> });
    }
    if (permissions.can_manage_members || permissions.can_remove_members) {
      items.push({ key: 'members', label: 'Manage', icon: <Users className="w-3 h-3" /> });
    }
    if (permissions.can_change_roles) {
      items.push({ key: 'roles', label: 'Roles', icon: <Settings className="w-3 h-3" /> });
    }
    if (permissions.can_transfer_ownership) {
      items.push({ key: 'owner', label: 'Ownership', icon: <Crown className="w-3 h-3" /> });
    }
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((it) => (
          <Badge key={it.key} variant="outline" className="px-1.5 py-0 text-[10px] gap-1">
            {it.icon}
            <span>{it.label}</span>
          </Badge>
        ))}
      </div>
    );
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await sendInvitation.mutateAsync({
        groupId,
        inviteeEmail: inviteEmail,
        inviteeName: inviteName,
        message: inviteMessage || undefined
      });
      
      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteName('');
      setInviteMessage('');
    } catch (error) {
      toast.error('Failed to send invitation');
      console.error(error);
    }
  };

  const handleRespondToInvitation = async (invitationId: string, response: 'accept' | 'decline') => {
    try {
      await respondToInvitation.mutateAsync({ invitationId, response });
      toast.success(`Invitation ${response === 'accept' ? 'accepted' : 'declined'}`);
    } catch (error) {
      toast.error(`Failed to ${response} invitation`);
      console.error(error);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember || !newRoleId) return;

    try {
      await changeMemberRole.mutateAsync({
        groupId,
        memberId: selectedMember.user_id,
        newRoleId
      });
      
      toast.success('Member role updated successfully');
      setSelectedMember(null);
      setNewRoleId('');
    } catch (error) {
      toast.error('Failed to update member role');
      console.error(error);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) return;

    try {
      await removeMember.mutateAsync({ groupId, memberId });
      toast.success('Member removed successfully');
    } catch (error) {
      toast.error('Failed to remove member');
      console.error(error);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string) => {
    if (!confirm(`Are you sure you want to transfer ownership to ${newOwnerName}? This action cannot be undone.`)) return;

    try {
      await transferOwnership.mutateAsync({ groupId, newOwnerId });
      toast.success('Ownership transferred successfully');
    } catch (error) {
      toast.error('Failed to transfer ownership');
      console.error(error);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'moderator': return <Settings className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'members' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'invitations' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Invitations
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'audit' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          Activity Log
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Group Members ({members?.length || 0})</h3>
            {canInvite && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email *</label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Message (Optional)</label>
                      <Textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="Personal message for the invitation"
                        rows={3}
                      />
                    </div>
                    <Button 
                      onClick={handleSendInvitation}
                      disabled={sendInvitation.isPending || !inviteEmail || !inviteName}
                      className="w-full"
                    >
                      {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Your permission summary */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="text-[11px]">Your permissions:</span>
            {isOwner ? (
              <Badge variant="secondary" className="gap-1"><Crown className="w-3 h-3" /> Owner</Badge>
            ) : renderPermissionBadges(currentUserPermissions) || (
              <Badge variant="outline">Member</Badge>
            )}
          </div>

          {membersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading members...</div>
          ) : (
            <div className="space-y-3">
              {members?.map((member: any) => (
                <Card key={member.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.profiles?.avatar_url} />
                          <AvatarFallback>
                            {member.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {member.profiles?.full_name || 'Unknown User'}
                            </span>
                            <Badge variant="secondary" className="flex items-center space-x-1">
                              {getRoleIcon(member.group_roles?.name || 'member')}
                              <span>{member.group_roles?.display_name || 'Member'}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.profiles?.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(member.joined_at)}
                          </p>
                          </div>
                          {renderPermissionBadges(member.group_roles?.permissions)}
                      </div>
                      
                      {canManageMembers && member.user_id !== user?.id && (
                        <div className="flex items-center space-x-2">
                          {canChangeRoles && member.group_roles?.name !== 'owner' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedMember(member)}
                                >
                                  Change Role
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Change Member Role</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">New Role</label>
                                    <Select value={newRoleId} onValueChange={setNewRoleId}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roles?.map((role: any) => (
                                          <SelectItem key={role.id} value={role.id}>
                                            {role.display_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button 
                                    onClick={handleChangeRole}
                                    disabled={!newRoleId || changeMemberRole.isPending}
                                    className="w-full"
                                  >
                                    {changeMemberRole.isPending ? 'Updating...' : 'Update Role'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {isOwner && member.group_roles?.name !== 'owner' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleTransferOwnership(member.user_id, member.profiles?.full_name || 'Unknown')}
                                >
                                  Make Owner
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                          )}
                          
                          {member.group_roles?.name !== 'owner' && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleRemoveMember(member.user_id, member.profiles?.full_name || 'Unknown')}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-6">
          {/* Pending Invitations Sent by This Group */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
            {invitationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading invitations...</div>
            ) : groupInvitations && groupInvitations.length > 0 ? (
              <div className="space-y-3">
                {groupInvitations
                  .filter((inv: any) => inv.status === 'pending')
                  .map((invitation: any) => (
                    <Card key={invitation.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{invitation.invitee_name}</p>
                            <p className="text-sm text-muted-foreground">{invitation.invitee_email}</p>
                            {invitation.message && (
                              <p className="text-sm text-muted-foreground mt-1">"{invitation.message}"</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Sent {formatDate(invitation.created_at)}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No pending invitations</p>
            )}
          </div>

          {/* User's Received Invitations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Invitations</h3>
            {userInvitationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading your invitations...</div>
            ) : userInvitations && userInvitations.length > 0 ? (
              <div className="space-y-3">
                {userInvitations.map((invitation: any) => (
                  <Card key={invitation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{invitation.study_groups?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {invitation.study_groups?.description}
                          </p>
                          {invitation.message && (
                            <p className="text-sm text-muted-foreground mt-1">"{invitation.message}"</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Received {formatDate(invitation.created_at)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespondToInvitation(invitation.id, 'accept')}
                            disabled={respondToInvitation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRespondToInvitation(invitation.id, 'decline')}
                            disabled={respondToInvitation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No pending invitations</p>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {auditLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activity log...</div>
          ) : auditLog && auditLog.length > 0 ? (
            <div className="space-y-3">
              {auditLog.map((log: any) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={log.profiles?.avatar_url} />
                        <AvatarFallback>
                          {log.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.profiles?.full_name || 'Unknown User'}</span>
                          <Badge variant="outline">{log.action}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.details}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No recent activity</p>
          )}
        </div>
      )}
    </div>
  );
}
