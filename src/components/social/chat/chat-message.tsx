'use client';

import { cn } from '@/lib/utils';
import type { RealtimeChatMessage } from '@/components/social/chat/realtime-chat-types';

interface ChatMessageItemProps {
  message: RealtimeChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
}

export function ChatMessageItem({ message, isOwnMessage, showHeader }: ChatMessageItemProps) {
  return (
    <div className={cn('mt-2 flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div
        className={cn('flex max-w-[75%] w-fit flex-col gap-1', {
          'items-end': isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn('flex items-center gap-2 px-3 text-xs', {
              'flex-row-reverse justify-end': isOwnMessage,
            })}
          >
            <span className="font-medium">{message.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.createdAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
        <div
          className={cn(
            'w-fit rounded-xl px-3 py-2 text-sm',
            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
