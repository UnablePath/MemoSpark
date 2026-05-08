'use client';

/**
 * Supabase Realtime Chat transport: Broadcast (typing/presence/optimistic msg) +
 * postgres_changes on `messages` and `message_reactions` for authoritative state.
 *
 * @see https://supabase.com/ui/docs/nextjs/realtime-chat
 * @see https://supabase.com/docs/guides/realtime/broadcast
 */

import type {
  ReactionGroup,
  RealtimeChatMessage,
  RealtimeConnectionStatus,
} from '@/components/social/chat/realtime-chat-types';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import { isLikelyAtRestCiphertext } from '@/lib/messaging/atRestEnvelopeShared';
import type {
  ClerkGetToken,
  Message,
  MessageReaction,
  MessageWithDetails,
} from '@/lib/messaging/MessagingService';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RawReaction {
  emoji: string;
  userId: string;
}

function aggregateReactions(
  raw: RawReaction[],
  viewerUserId: string,
): ReactionGroup[] {
  if (!raw.length) return [];
  const map = new Map<string, { count: number; byMe: boolean }>();
  for (const r of raw) {
    const entry = map.get(r.emoji) ?? { count: 0, byMe: false };
    entry.count += 1;
    if (r.userId === viewerUserId) entry.byMe = true;
    map.set(r.emoji, entry);
  }
  return [...map.entries()]
    .map(([emoji, { count, byMe }]) => ({ emoji, count, byMe }))
    .sort((a, b) => b.count - a.count);
}

function toChatMessage(
  m: MessageWithDetails,
  viewerUserId: string,
): RealtimeChatMessage {
  const name = m.sender?.full_name || m.sender_id;
  const raw: RawReaction[] = (m.reactions || []).map((r) => ({
    emoji: r.reaction_type,
    userId: r.user_id,
  }));
  return {
    id: m.id,
    content: m.content,
    user: { name },
    createdAt: m.created_at,
    senderId: m.sender_id,
    replyToId: m.reply_to_id,
    read: m.read,
    editedAt: m.edited_at,
    deletedAt: m.deleted_at,
    reactions: aggregateReactions(raw, viewerUserId),
  };
}

function fromInsertRow(saved: Message, displayName: string): RealtimeChatMessage {
  return {
    id: saved.id,
    content: saved.content,
    user: { name: displayName },
    createdAt: saved.created_at,
    senderId: saved.sender_id,
    replyToId: saved.reply_to_id,
    read: saved.read,
    reactions: [],
  };
}

