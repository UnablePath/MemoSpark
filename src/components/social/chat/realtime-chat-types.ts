/** UI shape aligned with Supabase UI Realtime Chat docs. */
export interface RealtimeChatMessage {
  id: string;
  content: string;
  user: { name: string };
  createdAt: string;
  /** When set, used for own-message alignment (preferred over name). */
  senderId?: string;
  replyToId?: string;
  read?: boolean;
  /** ISO timestamp. Present when the message has been edited. */
  editedAt?: string;
  /** ISO timestamp. Present when the message has been soft-deleted. */
  deletedAt?: string;
  /** Reactions grouped by emoji. */
  reactions?: ReactionGroup[];
}

/** Aggregated reaction count for one emoji on one message. */
export interface ReactionGroup {
  emoji: string;
  count: number;
  /** True when the current viewer has reacted with this emoji. */
  byMe: boolean;
}

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'subscribed' | 'error';

/** Quick reaction palette — short, no-nonsense set. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'] as const;

/** Wider emoji picker palette grouped for the composer. */
export const COMPOSER_EMOJI_GRID = [
  '😀', '😅', '😂', '🤣', '😍', '😎',
  '🤔', '😴', '🙏', '🔥', '💯', '✨',
  '👍', '👎', '👏', '🎉', '❤️', '💔',
  '🚀', '📚', '✅', '❌', '⏰', '☕',
] as const;
