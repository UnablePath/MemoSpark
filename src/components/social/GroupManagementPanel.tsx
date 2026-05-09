'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudentDiscovery, type UserSearchResult } from '@/lib/social/StudentDiscovery';
import { connectionDisplayInitials, connectionSenderTail } from '@/lib/social/connectionDisplay';
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
} from '@/hooks/useStudyGroupQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  History,
  Flag,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createMemoSparkReportMailtoHref,
  openMemoSparkSupportMailHref,
} from '@/lib/support/memosparkSupportEmail';

function inviteeDisambigLine(
  email: string | null | undefined,
  clerkUserId: string,
): string {
  const base = email ?? 'Inviting by account';
  const tail = connectionSenderTail(clerkUserId);
  return tail ? `${base} · ${tail}` : base;
}

interface GroupManagementPanelProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

const ROLE_PERMISSIONS: Record<string, { can_invite: boolean; can_manage_members: boolean; can_change_roles: boolean; can_transfer_ownership: boolean }> = {
  owner: { can_invite: true, can_manage_members: true, can_change_roles: true, can_transfer_ownership: true },
  admin: { can_invite: true, can_manage_members: true, can_change_roles: true, can_transfer_ownership: false },
  member: { can_invite: false, can_manage_members: false, can_change_roles: false, can_transfer_ownership: false },
};

