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
import { useCallback, useMemo, useState } from "react";

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
  onSend: (text: string) => void | Promise<void>;
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
  onTyping,
  typingLabel,
  status = "idle",
  presenceSummary,
  disabled,
  className,
}) => {
  const [draft, setDraft] = useState("");
  const { endRef, scrollToBottom } = useChatScroll([messages.length, title]);

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
    onTyping?.(false);
    await onSend(text);
    scrollToBottom("smooth");
  }, [disabled, draft, onSend, onTyping, scrollToBottom]);

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
