"use client";

import { ChatMessageItem } from "@/components/social/chat/chat-message";
import type {
  RealtimeChatMessage,
  RealtimeConnectionStatus,
} from "@/components/social/chat/realtime-chat-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { cn } from "@/lib/utils";
import { ArrowUp, Circle, ChatCircle } from "@phosphor-icons/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Presentational shell for Supabase Realtime Chat (Broadcast + scroll).
 * @see https://supabase.com/ui/docs/nextjs/realtime-chat
 */
export interface RealtimeChatProps {
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const repliedMessage = useMemo(
    () => (replyToId ? messages.find((m) => m.id === replyToId) : undefined),
    [messages, replyToId],
  );

  // Mark unread messages from others as read when they appear.
  useEffect(() => {
    if (!onMarkRead) return;
    messages
      .filter((m) => m.senderId !== currentUserId && !m.read)
      .forEach((m) => onMarkRead(m.id));
  }, [messages, currentUserId, onMarkRead]);

  // Auto-resize textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const statusDot = useMemo(() => {
    if (status === "subscribed") return { color: "text-emerald-500", label: "Live" };
    if (status === "connecting") return { color: "text-amber-400", label: "Connecting…" };
    if (status === "error") return { color: "text-red-400", label: "Reconnecting…" };
    return null;
  }, [status]);

  const handleReply = useCallback(
    (id: string, content: string) => {
      setReplyToId(id);
      textareaRef.current?.focus();
    },
    [],
  );

  const cancelReply = useCallback(() => setReplyToId(undefined), []);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-[280px] flex-col bg-background",
        className,
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <ChatCircle weight="duotone" className="h-4 w-4 shrink-0 text-[#1a9e6e]" aria-hidden />
          <span className="truncate text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {presenceSummary && (
            <span className="text-[11px] text-muted-foreground/70 truncate max-w-[140px]">
              {presenceSummary}
            </span>
          )}
          {statusDot && (
            <div className="flex items-center gap-1">
              <Circle
                weight="fill"
                className={cn("h-2 w-2 animate-pulse", statusDot.color)}
                aria-hidden
              />
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {statusDot.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                <ChatCircle weight="duotone" className="h-6 w-6 text-muted-foreground/50" aria-hidden />
              </div>
              <p className="text-sm text-muted-foreground/70 max-w-[200px]">
                No conversations yet. Be the first to say something.
              </p>
            </div>
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
                  onReply={handleReply}
                  repliedMessageContent={
                    message.replyToId
                      ? messages.find((m) => m.id === message.replyToId)?.content
                      : undefined
                  }
                />
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* ── Typing indicator ── */}
      {typingLabel && (
        <div className="flex items-center gap-1.5 px-4 py-1">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {typingLabel}
          </span>
        </div>
      )}

      {/* ── Reply preview ── */}
      {repliedMessage && (
        <div className="flex items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2">
          <div className="h-4 w-0.5 shrink-0 rounded-full bg-[#1a9e6e]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-[#1a9e6e] leading-none mb-0.5">
              {repliedMessage.user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {repliedMessage.content}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelReply}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground transition-colors"
            aria-label="Cancel reply"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="border-t border-border/60 px-3 py-2.5">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2",
            "transition-shadow focus-within:border-[#1a9e6e]/40 focus-within:shadow-[0_0_0_3px_rgba(26,158,110,0.08)]",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onTyping?.(e.target.value.length > 0);
            }}
            onBlur={() => onTyping?.(false)}
            onKeyDown={handleKeyDown}
            placeholder="Message the group"
            disabled={disabled}
            aria-label="Message input"
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50",
              "outline-none min-h-[22px] max-h-[120px] leading-relaxed",
              "scrollbar-hide",
            )}
            style={{ overflowY: "hidden" }}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={disabled || !draft.trim()}
            aria-label="Send message"
            className={cn(
              "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
              draft.trim()
                ? "bg-[#1a9e6e] text-white shadow-sm shadow-[#1a9e6e]/30 hover:bg-[#168a5e] active:scale-95"
                : "bg-muted/60 text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            <ArrowUp weight="bold" className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/40">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
