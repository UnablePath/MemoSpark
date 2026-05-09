'use client';

import { ChatMessageItem } from '@/components/social/chat/chat-message';
import {
  COMPOSER_EMOJI_GRID,
  type RealtimeChatMessage,
  type RealtimeConnectionStatus,
} from '@/components/social/chat/realtime-chat-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { cn } from '@/lib/utils';
import {
  ArrowUp,
  ChatCircle,
  Smiley,
  X,
} from '@phosphor-icons/react';
import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';

const ACCENT = '#1a9e6e';

interface RealtimeChatMessageListProps {
  messages: RealtimeChatMessage[];
  currentUserId: string;
  username: string;
  disabled?: boolean;
  onReply: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  replyContentById: Map<string, string>;
}

const RealtimeChatMessageList = memo(function RealtimeChatMessageList({
  messages,
  currentUserId,
  username,
  disabled,
  onReply,
  onReact,
  onEdit,
  onDelete,
  replyContentById,
}: RealtimeChatMessageListProps) {
  return (
    <>
      {messages.map((message, index) => {
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
            onReply={onReply}
            onReact={onReact}
            onEdit={isOwn ? onEdit : undefined}
            onDelete={isOwn ? onDelete : undefined}
            readOnly={disabled}
            repliedMessageContent={
              message.replyToId
                ? replyContentById.get(message.replyToId)
                : undefined
            }
          />
        );
      })}
    </>
  );
});

