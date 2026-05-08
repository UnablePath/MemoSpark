'use client';

import { RealtimeChat } from '@/components/social/chat/realtime-chat';
import { useRealtimeChat } from '@/hooks/use-realtime-chat';
import { useAuth, useUser } from '@clerk/nextjs';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

interface DirectMessageChatProps {
  /** UUID of the direct (one-on-one) conversation. */
  conversationId: string;
  /** Display name of the recipient (used in header + composer placeholder). */
  recipientName: string;
  /** Disable composer when set (e.g., recipient blocked). */
  disabled?: boolean;
  className?: string;
}

/**
 * Direct-message variant of the realtime chat. Single conversation, no sidebar.
 *
 * - Uses a dedicated room name (`dm:<conversationId>`) so it never collides with
 *   group chats — preserving privacy between conversation types.
 * - Skips the group-chat participant-ensure RPC (DMs already register both
 *   participants at conversation creation in `get_or_create_direct_conversation`).
 */
export const DirectMessageChat: React.FC<DirectMessageChatProps> = ({
  conversationId,
  recipientName,
  disabled,
  className,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const displayName =
    user?.fullName || user?.firstName || user?.username || 'You';
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realtimeRoomName = useMemo(
    () => `dm:${conversationId}`,
    [conversationId],
  );

  const {
    messages,
    status,
    typingUserIds,
    sendMessage,
    sendTyping,
    markAsRead,
    toggleReaction,
    editMessage,
    deleteMessage,
  } = useRealtimeChat({
    roomName: realtimeRoomName,
    conversationId,
    userId: user?.id || '',
    userDisplayName: displayName,
    getToken,
    enabled: Boolean(user?.id && conversationId),
    ensureParticipant: false,
  });

  const typingLabel = useMemo(() => {
    const others = [...typingUserIds].filter((id) => id !== user?.id);
    if (others.length === 0) return '';
    return `${recipientName} is typing…`;
  }, [recipientName, typingUserIds, user?.id]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  const handleTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (isTyping) {
      typingTimeout.current = setTimeout(() => sendTyping(false), 2500);
    }
  };

  if (!user?.id) return null;

  return (
    <RealtimeChat
      className={className}
      title={recipientName}
      username={displayName}
      currentUserId={user.id}
      messages={messages}
      onSend={(text, replyToId) => sendMessage(text, replyToId)}
      onMarkRead={markAsRead}
      onTyping={handleTyping}
      onReact={toggleReaction}
      onEdit={editMessage}
      onDelete={deleteMessage}
      typingLabel={typingLabel}
      status={status}
      composerPlaceholder={`Message ${recipientName}`}
      emptyStateCopy={`Start the conversation with ${recipientName}.`}
      disabled={disabled}
    />
  );
};
