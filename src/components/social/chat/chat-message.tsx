'use client';

import { cn } from '@/lib/utils';
import type { RealtimeChatMessage } from '@/components/social/chat/realtime-chat-types';
import { Reply, Check, CheckCheck } from 'lucide-react';

interface ChatMessageItemProps {
  message: RealtimeChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  onReply?: (messageId: string, content: string) => void;
  repliedMessageContent?: string;
}

export function ChatMessageItem({ message, isOwnMessage, showHeader, onReply, repliedMessageContent }: ChatMessageItemProps) {
  return (
    <div className={cn('group mt-2 flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div
        className={cn('flex max-w-[75%] w-fit flex-col gap-1 relative', {
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
        
        {message.replyToId && repliedMessageContent && (
          <div className={cn('text-xs opacity-75 px-3 py-1 mb-1 rounded-md border-l-2 border-primary/50 bg-primary/10 max-w-full truncate', isOwnMessage ? 'self-end' : 'self-start')}>
            <span className="italic">{repliedMessageContent}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 relative">
          {!isOwnMessage && onReply && (
            <button
              onClick={() => onReply(message.id, message.content)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
          
          <div
            className={cn(
              'w-fit rounded-xl px-3 py-2 text-sm relative',
              isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            )}
          >
            {message.content}
            
            {isOwnMessage && (
              <span className="absolute -bottom-4 right-1 text-xs text-muted-foreground flex items-center">
                {message.read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 opacity-50" />}
              </span>
            )}
          </div>
          
          {isOwnMessage && onReply && (
            <button
              onClick={() => onReply(message.id, message.content)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
