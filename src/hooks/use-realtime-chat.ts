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
  /** Topic for `supabase.channel(roomName)` — must be unique per room (Supabase UI contract). */
  roomName: string;
  /** Used for DB load, send, and postgres_changes filter. */
  conversationId: string;
  userId: string;
  userDisplayName: string;
  getToken: ClerkGetToken;
  enabled: boolean;
}

export function useRealtimeChat({
  roomName,
  conversationId,
  userId,
  userDisplayName,
  getToken,
  enabled,
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
  const typingClearRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const loadHistory = useCallback(async () => {
    if (!conversationId || !userId) return;
    const rows = await messaging.getMessages(conversationId, userId, 80, 0);
    setMessages(sortChronological(rows.map(toChatMessage)));
  }, [conversationId, messaging, userId]);

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
      try {
        const jwt = await getJwt();
        const rt = client.realtime as unknown as {
          setAuth?: (t: string) => void;
        };
        if (jwt && typeof rt.setAuth === "function") {
          rt.setAuth(jwt);
        }
      } catch {
        /* continue */
      }

      await loadHistory();
      if (cancelled) return;

      channel = client
        .channel(roomName, {
          config: {
            private: true,
            broadcast: { ack: true },
            presence: { key: userId },
          },
        })
        .on(
          "broadcast",
          { event: "message" },
          ({
            payload,
          }: {
            payload: {
              id: string;
              content: string;
              userName: string;
              createdAt: string;
              senderId?: string;
            };
          }) => {
            if (!payload?.id) return;
            setMessages((prev) =>
              mergeById(prev, {
                id: payload.id,
                content: payload.content,
                user: { name: payload.userName },
                createdAt: payload.createdAt,
                senderId: payload.senderId,
              }),
            );
          },
        )
        .on(
          "broadcast",
          { event: "typing" },
          ({ payload }: { payload: { userId: string; isTyping: boolean } }) => {
            if (!payload?.userId) return;
            setTypingUserIds((prev) => {
              const n = new Set(prev);
              if (payload.isTyping) n.add(payload.userId);
              else n.delete(payload.userId);
              return n;
            });
          },
        )
        .on("presence", { event: "sync" }, () => {
          if (!channel) return;
          const state = channel.presenceState();
          const peers: { key: string; name: string }[] = [];
          for (const key of Object.keys(state)) {
            const presences = state[key] as {
              userId?: string;
              name?: string;
            }[];
            const first = presences?.[0];
            peers.push({ key, name: first?.name || first?.userId || key });
          }
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
            const row = payload.new as {
              id: string;
              content: string;
              sender_id: string;
              created_at: string;
            };
            if (!row?.id) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return mergeById(prev, {
                id: row.id,
                content: row.content,
                user: {
                  name:
                    row.sender_id === userId ? userDisplayName : row.sender_id,
                },
                createdAt: row.created_at,
                senderId: row.sender_id,
              });
            });
          },
        );

      channelRef.current = channel;

      channel.subscribe(async (subStatus) => {
        if (cancelled || !channel) return;
        if (subStatus === "SUBSCRIBED") {
          setStatus("subscribed");
          await channel.track({ userId, name: userDisplayName });
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setStatus("error");
        }
      });
    };

    void setup();

    return () => {
      cancelled = true;
      for (const t of typingClearRef.current.values()) {
        clearTimeout(t);
      }
      typingClearRef.current.clear();
      channelRef.current = null;
      if (channel) {
        try {
          void client.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [
    conversationId,
    enabled,
    getJwt,
    loadHistory,
    roomName,
    userDisplayName,
    userId,
  ]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, isTyping },
      });
    },
    [userId],
  );

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !conversationId) return;
      const saved = await messaging.sendMessage({
        userId,
        conversationId,
        content: text,
        recipientId: userId,
      });
      const chatMsg = fromInsertRow(saved, userDisplayName);
      setMessages((prev) => mergeById(prev, chatMsg));

      const ch = channelRef.current;
      if (ch) {
        void ch.send({
          type: "broadcast",
          event: "message",
          payload: {
            id: saved.id,
            content: saved.content,
            userName: chatMsg.user.name,
            createdAt: saved.created_at,
            senderId: userId,
          },
        });
      }
    },
    [conversationId, messaging, userDisplayName, userId],
  );

  return {
    messages,
    status,
    typingUserIds,
    presencePeers,
    sendMessage,
    sendTyping,
    reload: loadHistory,
  };
}

/** @deprecated Use `useRealtimeChat` with `roomName: \`group-chat:${conversationId}\``. */
export function useRealtimeGroupChat(
  opts: Omit<UseRealtimeChatOptions, "roomName"> & { conversationId: string },
) {
  const roomName = `group-chat:${opts.conversationId}`;
  return useRealtimeChat({ ...opts, roomName });
}
