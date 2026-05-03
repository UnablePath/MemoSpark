"use client";

import { StudyGroupRealtimeChat } from "@/components/social/chat/StudyGroupRealtimeChat";
import { Button } from "@/components/ui/button";
import type { MessagingService } from "@/lib/messaging/MessagingService";
import type { StudyGroup } from "@/lib/social/StudyGroupManager";
import type { StudyGroupManager } from "@/lib/social/StudyGroupManager";
import { ChatCircle } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

interface StudyGroupChatTabProps {
  selectedGroup: StudyGroup;
  userId: string;
  isMember: boolean;
  messagingService: MessagingService;
  studyGroupManager: StudyGroupManager;
  onConversationLinked: (conversationId: string) => void;
}

export const StudyGroupChatTab: React.FC<StudyGroupChatTabProps> = ({
  selectedGroup,
  userId,
  isMember,
  messagingService,
  studyGroupManager,
  onConversationLinked,
}) => {
  const [ensuring, setEnsuring] = useState(false);

  const ensureConversation = async () => {
    setEnsuring(true);
    try {
      let conversationId = selectedGroup.conversation_id;
      if (!conversationId) {
        conversationId = await messagingService.createGroupConversation(
          `${selectedGroup.name} chat`,
          userId,
          selectedGroup.description ?? undefined,
          selectedGroup.id,
        );
        onConversationLinked(conversationId);
      }
      toast.success("Group chat is ready");
      toast.success("Group chat is ready");
    } catch (e) {
      console.error(e);
      toast.error("Could not start group chat");
    } finally {
      setEnsuring(false);
    }
  };

  if (selectedGroup.conversation_id) {
    return (
      <StudyGroupRealtimeChat
        className="min-h-[320px]"
        conversationId={selectedGroup.conversation_id}
        groupName={selectedGroup.name}
        isMember={isMember}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <ChatCircle className="h-10 w-10 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">
        Start a shared chat for this group. Messages are saved so you can catch
        up later.
      </p>
      {isMember ? (
        <Button
          type="button"
          onClick={() => void ensureConversation()}
          disabled={ensuring}
        >
          {ensuring ? "Starting…" : "Start group chat"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Join this group to use chat.
        </p>
      )}
    </div>
  );
};