export default function GroupManagementPanel({ 
  groupId, 
  groupName, 
  isOwner 
}: GroupManagementPanelProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const studentDiscovery = useMemo(() => new StudentDiscovery(getToken), [getToken]);

  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit'>('members');
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<UserSearchResult[]>([]);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
  const [selectedInviteStudent, setSelectedInviteStudent] = useState<UserSearchResult | null>(null);
  const [showEmailInviteFallback, setShowEmailInviteFallback] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newRoleId, setNewRoleId] = useState('');
  const [memberReportTarget, setMemberReportTarget] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [memberReportReason, setMemberReportReason] = useState('');

  // Data hooks
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: groupInvitations, isLoading: invitationsLoading } = useGroupInvitations(groupId);
  const { data: userInvitations, isLoading: userInvitationsLoading } = useUserInvitations(user?.id);
  const { data: roles, isLoading: rolesLoading } = useGroupRoles();
  const { data: auditLog, isLoading: auditLoading } = useGroupAuditLog(groupId);

  // Mutation hooks
  const sendInvitation = useSendGroupInvitation();
  const respondToInvitation = useRespondToInvitation();
  const changeMemberRole = useChangeMemberRole();
  const removeMember = useRemoveGroupMember();
  const transferOwnership = useTransferGroupOwnership();

  // Get current user's permissions in this group
  const currentUserMember = members?.find((m: any) => m.user_id === user?.id);
  const currentUserRole = currentUserMember?.role || 'member';
  const currentUserPermissions = ROLE_PERMISSIONS[currentUserRole] || ROLE_PERMISSIONS.member;
  const canInvite = Boolean(isOwner || currentUserPermissions.can_invite);
  const canManageMembers = Boolean(isOwner || currentUserPermissions.can_manage_members);
  const canChangeRoles = Boolean(isOwner || currentUserPermissions.can_change_roles);

  const runInviteSearch = useCallback(async () => {
    const q = inviteSearchQuery.trim();
    if (!user?.id || q.length < 2) {
      setInviteSearchResults([]);
      setInviteSearchLoading(false);
      return;
    }
    setInviteSearchLoading(true);
    try {
      const results = await studentDiscovery.searchUsers(q, user.id);
      const memberIds = new Set((members ?? []).map((m: { user_id: string }) => m.user_id));
      setInviteSearchResults(results.filter((r) => !memberIds.has(r.clerk_user_id)));
    } catch (err) {
      console.error('[groups:searchInvite]', err);
      setInviteSearchResults([]);
    } finally {
      setInviteSearchLoading(false);
    }
  }, [inviteSearchQuery, members, studentDiscovery, user?.id]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void runInviteSearch();
    }, 300);
    return () => window.clearTimeout(id);
  }, [runInviteSearch]);

  const resetInviteForm = () => {
    setInviteSearchQuery('');
    setInviteSearchResults([]);
    setSelectedInviteStudent(null);
    setShowEmailInviteFallback(false);
    setInviteEmail('');
    setInviteName('');
    setInviteMessage('');
  };

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
    if (!selectedInviteStudent && !inviteEmail.trim()) {
      toast.error('Search for a classmate or add an email to invite.');
      return;
    }

    try {
      if (selectedInviteStudent) {
        await sendInvitation.mutateAsync({
          groupId,
          inviteeId: selectedInviteStudent.clerk_user_id,
          inviteeName: selectedInviteStudent.full_name ?? undefined,
          message: inviteMessage.trim() || undefined,
        });
      } else {
        await sendInvitation.mutateAsync({
          groupId,
          inviteeEmail: inviteEmail.trim(),
          inviteeName: inviteName.trim() || undefined,
          message: inviteMessage.trim() || undefined,
        });
      }

      toast.success("Invitation sent — they'll see it in their invites.");
      resetInviteForm();
    } catch (error) {
      console.error('[groups:sendInvite]', error);
      const msg =
        error instanceof Error && error.message
          ? error.message
          : "Couldn't send that invite right now. Check your connection and try again.";
      toast.error(msg);
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

  const submitMemberReport = () => {
    if (!memberReportTarget || !memberReportReason.trim()) return;
    try {
      const href = createMemoSparkReportMailtoHref({
        subjectDetail: `Group member · ${memberReportTarget.displayName}`,
        studentWrittenReport: memberReportReason.trim(),
        contextLines: [
          'Report type: Group member safety',
          `Reported Clerk user ID: ${memberReportTarget.userId}`,
          `Group ID: ${groupId}`,
          `Group name: ${groupName}`,
        ],
        pageUrl:
          typeof window !== 'undefined' ? window.location.href : undefined,
      });
      openMemoSparkSupportMailHref(href);
      toast.success('Opening your email app…', {
        description:
          'Send the message when it looks right. We review reports to keep groups safe.',
      });
      setMemberReportTarget(null);
      setMemberReportReason('');
    } catch (error) {
      console.error('[social:reportMember]', error);
      toast.error(
        'Could not open email for this report. Mail support@memospark.live manually.',
      );
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
              <Dialog
                onOpenChange={(open) => {
                  if (!open) resetInviteForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent
                  overlayClassName="z-[14500]"
                  className="z-[14501] max-w-md rounded-2xl"
                >
                  <DialogHeader>
                    <DialogTitle>Invite someone to {groupName}</DialogTitle>
                    <DialogDescription>
                      Search the way you do in Connections — pick a classmate, or fall back to email
                      if they are not on MemoSpark yet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-invite-search">Find a student</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                          id="group-invite-search"
                          value={inviteSearchQuery}
                          onChange={(e) => {
                            setInviteSearchQuery(e.target.value);
                            setSelectedInviteStudent(null);
                          }}
                          placeholder="Name, subject, or @handle"
                          className="pl-9"
                          disabled={Boolean(selectedInviteStudent)}
                        />
                        {inviteSearchLoading ? (
                          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
                        ) : null}
                      </div>
                      {!selectedInviteStudent && inviteSearchQuery.trim().length >= 2 ? (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
                          {inviteSearchLoading ? (
                            <p className="px-3 py-3 text-sm text-muted-foreground">
                              Searching students…
                            </p>
                          ) : inviteSearchResults.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-muted-foreground">
                              No matches — try another spelling or invite by email below.
                            </p>
                          ) : (
                            <ul className="divide-y divide-border/40" role="listbox">
                              {inviteSearchResults.map((result) => {
                                const tail = connectionSenderTail(result.clerk_user_id);
                                const initials = connectionDisplayInitials(result.full_name);
                                return (
                                  <li key={result.clerk_user_id}>
                                    <button
                                      type="button"
                                      role="option"
                                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                                      onClick={() => {
                                        setSelectedInviteStudent(result);
                                        setInviteSearchQuery(result.full_name ?? '');
                                        setInviteSearchResults([]);
                                      }}
                                    >
                                      <Avatar className="h-9 w-9">
                                        <AvatarImage src={result.avatar_url ?? undefined} alt="" />
                                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                      </Avatar>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-foreground">
                                          {result.full_name ?? 'Student'}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                          {result.email ?? 'Email hidden'}
                                          {tail ? ` · ${tail}` : ''}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {selectedInviteStudent ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={selectedInviteStudent.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-xs">
                            {connectionDisplayInitials(selectedInviteStudent.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {selectedInviteStudent.full_name ?? 'Student'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {inviteeDisambigLine(
                              selectedInviteStudent.email,
                              selectedInviteStudent.clerk_user_id,
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedInviteStudent(null);
                            setInviteSearchQuery('');
                          }}
                          aria-label="Clear selected student"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => setShowEmailInviteFallback((v) => !v)}
                      >
                        {showEmailInviteFallback
                          ? 'Hide email invite'
                          : "Can't find them? Invite by email"}
                      </button>
                      {showEmailInviteFallback ? (
                        <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3">
                          <div>
                            <Label htmlFor="group-invite-email">Email</Label>
                            <Input
                              id="group-invite-email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="student@university.edu"
                              autoComplete="email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="group-invite-display-name">Display name (optional)</Label>
                            <Input
                              id="group-invite-display-name"
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              placeholder="How they show up in the invite"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <Label htmlFor="group-invite-message">Note (optional)</Label>
                      <Textarea
                        id="group-invite-message"
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="e.g. We're prepping for finals Thursday — join us?"
                        rows={3}
                        className="rounded-xl"
                      />
                    </div>
                    <Button
                      onClick={() => void handleSendInvitation()}
                      disabled={
                        sendInvitation.isPending ||
                        (!selectedInviteStudent && !inviteEmail.trim())
                      }
                      className="w-full rounded-xl"
                    >
                      {sendInvitation.isPending ? 'Sending…' : 'Send invitation'}
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
                              {getRoleIcon(member.role || 'member')}
                              <span>{member.role || 'member'}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.profiles?.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(member.joined_at)}
                          </p>
                          {renderPermissionBadges(ROLE_PERMISSIONS[member.role || 'member'] || ROLE_PERMISSIONS.member)}
                        </div>
                      </div>
                      
                      {canManageMembers && member.user_id !== user?.id && (
                        <div className="flex items-center space-x-2">
                          {canChangeRoles && member.role !== 'owner' && (
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
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
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
                          
                          {isOwner && member.role !== 'owner' && (
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
                          
                          {member.role !== 'owner' && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleRemoveMember(member.user_id, member.profiles?.full_name || 'Unknown')}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMemberReportTarget({
                                userId: member.user_id,
                                displayName:
                                  member.profiles?.full_name || 'Unknown',
                              });
                              setMemberReportReason('');
                            }}
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
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
                            <p className="font-medium">{invitation.invitee?.full_name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground">{invitation.invitee?.email || 'Unknown Email'}</p>
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

      <Dialog
        open={memberReportTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberReportTarget(null);
            setMemberReportReason('');
          }
        }}
      >
        <DialogContent
          overlayClassName="z-[14000]"
          className="z-[14001] max-w-md rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle>Report a member</DialogTitle>
            <DialogDescription>
              Tell us what needs review for{' '}
              <span className="font-medium text-foreground">
                {memberReportTarget?.displayName}
              </span>
              . This opens your email app with a draft to MemoSpark support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-report-reason">What happened?</Label>
            <Textarea
              id="member-report-reason"
              value={memberReportReason}
              onChange={(e) => setMemberReportReason(e.target.value)}
              placeholder="A few clear sentences help us review quickly."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setMemberReportTarget(null);
                setMemberReportReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!memberReportReason.trim()}
              onClick={submitMemberReport}
            >
              Email support
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
