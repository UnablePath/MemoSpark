import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudySessionManager, type StudySession } from '@/lib/social/StudySessionManager';
import { StudyGroupManager, type GroupCategory } from '@/lib/social/StudyGroupManager';
import { supabase } from '@/lib/supabase/client';
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
  userGroups: () => [...studyGroupKeys.all, 'userGroups'] as const,
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
    mutationFn: (args: { sessionId: string; userId: string }) => manager.joinSession(args.sessionId, args.userId),
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
    mutationFn: (args: { sessionId: string; userId: string }) => manager.leaveSession(args.sessionId, args.userId),
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
      inviteeName: string; 
      message?: string; 
    }) => {
      const { data, error } = await sb.rpc('send_group_invitation', {
        p_group_id: groupId,
        p_invitee_email: inviteeEmail,
        p_invitee_name: inviteeName,
        p_message: message || null
      });
      
      if (error) throw error;
      return data;
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
      const { data, error } = await sb.rpc('respond_to_invitation', {
        p_invitation_id: invitationId,
        p_response: response
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate user's invitations and relevant group data
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.userInvitations() });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups() });
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
      const { data, error } = await sb.rpc('change_member_role', {
        p_group_id: groupId,
        p_member_id: memberId,
        p_new_role_id: newRoleId
      });
      
      if (error) throw error;
      return data;
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
      const { data, error } = await sb.rpc('remove_group_member', {
        p_group_id: groupId,
        p_member_id: memberId
      });
      
      if (error) throw error;
      return data;
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
      const { data, error } = await sb.rpc('transfer_group_ownership', {
        p_group_id: groupId,
        p_new_owner_id: newOwnerId
      });
      
      if (error) throw error;
      return data;
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
      const { data, error } = await sb
        .from('study_group_members')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email
          ),
          group_roles:role_id (
            id,
            name,
            display_name,
            description,
            permissions
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });
};

export const useGroupInvitations = (groupId: string) => {
  return useQuery({
    queryKey: studyGroupKeys.groupInvitations(groupId),
    queryFn: async () => {
      const { data, error } = await sb
        .from('group_invitations')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });
};

export const useUserInvitations = (inviteeId?: string | null) => {
  return useQuery({
    queryKey: studyGroupKeys.userInvitations(),
    queryFn: async () => {
      let query = sb
        .from('group_invitations')
        .select(`
          *,
          study_groups:group_id (
            id,
            name,
            description,
            avatar_url
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

// Realtime subscription to keep group management data fresh
export function useGroupRealtime(groupId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!groupId) return;
    const channel = sb
      .channel(`group-realtime-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_invitations', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupInvitations(groupId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupMembers(groupId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_audit_log', filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey: studyGroupKeys.groupAuditLog(groupId) });
      })
      .subscribe();

    return () => {
      try { (sb as any).removeChannel(channel); } catch {}
    };
  }, [groupId, qc]);
}

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
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId
  });
};


