/** UI shape aligned with Supabase UI Realtime Chat docs. */
export interface RealtimeChatMessage {
  id: string;
  content: string;
  user: { name: string };
  createdAt: string;
  /** When set, used for own-message alignment (preferred over name). */
  senderId?: string;
}

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'subscribed' | 'error';
