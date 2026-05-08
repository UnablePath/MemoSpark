import { useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudySessionManager, type StudySession } from '@/lib/social/StudySessionManager';
import { StudyGroupManager, type GroupCategory } from '@/lib/social/StudyGroupManager';
import { createAuthenticatedSupabaseClient, supabase } from '@/lib/supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
// Ensure non-null supabase client for hooks (env must be configured)
const sb = supabase as NonNullable<typeof supabase>;

export const studyGroupKeys = {
  all: ['studyGroups'] as const,
  group: (groupId: string) => [...studyGroupKeys.all, 'group', groupId] as const,
  sessions: (groupId: string) => [...studyGroupKeys.all, 'sessions', groupId] as const,
  participants: (sessionId: string) => [...studyGroupKeys.all, 'participants', sessionId] as const,
  categories: () => [...studyGroupKeys.all, 'categories'] as const,
  discovery: (filters: { q?: string; categoryId?: string | null }) => [...studyGroupKeys.all, 'discovery', filters.q || '', filters.categoryId || ''] as const,
  groupMembers: (groupId: string) => [...studyGroupKeys.all, 'groupMembers', groupId] as const,
  groupInvitations: (groupId: string) => [...studyGroupKeys.all, 'groupInvitations', groupId] as const,
  userInvitations: () => [...studyGroupKeys.all, 'userInvitations'] as const,
  groupRoles: () => [...studyGroupKeys.all, 'groupRoles'] as const,
  groupAuditLog: (groupId: string) => [...studyGroupKeys.all, 'groupAuditLog', groupId] as const,
  userGroups: (userId: string) => [...studyGroupKeys.all, 'userGroups', userId] as const,
  groupResources: (groupId: string) => [...studyGroupKeys.all, 'groupResources', groupId] as const,
  groupMembersDetailed: (groupId: string) => [...studyGroupKeys.all, 'groupMembersDetailed', groupId] as const,
};

export function useStudySessions(getToken: () => Promise<string | null>, groupId: string) {
  const manager = useMemo(() => new StudySessionManager(getToken), [getToken]);
  return useQuery({
    queryKey: studyGroupKeys.sessions(groupId),
    queryFn: () => manager.getActiveSessions(groupId),
    enabled: Boolean(groupId),
  });
}

export function useCreateSession(getToken: () => Promise<string | null>, groupId: string) {
  const manager = useMemo(() => new StudySessionManager(getToken), [getToken]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<StudySession, 'id' | 'group_id' | 'created_by' | 'created_at' | 'updated_at' | 'current_participants'> & { creatorId: string }) =>
      manager.createSession(groupId, payload.creatorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyGroupKeys.sessions(groupId) });
    },
  });
}

export function useGroupCategories(getToken: () => Promise<string | null>) {
  const manager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  return useQuery<GroupCategory[]>({
    queryKey: studyGroupKeys.categories(),
    queryFn: () => manager.getCategories(),
  });
}

export function useDiscoverGroups(getToken: () => Promise<string | null>, filters: { q?: string; categoryId?: string | null }) {
  const manager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  return useQuery({
    queryKey: studyGroupKeys.discovery(filters),
    queryFn: () => manager.searchGroups({ query: filters.q, categoryId: filters.categoryId || undefined, limit: 30, offset: 0 }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useSessionParticipants(getToken: () => Promise<string | null>, sessionId: string) {
  const manager = useMemo(() => new StudySessionManager(getToken), [getToken]);
  return useQuery({
    queryKey: studyGroupKeys.participants(sessionId),
    queryFn: () => manager.getParticipants(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useJoinSession(getToken: () => Promise<string | null>, groupId: string) {
  const manager = useMemo(() => new StudySessionManager(getToken), [getToken]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: string; userId: string }) =>
      manager.joinSession(groupId, args.sessionId, args.userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: studyGroupKeys.sessions(groupId) });
      qc.invalidateQueries({ queryKey: studyGroupKeys.participants(variables.sessionId) });
    },
  });
}

export function useLeaveSession(getToken: () => Promise<string | null>, groupId: string) {
  const manager = useMemo(() => new StudySessionManager(getToken), [getToken]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: string; userId: string }) =>
      manager.leaveSession(groupId, args.sessionId, args.userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: studyGroupKeys.sessions(groupId) });
      qc.invalidateQueries({ queryKey: studyGroupKeys.participants(variables.sessionId) });
    },
  });
}

