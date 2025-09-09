import { getAuthenticatedClient } from '../supabase/client';

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

  constructor(getToken?: () => Promise<string | null>) {
    this.supabase = getAuthenticatedClient(getToken);
  }

  private logError(context: string, error: any, info: Record<string, any> = {}) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`Error in StudySessionManager/${context}:`, message, { errorObject: error, ...info });
  }

  async createSession(groupId: string, creatorId: string, data: Partial<Omit<StudySession, 'id' | 'group_id' | 'created_by' | 'created_at' | 'updated_at' | 'current_participants'>>): Promise<StudySession> {
    try {
      const payload = {
        group_id: groupId,
        created_by: creatorId,
        title: data.title ?? 'Study Session',
        description: data.description ?? null,
        session_type: data.session_type ?? 'general',
        start_time: data.start_time!,
        end_time: data.end_time!,
        max_participants: data.max_participants ?? null,
        status: data.status ?? 'scheduled',
        metadata: data.metadata ?? {},
      } as const;

      const { data: created, error } = await (this.supabase as any)
        .from('study_sessions')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return created as unknown as StudySession;
    } catch (error) {
      this.logError('createSession', error, { groupId, creatorId, data });
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<StudySession>): Promise<StudySession> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('study_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as StudySession;
    } catch (error) {
      this.logError('updateSession', error, { sessionId, updates });
      throw error;
    }
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

  async joinSession(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('study_session_participants')
        .insert({ session_id: sessionId, user_id: userId, status: 'joined' });
      if (error) throw error;
    } catch (error) {
      this.logError('joinSession', error, { sessionId, userId });
      throw error;
    }
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('study_session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      this.logError('leaveSession', error, { sessionId, userId });
      throw error;
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


