import { createAuthenticatedSupabaseClient } from '../supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import type { ClerkGetToken } from '@/lib/messaging/MessagingService';

export interface StudySession {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  current_participants: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | string;
  created_by: string; // Clerk user id
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface StudySessionParticipant {
  id: string;
  session_id: string;
  user_id: string; // Clerk user id
  joined_at: string;
  left_at: string | null;
  participation_duration: number;
  status: 'joined' | 'active' | 'left' | 'removed' | string;
}

type RealtimeCallbacks = {
  onSessionInsert?: (session: StudySession) => void;
  onSessionUpdate?: (session: StudySession) => void;
  onParticipantChange?: (participant: StudySessionParticipant) => void;
};

export class StudySessionManager {
  // Use broadly-typed client to support newly added tables before codegen updates
  private supabase: any;

  constructor(getToken?: ClerkGetToken) {
    const jwt = getToken ? wrapClerkTokenForSupabase(getToken) : async () => null;
    const client = createAuthenticatedSupabaseClient(jwt);
    if (!client) {
      throw new Error('StudySessionManager: Supabase client unavailable');
    }
    this.supabase = client;
  }

  private logError(context: string, error: any, info: Record<string, any> = {}) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`Error in StudySessionManager/${context}:`, message, { errorObject: error, ...info });
  }

  async createSession(groupId: string, creatorId: string, data: Partial<Omit<StudySession, 'id' | 'group_id' | 'created_by' | 'created_at' | 'updated_at' | 'current_participants'>>): Promise<StudySession> {
    void creatorId;
    const response = await fetch(`/api/study-groups/${groupId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title ?? 'Study Session',
        description: data.description ?? null,
        session_type: data.session_type ?? 'general',
        start_time: data.start_time,
        end_time: data.end_time,
        max_participants: data.max_participants ?? null,
        metadata: data.metadata ?? {},
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to create session');
    }
    const payload = await response.json();
    return payload.session as StudySession;
  }

  async updateSession(groupId: string, sessionId: string, updates: Partial<StudySession>): Promise<StudySession> {
    const response = await fetch(`/api/study-groups/${groupId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to update session');
    }
    const payload = await response.json();
    return payload.session as StudySession;
  }

  async getActiveSessions(groupId: string): Promise<StudySession[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('study_sessions')
        .select('*')
        .eq('group_id', groupId)
        .in('status', ['scheduled', 'active'])
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StudySession[];
    } catch (error) {
      this.logError('getActiveSessions', error, { groupId });
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<StudySession | null> {
    const { data, error } = await (this.supabase as any)
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (error) {
      this.logError('getSession', error, { sessionId });
      throw error;
    }
    return (data ?? null) as unknown as StudySession | null;
  }

  async joinSession(groupId: string, sessionId: string, userId: string): Promise<void> {
    void userId;
    const response = await fetch(`/api/study-groups/${groupId}/sessions/${sessionId}/join`, {
      method: 'POST',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to join session');
    }
  }

  async leaveSession(groupId: string, sessionId: string, userId: string): Promise<void> {
    void userId;
    const response = await fetch(`/api/study-groups/${groupId}/sessions/${sessionId}/leave`, {
      method: 'POST',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to leave session');
    }
  }

  async getParticipants(sessionId: string): Promise<StudySessionParticipant[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('study_session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StudySessionParticipant[];
    } catch (error) {
      this.logError('getParticipants', error, { sessionId });
      throw error;
    }
  }

  subscribeToSession(sessionId: string, callbacks: RealtimeCallbacks = {}): () => void {
    const channelName = `study-session-${sessionId}`;
    const channel = (this.supabase as any)
      .channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'study_sessions', filter: `id=eq.${sessionId}` }, (payload: any) => {
        callbacks.onSessionUpdate?.(payload.new as StudySession);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_session_participants', filter: `session_id=eq.${sessionId}` }, (payload: any) => {
        callbacks.onParticipantChange?.(payload.new as StudySessionParticipant);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'study_session_participants', filter: `session_id=eq.${sessionId}` }, (payload: any) => {
        callbacks.onParticipantChange?.(payload.old as StudySessionParticipant);
      })
      .subscribe();

    return () => {
      try {
        (this.supabase as any).removeChannel(channel);
      } catch {}
    };
  }
}