// Group Management Hooks
export const useSendGroupInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      inviteeEmail, 
      inviteeName, 
      message 
    }: { 
      groupId: string; 
      inviteeEmail: string; 
      inviteeName?: string; 
      message?: string; 
    }) => {
      const response = await fetch(`/api/study-groups/${groupId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitee_email: inviteeEmail,
          invitee_name: inviteeName ?? undefined,
          message: message ?? undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Failed to send invitation');
      return payload;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupInvitations(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.group(variables.groupId) });
    }
  });
};

export const useRespondToInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      invitationId, 
      response 
    }: { 
      invitationId: string; 
      response: 'accept' | 'decline'; 
    }) => {
      const apiAction = response === 'accept' ? 'accept' : 'decline';
      const res = await fetch(`/api/study-groups/invitations/${invitationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: apiAction }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? 'Failed to respond to invitation');
      return payload;
    },
    onSuccess: (_, variables) => {
      // Invalidate user's invitations and relevant group data
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.userInvitations() });
      queryClient.invalidateQueries({ queryKey: [...studyGroupKeys.all, 'userGroups'] });
    }
  });
};

export const useChangeMemberRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      memberId, 
      newRoleId 
    }: { 
      groupId: string; 
      memberId: string; 
      newRoleId: string; 
    }) => {
      const response = await fetch(`/api/study-groups/${groupId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: newRoleId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error ?? 'Failed to change member role');
      return payload;
    },
    onSuccess: (_, variables) => {
      // Invalidate group members and audit log
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupAuditLog(variables.groupId) });
    }
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      memberId 
    }: { 
      groupId: string; 
      memberId: string; 
    }) => {
      const response = await fetch(`/api/study-groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error ?? 'Failed to remove member');
      return payload;
    },
    onSuccess: (_, variables) => {
      // Invalidate group members and audit log
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupAuditLog(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.group(variables.groupId) });
    }
  });
};

export const useTransferGroupOwnership = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      newOwnerId 
    }: { 
      groupId: string; 
      newOwnerId: string; 
    }) => {
      const response = await fetch(`/api/study-groups/${groupId}/ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Failed to transfer ownership');
      return payload;
    },
    onSuccess: (_, variables) => {
      // Invalidate group data and members
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.group(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupAuditLog(variables.groupId) });
    }
  });
};

// Query hooks for group management data
export const useGroupMembers = (groupId: string) => {
  return useQuery({
    queryKey: studyGroupKeys.groupMembers(groupId),
    queryFn: async () => {
      const response = await fetch(`/api/study-groups/${groupId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Failed to fetch group members');
      const members = Array.isArray(payload?.group?.members) ? payload.group.members : [];
      return members.map((member: any) => ({
        ...member,
        profiles: {
          full_name: member.name ?? null,
          email: member.email ?? null,
          avatar_url: null,
        },
      }));
    },
    enabled: !!groupId
  });
};

