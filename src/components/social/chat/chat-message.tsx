'use client';

import { cn } from '@/lib/utils';
import type { RealtimeChatMessage } from '@/components/social/chat/realtime-chat-types';
import { ArrowBendUpLeft, Check, Checks } from '@phosphor-icons/react';

interface ChatMessageItemProps {
  message: RealtimeChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  onReply?: (messageId: string, content: string) => void;
  repliedMessageContent?: string;
}

export function ChatMessageItem({
  message,
  isOwnMessage,
  showHeader,
  onReply,
  repliedMessageContent,
}: ChatMessageItemProps) {
  const timeLabel = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'group flex gap-2 px-1',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row',
        showHeader ? 'mt-4' : 'mt-0.5',
      )}
    >
      {/* Avatar initial */}
      {showHeader ? (
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold uppercase',
            isOwnMessage
              ? 'bg-[#1a9e6e]/20 text-[#1a9e6e]'
              : 'bg-muted/80 text-muted-foreground',
          )}
          aria-hidden
        >
          {message.user.name.charAt(0)}
        </div>
      ) : (
        <div className="w-7 shrink-0" aria-hidden />
      )}

      <div
        className={cn(
          'flex max-w-[72%] flex-col gap-0.5',
          isOwnMessage ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name + timestamp */}
        {showHeader && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-1',
              isOwnMessage ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <span className="text-[11px] font-semibold text-foreground/80 leading-none">
              {message.user.name}
            </span>
            <span className="text-[10px] text-muted-foreground/60 leading-none tabular-nums">
              {timeLabel}
            </span>
          </div>
        )}

        {/* Reply context */}
        {message.replyToId && repliedMessageContent && (
          <div
            className={cn(
              'flex max-w-full items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5',
              isOwnMessage ? 'self-end' : 'self-start',
            )}
          >
            <div className="h-3 w-0.5 shrink-0 rounded-full bg-[#1a9e6e]/70" />
            <span className="truncate text-[11px] italic text-muted-foreground">
              {repliedMessageContent}
            </span>
          </div>
        )}

        {/* Bubble + reply action */}
        <div
          className={cn(
            'flex items-end gap-1.5',
            isOwnMessage ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          {/* Reply button — only shown on hover */}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message.id, message.content)}
              className={cn(
                'mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-all',
                'text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground',
                'group-hover:opacity-100 focus-visible:opacity-100',
              )}
              aria-label="Reply to message"
              title="Reply"
            >
              <ArrowBendUpLeft weight="bold" className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              'relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              isOwnMessage
                ? 'rounded-br-sm bg-[#1a9e6e] text-white shadow-sm shadow-[#1a9e6e]/20'
                : 'rounded-bl-sm bg-muted/70 text-foreground shadow-sm',
            )}
          >
            <span className="break-words">{message.content}</span>

            {/* Timestamp for non-header messages */}
            {!showHeader && (
              <span
                className={cn(
                  'ml-2 inline-block text-[10px] tabular-nums leading-none',
                  isOwnMessage
                    ? 'text-white/50'
                    : 'text-muted-foreground/50',
                )}
              >
                {timeLabel}
              </span>
            )}

            {/* Read receipt for own messages */}
            {isOwnMessage && (
              <span className="ml-1.5 inline-flex items-center align-middle">
                {message.read ? (
                  <Checks weight="bold" className="h-3 w-3 text-white/70" aria-label="Read" />
                ) : (
                  <Check weight="bold" className="h-3 w-3 text-white/40" aria-label="Sent" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
