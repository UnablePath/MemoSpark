"use client";

import { RealtimeChat } from "@/components/social/chat/realtime-chat";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useAuth, useUser } from "@clerk/nextjs";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";

interface StudyGroupRealtimeChatProps {
  conversationId: string;
  groupName: string;
  isMember: boolean;
  className?: string;
}

export const StudyGroupRealtimeChat: React.FC<StudyGroupRealtimeChatProps> = ({
  conversationId,
  groupName,
  isMember,
  className,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const displayName =
    user?.fullName || user?.firstName || user?.username || "You";
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realtimeRoomName = useMemo(
    () => `group-chat:${conversationId}`,
    [conversationId],
  );

  const {
    messages,
    status,
    typingUserIds,
    presencePeers,
    sendMessage,
    sendTyping,
  } = useRealtimeChat({
    roomName: realtimeRoomName,
    conversationId,
    userId: user?.id || "",
    userDisplayName: displayName,
    getToken,
    enabled: Boolean(isMember && user?.id && conversationId),
  });

  const typingLabel = useMemo(() => {
    const others = [...typingUserIds].filter((id) => id !== user?.id);
    if (others.length === 0) return "";
    return others.length === 1
      ? "Someone is typing…"
      : "Several people are typing…";
  }, [typingUserIds, user?.id]);

  const presenceSummary = useMemo(() => {
    if (presencePeers.length <= 1) return "";
    const names = presencePeers.map((p) => p.name).filter(Boolean);
    return `${names.length} here: ${names.slice(0, 4).join(", ")}${names.length > 4 ? "…" : ""}`;
  }, [presencePeers]);

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
      title={groupName}
      username={displayName}
      currentUserId={user.id}
      messages={messages}
      onSend={(text) => sendMessage(text)}
      onTyping={handleTyping}
      typingLabel={typingLabel}
      status={status}
      presenceSummary={presenceSummary}
      disabled={!isMember}
    />
  );
};