function sortChronological(items: RealtimeChatMessage[]): RealtimeChatMessage[] {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeById(
  existing: RealtimeChatMessage[],
  next: RealtimeChatMessage,
): RealtimeChatMessage[] {
  if (existing.some((m) => m.id === next.id)) return existing;
  return sortChronological([...existing, next]);
}

/** Internal: track raw (emoji, userId) tuples per message so we can aggregate per viewer. */
type RawReactionState = Map<string, RawReaction[]>;

export interface UseRealtimeChatOptions {
  /** Topic for `supabase.channel(roomName)`, must be unique per room (Supabase UI contract). */
  roomName: string;
  /** Used for DB load, send, and postgres_changes filter. */
  conversationId: string;
  userId: string;
  userDisplayName: string;
  getToken: ClerkGetToken;
  enabled: boolean;
  /**
   * When set, history is filtered to only show messages from this ISO timestamp onward.
   * Used when history_visible_to_new_members=false to show only post-join messages.
   */
  historyNotBefore?: string;
  /**
   * For non-group conversations, the participant-ensure RPC is a no-op. Set to false
   * to skip the call entirely on direct conversations and reduce roundtrips.
   */
  ensureParticipant?: boolean;
}

// Module-level singleton per conversationId so refreshing does not double-subscribe.
const activeChannels = new Map<string, RealtimeChannel>();

export function useRealtimeChat({
  roomName,
  conversationId,
  userId,
  userDisplayName,
  getToken,
  enabled,
  historyNotBefore,
  ensureParticipant = true,
}: UseRealtimeChatOptions) {
  const getJwt = useMemo(() => wrapClerkTokenForSupabase(getToken), [getToken]);
  const messaging = useMemo(() => new MessagingService(getToken), [getToken]);

  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [status, setStatus] = useState<RealtimeConnectionStatus>('idle');
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [presencePeers, setPresencePeers] = useState<{ key: string; name: string }[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const presencePeersRef = useRef<{ key: string; name: string }[]>([]);
  const historyLoadingRef = useRef(false);
  const reactionStateRef = useRef<RawReactionState>(new Map());

  // Re-aggregate reactions from raw state and merge into messages.
  const refreshReactionsFromState = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => {
        const raw = reactionStateRef.current.get(m.id) ?? [];
        return { ...m, reactions: aggregateReactions(raw, userId) };
      }),
    );
  }, [userId]);

  const loadHistory = useCallback(async () => {
    if (!conversationId || !userId || historyLoadingRef.current) return;
    historyLoadingRef.current = true;
    try {
      if (ensureParticipant) {
        await messaging.ensureGroupChatParticipant(conversationId, userId);
      }

      const rows = await messaging.getMessages(
        conversationId,
        userId,
        80,
        0,
        historyNotBefore,
      );

      // Seed reaction state from history.
      const state: RawReactionState = new Map();
      for (const row of rows) {
        const list: RawReaction[] = (row.reactions || []).map((r) => ({
          emoji: r.reaction_type,
          userId: r.user_id,
        }));
        state.set(row.id, list);
      }
      reactionStateRef.current = state;

      setMessages(
        sortChronological(rows.map((r) => toChatMessage(r, userId))),
      );
    } catch (err) {
      console.error('[social:chat] Failed to load history:', err);
    } finally {
      historyLoadingRef.current = false;
    }
  }, [conversationId, ensureParticipant, historyNotBefore, messaging, userId]);

  useEffect(() => {
    if (!enabled || !conversationId || !userId || !roomName) {
      setMessages([]);
      setStatus('idle');
      reactionStateRef.current = new Map();
      return;
    }

    let cancelled = false;
    const client = createAuthenticatedSupabaseClient(getJwt);
    if (!client) {
      setStatus('error');
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setup = async () => {
      setStatus('connecting');

      await loadHistory();
      if (cancelled) return;

      channel = client.channel(roomName, {
        config: {
          broadcast: { ack: true },
          presence: { key: userId },
        },
      });

      channel
        .on(
          'broadcast',
          { event: 'message' },
          ({ payload }: { payload: Record<string, unknown> }) => {
            if (!payload?.id) return;
            setMessages((prev) =>
              mergeById(prev, {
                id: payload.id as string,
                content: payload.content as string,
                user: { name: payload.userName as string },
                createdAt: payload.createdAt as string,
                senderId: payload.senderId as string | undefined,
                replyToId: payload.replyToId as string | undefined,
                read: Boolean(payload.read),
                reactions: [],
              }),
            );
          },
        )
        .on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: { userId: string; isTyping: boolean } }) => {
            if (!payload?.userId) return;
            setTypingUserIds((prev) => {
              const next = new Set(prev);
              if (payload.isTyping) next.add(payload.userId);
              else next.delete(payload.userId);
              return next;
            });
          },
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel?.presenceState();
          if (!state) return;
          const peers: { key: string; name: string }[] = [];
          for (const key of Object.keys(state)) {
            const presences = state[key] as Record<string, unknown>[];
            const first = presences?.[0];
            peers.push({
              key,
              name:
                (first?.name as string) ||
                (first?.userId as string) ||
                key,
            });
          }
          presencePeersRef.current = peers;
          setPresencePeers(peers);
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row?.id) return;

            if (
              row.encrypted === true ||
              isLikelyAtRestCiphertext(String(row.content ?? ''))
            ) {
              void loadHistory();
              return;
            }

            if (
              historyNotBefore &&
              new Date(row.created_at as string) < new Date(historyNotBefore)
            ) {
              return;
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;

              let resolvedName = row.sender_id as string;
              if (row.sender_id === userId) {
                resolvedName = userDisplayName;
              } else {
                const historicalMatch = prev.find(
                  (m) =>
                    m.senderId === row.sender_id &&
                    m.user.name !== row.sender_id,
                );
                if (historicalMatch) {
                  resolvedName = historicalMatch.user.name;
                } else {
                  const presenceMatch = presencePeersRef.current.find(
                    (p) => p.key === row.sender_id,
                  );
                  if (presenceMatch) resolvedName = presenceMatch.name;
                }
              }

              return mergeById(prev, {
                id: row.id as string,
                content: row.content as string,
                user: { name: resolvedName },
                createdAt: row.created_at as string,
                senderId: row.sender_id as string,
                replyToId: row.reply_to_id as string | undefined,
                read: Boolean(row.read),
                reactions: [],
              });
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row?.id) return;

            // If the new content is an encrypted envelope, force a history reload
            // so the API decrypts it server-side.
            if (
              row.encrypted === true ||
              isLikelyAtRestCiphertext(String(row.content ?? ''))
            ) {
              void loadHistory();
              return;
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? {
                      ...m,
                      read: Boolean(row.read),
                      content: String(row.content ?? m.content),
                      editedAt: (row.edited_at as string | null) ?? m.editedAt,
                      deletedAt:
                        (row.deleted_at as string | null) ?? m.deletedAt,
                    }
                  : m,
              ),
            );
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reactions',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const messageId = String(row.message_id ?? '');
            const emoji = String(row.reaction_type ?? '');
            const reactor = String(row.user_id ?? '');
            if (!messageId || !emoji || !reactor) return;

            const list = reactionStateRef.current.get(messageId) ?? [];
            // Idempotent: dedupe (emoji, userId).
            if (
              !list.some((r) => r.emoji === emoji && r.userId === reactor)
            ) {
              list.push({ emoji, userId: reactor });
              reactionStateRef.current.set(messageId, list);
            }
            refreshReactionsFromState();
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'message_reactions',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.old as Record<string, unknown>;
            const messageId = String(row.message_id ?? '');
            const emoji = String(row.reaction_type ?? '');
            const reactor = String(row.user_id ?? '');
            if (!messageId || !emoji || !reactor) return;

            const list = reactionStateRef.current.get(messageId) ?? [];
            const next = list.filter(
              (r) => !(r.emoji === emoji && r.userId === reactor),
            );
            reactionStateRef.current.set(messageId, next);
            refreshReactionsFromState();
          },
        );

      channelRef.current = channel;
      activeChannels.set(roomName, channel);

      const jwt = await getJwt();
      if (jwt) {
        (client.realtime as unknown as { setAuth: (t: string) => void }).setAuth(jwt);
      }

      channel.subscribe(async (subStatus) => {
        if (cancelled || !channel) return;

        if (subStatus === 'SUBSCRIBED') {
          setStatus('subscribed');
          await channel.track({ userId, name: userDisplayName });
          void loadHistory();
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          console.error(`[social:chat] Channel status: ${subStatus}`);
          setStatus('error');
        }
      });
    };

    void setup();

    return () => {
      cancelled = true;
      if (channel) {
        activeChannels.delete(roomName);
        void client.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [
    conversationId,
    enabled,
    getJwt,
    historyNotBefore,
    loadHistory,
    refreshReactionsFromState,
    roomName,
    userDisplayName,
    userId,
  ]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch || status !== 'subscribed') return;
      void ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping },
      });
    },
    [userId, status],
  );

  const sendMessage = useCallback(
    async (raw: string, replyToId?: string) => {
      const text = raw.trim();
      if (!text || !conversationId) return;

      const messageId = crypto.randomUUID();
      const optimisticMsg: RealtimeChatMessage = {
        id: messageId,
        content: text,
        user: { name: userDisplayName },
        createdAt: new Date().toISOString(),
        senderId: userId,
        replyToId,
        read: false,
        reactions: [],
      };

      setMessages((prev) => mergeById(prev, optimisticMsg));

      const ch = channelRef.current;
      if (ch && status === 'subscribed') {
        void ch.send({
          type: 'broadcast',
          event: 'message',
          payload: {
            id: messageId,
            content: text,
            userName: userDisplayName,
            createdAt: optimisticMsg.createdAt,
            senderId: userId,
            replyToId,
            read: false,
          },
        });
      }

      try {
        await messaging.sendMessage({
          id: messageId,
          userId,
          conversationId,
          content: text,
          replyToId,
        });
      } catch (error) {
        console.error('[social:chat] Failed to persist message:', error);
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    },
    [conversationId, messaging, userDisplayName, userId, status],
  );

  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        await messaging.markMessageAsRead(messageId, userId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, read: true } : msg,
          ),
        );
      } catch (error) {
        console.error('[social:chat] Failed to mark message as read:', error);
      }
    },
    [messaging, userId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const list = reactionStateRef.current.get(messageId) ?? [];
      const has = list.some((r) => r.emoji === emoji && r.userId === userId);

      // Optimistic update.
      const nextList = has
        ? list.filter((r) => !(r.emoji === emoji && r.userId === userId))
        : [...list, { emoji, userId }];
      reactionStateRef.current.set(messageId, nextList);
      refreshReactionsFromState();

      try {
        if (has) {
          await messaging.removeReaction(messageId, userId, emoji);
        } else {
          await messaging.addReaction(messageId, userId, emoji);
        }
      } catch (error) {
        console.error('[social:chat] Failed to toggle reaction:', error);
        // Roll back optimistic state.
        reactionStateRef.current.set(messageId, list);
        refreshReactionsFromState();
      }
    },
    [messaging, refreshReactionsFromState, userId],
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const text = newContent.trim();
      if (!text) return;

      // Optimistic update of content + editedAt.
      const editedAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: text, editedAt } : m,
        ),
      );

      try {
        await messaging.editMessage(messageId, text, userId);
      } catch (error) {
        console.error('[social:chat] Failed to edit message:', error);
        // Force a reload to revert.
        void loadHistory();
      }
    },
    [loadHistory, messaging, userId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const deletedAt = new Date().toISOString();
      // Optimistic.
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deletedAt } : m)),
      );

      try {
        await messaging.deleteMessage(messageId, userId);
      } catch (error) {
        console.error('[social:chat] Failed to delete message:', error);
        void loadHistory();
      }
    },
    [loadHistory, messaging, userId],
  );

  return {
    messages,
    status,
    typingUserIds,
    presencePeers,
    sendMessage,
    sendTyping,
    reload: loadHistory,
    markAsRead,
    toggleReaction,
    editMessage,
    deleteMessage,
  };
}

/** @deprecated Use `useRealtimeChat` with `roomName: \`group-chat:${conversationId}\``. */
export function useRealtimeGroupChat(
  opts: Omit<UseRealtimeChatOptions, 'roomName'> & { conversationId: string },
) {
  const roomName = `group-chat:${opts.conversationId}`;
  return useRealtimeChat({ ...opts, roomName });
}

// Re-export for callers; avoid a stale unused import warning.
export type { RealtimeChatMessage, RealtimeConnectionStatus };
// Silence unused import for `fromInsertRow` if removed in future refactor.
void fromInsertRow;