/**
 * Presentational shell for Supabase Realtime Chat (Broadcast + scroll).
 *
 * Layout contract: PARENT must constrain height (e.g., `h-[600px]` or `flex-1 min-h-0`).
 * This shell internally pins composer to bottom and scrolls only the messages area.
 *
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
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  typingLabel?: string;
  status?: RealtimeConnectionStatus;
  presenceSummary?: string;
  disabled?: boolean;
  /** Placeholder for the composer textarea. */
  composerPlaceholder?: string;
  /** Empty-state copy when there are no messages. */
  emptyStateCopy?: string;
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
  onReact,
  onEdit,
  onDelete,
  typingLabel,
  status = 'idle',
  presenceSummary,
  disabled,
  composerPlaceholder = 'Message',
  emptyStateCopy = 'No messages yet. Be the first to say something.',
  className,
}) => {
  const [draft, setDraft] = useState('');
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const { endRef, scrollToBottom } = useChatScroll([messages.length, title]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  const replyContentById = useMemo(() => {
    const m = new Map<string, string>();
    for (const msg of messages) {
      m.set(msg.id, msg.content);
    }
    return m;
  }, [messages]);

  const statusMeta = useMemo(() => {
    const parts: string[] = [];
    if (presenceSummary) parts.push(presenceSummary);
    if (status === 'subscribed') parts.push('Live');
    else if (status === 'connecting') parts.push('Connecting…');
    else if (status === 'error') parts.push('Reconnecting…');
    return parts.join(' · ');
  }, [presenceSummary, status]);

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

  // Auto-resize textarea on content change.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  // Close emoji picker on outside click.
  useEffect(() => {
    if (!showEmojiGrid) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(t)) {
        setShowEmojiGrid(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiGrid]);

  const handleReply = useCallback((id: string) => {
    setReplyToId(id);
    textareaRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => setReplyToId(undefined), []);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = textareaRef.current;
      if (!el) {
        setDraft((d) => d + emoji);
        return;
      }
      const start = el.selectionStart ?? draft.length;
      const end = el.selectionEnd ?? draft.length;
      const next = draft.slice(0, start) + emoji + draft.slice(end);
      setDraft(next);
      // Restore caret after the inserted emoji.
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + emoji.length;
        el.setSelectionRange(caret, caret);
      });
    },
    [draft],
  );

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft('');
    setShowEmojiGrid(false);
    const replyId = replyToId;
    setReplyToId(undefined);
    onTyping?.(false);
    await onSend(text, replyId);
    scrollToBottom('smooth');
  }, [disabled, draft, onSend, onTyping, scrollToBottom, replyToId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-hidden bg-background',
        className,
      )}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ChatCircle
            weight="duotone"
            className="h-4 w-4 shrink-0"
            style={{ color: ACCENT }}
            aria-hidden
          />
          <span className="truncate text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>

        {statusMeta ? (
          <p className="max-w-[45%] shrink-0 truncate text-end text-[10px] leading-snug text-muted-foreground sm:max-w-[55%] sm:text-[11px]">
            {statusMeta}
          </p>
        ) : null}
      </div>

      {/* ── Messages (scrolls) ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                <ChatCircle
                  weight="duotone"
                  className="h-6 w-6 text-muted-foreground/50"
                  aria-hidden
                />
              </div>
              <p className="max-w-[220px] text-sm text-muted-foreground/70">
                {emptyStateCopy}
              </p>
            </div>
          ) : (
            <RealtimeChatMessageList
              messages={messages}
              currentUserId={currentUserId}
              username={username}
              disabled={disabled}
              onReply={handleReply}
              onReact={onReact}
              onEdit={onEdit}
              onDelete={onDelete}
              replyContentById={replyContentById}
            />
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* ── Typing indicator ── */}
      {typingLabel && (
        <div className="flex shrink-0 items-center gap-1.5 border-t border-border/40 px-4 py-1">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1 w-1 animate-bounce rounded-full bg-muted-foreground/50"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="text-[11px] text-muted-foreground/60">{typingLabel}</span>
        </div>
      )}

      {/* ── Reply preview ── */}
      {repliedMessage && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2">
          <div
            className="h-4 w-0.5 shrink-0 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          <div className="min-w-0 flex-1">
            <p
              className="mb-0.5 text-[10px] font-semibold leading-none"
              style={{ color: ACCENT }}
            >
              Replying to {repliedMessage.user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {repliedMessage.content}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelReply}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
            aria-label="Cancel reply"
          >
            <X weight="bold" className="h-3 w-3" aria-hidden />
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="relative shrink-0 border-t border-border/60 bg-background px-3 py-2.5 [padding-bottom:max(0.625rem,env(safe-area-inset-bottom))]">
        {showEmojiGrid && (
          <div
            ref={emojiPanelRef}
            role="dialog"
            aria-label="Emoji picker"
            className="absolute bottom-full left-3 right-3 z-10 mb-2 grid grid-cols-6 gap-1 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-xl backdrop-blur-md"
          >
            {COMPOSER_EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="flex h-9 w-full items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-muted/60 active:scale-95"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/30 px-2.5 py-1.5',
            'transition-shadow focus-within:border-[color:var(--ms-chat-accent)]/40 focus-within:shadow-[0_0_0_3px_rgba(26,158,110,0.08)]',
            disabled && 'pointer-events-none opacity-50',
          )}
          style={{ ['--ms-chat-accent' as string]: ACCENT }}
        >
          <button
            type="button"
            onClick={() => setShowEmojiGrid((v) => !v)}
            disabled={disabled}
            aria-label="Insert emoji"
            aria-expanded={showEmojiGrid}
            className={cn(
              'mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
              showEmojiGrid
                ? 'bg-muted/70 text-foreground'
                : 'text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <Smiley weight="bold" className="h-4 w-4" aria-hidden />
          </button>

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
            placeholder={composerPlaceholder}
            disabled={disabled}
            aria-label="Message input"
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50',
              'min-h-[22px] max-h-[132px] leading-relaxed',
              'scrollbar-hide',
            )}
            style={{ overflowY: 'hidden' }}
          />

          <button
            type="button"
            onClick={() => void submit()}
            disabled={disabled || !draft.trim()}
            aria-label="Send message"
            className={cn(
              'mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
              draft.trim()
                ? 'text-white shadow-sm active:scale-95'
                : 'cursor-not-allowed bg-muted/60 text-muted-foreground/40',
            )}
            style={
              draft.trim()
                ? {
                    backgroundColor: ACCENT,
                    boxShadow: `0 1px 2px ${ACCENT}4d`,
                  }
                : undefined
            }
          >
            <ArrowUp weight="bold" className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-1.5 hidden px-1 text-[10px] text-muted-foreground/40 sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
