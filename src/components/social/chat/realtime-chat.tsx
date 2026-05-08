"use client";

import { ChatMessageItem } from "@/components/social/chat/chat-message";
import type {
  RealtimeChatMessage,
  RealtimeConnectionStatus,
} from "@/components/social/chat/realtime-chat-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { cn } from "@/lib/utils";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Presentational shell for Supabase Realtime Chat (Broadcast + scroll).
 * @see https://supabase.com/ui/docs/nextjs/realtime-chat
 */
export interface RealtimeChatProps {
  /** Shown in the header (e.g. study group name). Realtime topic is configured in `useRealtimeChat`. */
  title: string;
  username: string;
  currentUserId: string;
  messages: RealtimeChatMessage[];
  onSend: (text: string, replyToId?: string) => void | Promise<void>;
  onMarkRead?: (messageId: string) => void;
  onTyping?: (isTyping: boolean) => void;
  typingLabel?: string;
  status?: RealtimeConnectionStatus;
  presenceSummary?: string;
  disabled?: boolean;
  className?: string;
}

export const RealtimeChat: React.FC<RealtimeChatProps> = ({
  title,
  username,
  currentUserId,
  messages,
  onSend,
  onMarkRead,
  onTyping,
  typingLabel,
  status = "idle",
  presenceSummary,
  disabled,
  className,
}) => {
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const { endRef, scrollToBottom } = useChatScroll([messages.length, title]);

  const repliedMessage = useMemo(() => {
    return replyToId ? messages.find(m => m.id === replyToId) : undefined;
  }, [messages, replyToId]);

  // Mark unread messages from others as read
  useEffect(() => {
    if (!onMarkRead) return;
    const unreadFromOthers = messages.filter(
      (m) => m.senderId !== currentUserId && !m.read
    );
    unreadFromOthers.forEach((m) => onMarkRead(m.id));
  }, [messages, currentUserId, onMarkRead]);

  const statusLabel = useMemo(() => {
    if (status === "subscribed") return "Live";
    if (status === "connecting") return "Connecting…";
    if (status === "error") return "Reconnecting…";
    return "";
  }, [status]);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft("");
    const replyId = replyToId;
    setReplyToId(undefined);
    onTyping?.(false);
    await onSend(text, replyId);
    scrollToBottom("smooth");
  }, [disabled, draft, onSend, onTyping, scrollToBottom, replyToId]);

  return (
    <div className={cn("flex h-full min-h-[280px] flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">{title}</span>
        <span className="shrink-0 tabular-nums">{statusLabel}</span>
      </div>
      {presenceSummary ? (
        <div className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">
          {presenceSummary}
        </div>
      ) : null}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1 pr-2">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            messages.map((message, index) => {
              const prev = messages[index - 1];
              const showHeader =
                index === 0 ||
                prev.user.name !== message.user.name ||
                new Date(message.createdAt).getTime() -
                  new Date(prev.createdAt).getTime() >
                  120_000;
              const isOwn = message.senderId
                ? message.senderId === currentUserId
                : message.user.name === username;
              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwn}
                  showHeader={showHeader}
                  onReply={(id) => setReplyToId(id)}
                  repliedMessageContent={message.replyToId ? messages.find(m => m.id === message.replyToId)?.content : undefined}
                />
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      {typingLabel ? (
        <div className="px-3 pb-1 text-xs text-muted-foreground">
          {typingLabel}
        </div>
      ) : null}
      
      {repliedMessage && (
        <div className="px-3 py-2 bg-muted/50 border-t flex items-center justify-between text-xs">
          <div className="truncate flex-1">
            <span className="font-semibold mr-2">Replying to {repliedMessage.user.name}:</span>
            <span className="text-muted-foreground">{repliedMessage.content}</span>
          </div>
          <button onClick={() => setReplyToId(undefined)} className="p-1 hover:bg-muted rounded-full">
             ✕
          </button>
        </div>
      )}

      <div className="flex gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          onBlur={() => onTyping?.(false)}
          placeholder="Message the group"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || !draft.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