export const useGroupInvitations = (groupId: string) => {
  return useQuery({
    queryKey: studyGroupKeys.groupInvitations(groupId),
    queryFn: async () => {
      const response = await fetch(`/api/study-groups/${groupId}/invite`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Failed to fetch invitations');
      
      return payload.invitations ?? [];
    },
    enabled: !!groupId
  });
};

export const useUserInvitations = (inviteeId?: string | null) => {
  return useQuery({
    queryKey: studyGroupKeys.userInvitations(),
    queryFn: async () => {
      let query = sb
        .from('study_group_invitations')
        .select(`
          *,
          study_groups:group_id (
            id,
            name,
            description
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inviteeId) {
        query = query.eq('invitee_id', inviteeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export function useUserStudyGroups(getToken: () => Promise<string | null>, userId: string | undefined) {
  const manager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  return useQuery({
    queryKey: userId ? studyGroupKeys.userGroups(userId) : [...studyGroupKeys.all, 'userGroups', '__none__'],
    queryFn: async () => {
      const groups = await manager.getUserGroups(userId!);
      if (groups.length === 0) return groups;
      const countEntries = await Promise.all(
        groups.map(async (group) => {
          try {
            const response = await fetch(`/api/study-groups/${group.id}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) return [group.id, group.member_count ?? null] as const;
            const payload = await response.json().catch(() => ({}));
            const members = Array.isArray(payload?.group?.members) ? payload.group.members : [];
            return [group.id, members.length] as const;
          } catch {
            return [group.id, group.member_count ?? null] as const;
          }
        }),
      );
      const counts = Object.fromEntries(countEntries) as Record<string, number | null>;
      return groups
        .filter((group: any) => !group.is_archived)
        .map((group: any) => ({
          ...group,
          member_count:
            typeof counts[group.id] === 'number'
              ? counts[group.id]
              : group.member_count ?? null,
        }));
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useStudyGroupResources(getToken: () => Promise<string | null>, groupId: string) {
  const manager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  return useQuery({
    queryKey: studyGroupKeys.groupResources(groupId),
    queryFn: () => manager.getResources(groupId),
    enabled: Boolean(groupId),
  });
}

export function useStudyGroupMembersDetailed(getToken: () => Promise<string | null>, groupId: string) {
  return useQuery({
    queryKey: studyGroupKeys.groupMembersDetailed(groupId),
    queryFn: async () => {
      const response = await fetch(`/api/study-groups/${groupId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to fetch group members');
      }
      const members = Array.isArray(payload?.group?.members) ? payload.group.members : [];
      return members.map((member: any) => ({
        ...member,
        user_name: member.name || member.user_name || 'Unknown',
      }));
    },
    enabled: Boolean(groupId),
  });
}

// Realtime subscription to keep group hub + management data fresh
export function useGroupRealtime(groupId: string) {
  const qc = useQueryClient();
  const { userId, getToken, isLoaded, isSignedIn } = useAuth();
  const wrappedToken = useMemo(
    () => wrapClerkTokenForSupabase(getToken),
    [getToken],
  );

  useEffect(() => {
    if (!groupId || !isLoaded || !isSignedIn || !userId) return;
    const client = createAuthenticatedSupabaseClient(wrappedToken);
    if (!client) return;

    const channel = client
      .channel(`group-realtime-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_invitations', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupInvitations(groupId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(groupId) });
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupMembersDetailed(groupId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_audit_log', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupAuditLog(groupId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_groups', filter: `id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: [...studyGroupKeys.all, 'userGroups'] });
        qc.invalidateQueries({ queryKey: [...studyGroupKeys.all, 'discovery'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_resources', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupResources(groupId) });
      })
      .subscribe();

    return () => {
      try { client.removeChannel(channel); } catch {}
    };
  }, [groupId, qc, isLoaded, isSignedIn, userId, wrappedToken]);
}

/** Alias: subscribe at study group detail level (not only management panel). */
export const useStudyGroupHubRealtime = useGroupRealtime;

export const useGroupRoles = () => {
  return useQuery({
    queryKey: studyGroupKeys.groupRoles(),
    queryFn: async () => {
      const { data, error } = await sb
        .from('group_roles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useGroupAuditLog = (groupId: string) => {
  return useQuery({
    queryKey: studyGroupKeys.groupAuditLog(groupId),
    queryFn: async () => {
      const { data, error } = await sb
        .from('group_audit_log')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });
};


