"use client";

/**
 * Supabase Realtime Chat transport: Broadcast (+ optional postgres_changes on `messages`).
 * @see https://supabase.com/ui/docs/nextjs/realtime-chat
 * @see https://supabase.com/docs/guides/realtime/broadcast
 */

import type {
  RealtimeChatMessage,
  RealtimeConnectionStatus,
} from "@/components/social/chat/realtime-chat-types";
import { wrapClerkTokenForSupabase } from "@/lib/clerk/clerkSupabaseToken";
import { isLikelyAtRestCiphertext } from "@/lib/messaging/atRestEnvelopeShared";
import type {
  ClerkGetToken,
  Message,
  MessageWithDetails,
} from "@/lib/messaging/MessagingService";
import { MessagingService } from "@/lib/messaging/MessagingService";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toChatMessage(m: MessageWithDetails): RealtimeChatMessage {
  const name = m.sender?.full_name || m.sender_id;
  return {
    id: m.id,
    content: m.content,
    user: { name },
    createdAt: m.created_at,
    senderId: m.sender_id,
    replyToId: m.reply_to_id,
    read: m.read,
  };
}

function fromInsertRow(
  saved: Message,
  displayName: string,
): RealtimeChatMessage {
  return {
    id: saved.id,
    content: saved.content,
    user: { name: displayName },
    createdAt: saved.created_at,
    senderId: saved.sender_id,
    replyToId: saved.reply_to_id,
    read: saved.read,
  };
}

function sortChronological(
  items: RealtimeChatMessage[],
): RealtimeChatMessage[] {
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
}

// Keep a module-level singleton per conversationId so refreshing does not double-subscribe.
const activeChannels = new Map<string, RealtimeChannel>();

export function useRealtimeChat({
  roomName,
  conversationId,
  userId,
  userDisplayName,
  getToken,
  enabled,
  historyNotBefore,
}: UseRealtimeChatOptions) {
  const getJwt = useMemo(() => wrapClerkTokenForSupabase(getToken), [getToken]);
  const messaging = useMemo(() => new MessagingService(getToken), [getToken]);

  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [presencePeers, setPresencePeers] = useState<
    { key: string; name: string }[]
  >([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const presencePeersRef = useRef<{ key: string; name: string }[]>([]);
  // Track whether a history load is in flight so reconnections don't double-load.
  const historyLoadingRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!conversationId || !userId || historyLoadingRef.current) return;
    historyLoadingRef.current = true;
    try {
      // Ensure user is in conversation_participants before querying.
      // This resolves the race where study group members haven't been added yet.
      await messaging.ensureGroupChatParticipant(conversationId, userId);

      const rows = await messaging.getMessages(
        conversationId,
        userId,
        80,
        0,
        historyNotBefore,
      );
      setMessages(sortChronological(rows.map(toChatMessage)));
    } catch (err) {
      console.error("[social:chat] Failed to load history:", err);
    } finally {
      historyLoadingRef.current = false;
    }
  }, [conversationId, messaging, userId, historyNotBefore]);

  useEffect(() => {
    if (!enabled || !conversationId || !userId || !roomName) {
      setMessages([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const client = createAuthenticatedSupabaseClient(getJwt);
    if (!client) {
      setStatus("error");
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setup = async () => {
      setStatus("connecting");

      // 1. Ensure participant + pre-load history before subscribing.
      await loadHistory();
      if (cancelled) return;

      // 2. Initialize channel.
      channel = client.channel(roomName, {
        config: {
          broadcast: { ack: true },
          presence: { key: userId },
        },
      });

      // 3. Set up listeners.
      channel
        .on(
          "broadcast",
          { event: "message" },
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
              }),
            );
          },
        )
        .on(
          "broadcast",
          { event: "typing" },
          ({
            payload,
          }: {
            payload: { userId: string; isTyping: boolean };
          }) => {
            if (!payload?.userId) return;
            setTypingUserIds((prev) => {
              const next = new Set(prev);
              if (payload.isTyping) next.add(payload.userId);
              else next.delete(payload.userId);
              return next;
            });
          },
        )
        .on("presence", { event: "sync" }, () => {
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
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row?.id) return;

            if (
              row.encrypted === true ||
              isLikelyAtRestCiphertext(String(row.content ?? ""))
            ) {
              void loadHistory();
              return;
            }

            // Respect history cutoff for postgres_changes too.
            if (
              historyNotBefore &&
              new Date(row.created_at as string) <
                new Date(historyNotBefore)
            ) {
              return;
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;

              // Resolve display name: own message, historical match, or presence.
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
              });
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row?.id) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id ? { ...m, read: Boolean(row.read) } : m,
              ),
            );
          },
        );

      channelRef.current = channel;
      activeChannels.set(roomName, channel);

      // 4. Subscribe with auth — set JWT on the Realtime socket before subscribing.
      const jwt = await getJwt();
      if (jwt) {
        (client.realtime as unknown as { setAuth: (t: string) => void }).setAuth(
          jwt,
        );
      }

      channel.subscribe(async (subStatus) => {
        if (cancelled || !channel) return;

        if (subStatus === "SUBSCRIBED") {
          setStatus("subscribed");
          await channel.track({ userId, name: userDisplayName });
          // Reload history on each successful subscribe (handles refresh + reconnect).
          void loadHistory();
        } else if (
          subStatus === "CHANNEL_ERROR" ||
          subStatus === "TIMED_OUT"
        ) {
          console.error(`[social:chat] Channel status: ${subStatus}`);
          setStatus("error");
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
    roomName,
    userDisplayName,
    userId,
  ]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch || status !== "subscribed") return;
      void ch.send({
        type: "broadcast",
        event: "typing",
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
      };

      setMessages((prev) => mergeById(prev, optimisticMsg));

      const ch = channelRef.current;
      if (ch && status === "subscribed") {
        void ch.send({
          type: "broadcast",
          event: "message",
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
        console.error("[social:chat] Failed to persist message:", error);
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
        console.error("[social:chat] Failed to mark message as read:", error);
      }
    },
    [messaging, userId],
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
  };
}

/** @deprecated Use `useRealtimeChat` with `roomName: \`group-chat:${conversationId}\``. */
export function useRealtimeGroupChat(
  opts: Omit<UseRealtimeChatOptions, "roomName"> & { conversationId: string },
) {
  const roomName = `group-chat:${opts.conversationId}`;
  return useRealtimeChat({ ...opts, roomName });
}
