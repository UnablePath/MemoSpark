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
  const presencePeersRef = useRef<{ key: string; name: string }[]>([]);
  
  const loadHistory = useCallback(async () => {
    if (!conversationId || !userId) return;
    try {
      const rows = await messaging.getMessages(conversationId, userId, 80, 0);
      setMessages(sortChronological(rows.map(toChatMessage)));
    } catch (err) {
      console.error("[RealtimeChat] Failed to load history:", err);
    }
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
      
      // 1. Pre-load history
      await loadHistory();
      if (cancelled) return;

      // 2. Initialize Channel
      channel = client.channel(roomName, {
        config: {
          broadcast: { ack: true },
          presence: { key: userId },
        },
      });

      // 3. Setup Listeners
      channel
        .on(
          "broadcast",
          { event: "message" },
          ({ payload }: { payload: any }) => {
            if (!payload?.id) return;
            setMessages((prev) => mergeById(prev, {
              id: payload.id,
              content: payload.content,
              user: { name: payload.userName },
              createdAt: payload.createdAt,
              senderId: payload.senderId,
              replyToId: payload.replyToId,
              read: payload.read,
            }));
          }
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
          }
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState();
          if (!state) return;
          
          const peers: { key: string; name: string }[] = [];
          for (const key of Object.keys(state)) {
            const presences = state[key] as any[];
            const first = presences?.[0];
            peers.push({ key, name: first?.name || first?.userId || key });
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
            const row = payload.new as any;
            if (!row?.id) return;
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              
              let resolvedName = row.sender_id;
              if (row.sender_id === userId) {
                resolvedName = userDisplayName;
              } else {
                const historicalMatch = prev.find((m) => m.senderId === row.sender_id && m.user.name !== row.sender_id);
                if (historicalMatch) {
                  resolvedName = historicalMatch.user.name;
                } else {
                  const presenceMatch = presencePeersRef.current.find(p => p.key === row.sender_id);
                  if (presenceMatch) resolvedName = presenceMatch.name;
                }
              }

              return mergeById(prev, {
                id: row.id,
                content: row.content,
                user: { name: resolvedName },
                createdAt: row.created_at,
                senderId: row.sender_id,
                replyToId: row.reply_to_id,
                read: row.read,
              });
            });
          }
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
            const row = payload.new as any;
            if (!row?.id) return;
            setMessages((prev) => 
              prev.map(m => m.id === row.id ? { ...m, read: row.read } : m)
            );
          }
        );

      channelRef.current = channel;

      // 4. Subscribe with Auth
      const jwt = await getJwt();
      if (jwt) {
        // Explicitly set auth for the realtime socket
        (client.realtime as any).setAuth(jwt);
      }

      channel.subscribe(async (subStatus) => {
        if (cancelled || !channel) return;
        
        if (subStatus === "SUBSCRIBED") {
          setStatus("subscribed");
          await channel.track({ userId, name: userDisplayName });
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          console.error(`[RealtimeChat] Channel status: ${subStatus}`);
          setStatus("error");
        }
      });
    };

    void setup();

    return () => {
      cancelled = true;
      if (channel) {
        void client.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [conversationId, enabled, getJwt, loadHistory, roomName, userDisplayName, userId]);

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

      // Apply optimistic update
      setMessages((prev) => mergeById(prev, optimisticMsg));

      // Broadcast to online peers for instant gratification
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
        // Success: the postgres_changes listener will handle the official row swap if needed,
        // but since we used the same ID, mergeById will handle it.
      } catch (error) {
        console.error("[RealtimeChat] Failed to persist message:", error);
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
            msg.id === messageId ? { ...msg, read: true } : msg
          )
        );
      } catch (error) {
        console.error("[RealtimeChat] Failed to mark message as read:", error);
      }
    },
    [messaging, userId]
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
