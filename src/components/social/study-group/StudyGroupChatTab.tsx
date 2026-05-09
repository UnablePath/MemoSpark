"use client";

import { StudyGroupRealtimeChat } from "@/components/social/chat/StudyGroupRealtimeChat";
import { Button } from "@/components/ui/button";
import type { MessagingService } from "@/lib/messaging/MessagingService";
import type { StudyGroup } from "@/lib/social/StudyGroupManager";
import type { StudyGroupManager } from "@/lib/social/StudyGroupManager";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/client";
import { wrapClerkTokenForSupabase } from "@/lib/clerk/clerkSupabaseToken";
import { ChatCircle, ClockCounterClockwise, ToggleLeft, ToggleRight } from "@phosphor-icons/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

interface StudyGroupChatTabProps {
  selectedGroup: StudyGroup;
  userId: string;
  isMember: boolean;
  isAdmin: boolean;
  messagingService: MessagingService;
  studyGroupManager: StudyGroupManager;
  onConversationLinked: (conversationId: string) => void;
}

interface ChatSettings {
  historyVisibleToNewMembers: boolean;
  /** ISO timestamp of when the current user joined this conversation (for history gating). */
  currentUserJoinedAt: string | null;
}

export const StudyGroupChatTab: React.FC<StudyGroupChatTabProps> = ({
  selectedGroup,
  userId,
  isMember,
  isAdmin,
  messagingService,
  studyGroupManager,
  onConversationLinked,
}) => {
  const { getToken } = useAuth();
  const [ensuring, setEnsuring] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    historyVisibleToNewMembers: true,
    currentUserJoinedAt: null,
  });
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch conversation settings + participant join date when conversation exists.
  useEffect(() => {
    const conversationId = selectedGroup.conversation_id;
    if (!conversationId || !isMember) return;

    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const jwt = await wrapClerkTokenForSupabase(getToken)();
        if (!jwt || cancelled) return;

        const client = createAuthenticatedSupabaseClient(() => Promise.resolve(jwt));
        if (!client) return;

        const [{ data: convData }, { data: participantData }] = await Promise.all([
          client
            .from("conversations")
            .select("history_visible_to_new_members")
            .eq("id", conversationId)
            .single(),
          client
            .from("conversation_participants")
            .select("joined_at")
            .eq("conversation_id", conversationId)
            .eq("user_id", userId)
            .single(),
        ]);

        if (cancelled || !isMountedRef.current) return;

        setSettings({
          historyVisibleToNewMembers:
            (convData as { history_visible_to_new_members?: boolean } | null)
              ?.history_visible_to_new_members ?? true,
          currentUserJoinedAt:
            (participantData as { joined_at?: string } | null)?.joined_at ??
            null,
        });
      } catch (err) {
        console.error("[social:chat] Failed to fetch chat settings:", err);
      }
    };

    void fetchSettings();
    return () => { cancelled = true; };
  }, [selectedGroup.conversation_id, isMember, userId, getToken]);

  const toggleHistoryVisibility = useCallback(async () => {
    const conversationId = selectedGroup.conversation_id;
    if (!conversationId || !isAdmin) return;

    const next = !settings.historyVisibleToNewMembers;
    setUpdatingVisibility(true);

    try {
      const jwt = await wrapClerkTokenForSupabase(getToken)();
      if (!jwt) throw new Error("No auth token");

      const client = createAuthenticatedSupabaseClient(() => Promise.resolve(jwt));
      if (!client) throw new Error("No Supabase client");

      const { error } = await client
        .from("conversations")
        .update({ history_visible_to_new_members: next })
        .eq("id", conversationId);

      if (error) throw error;

      setSettings((s) => ({ ...s, historyVisibleToNewMembers: next }));
      toast.success(
        next
          ? "New members can now see full chat history."
          : "New members will only see messages from when they joined.",
      );
    } catch (err) {
      console.error("[social:chat] Failed to update history visibility:", err);
      toast.error("Couldn't update chat settings. Try again.");
    } finally {
      setUpdatingVisibility(false);
    }
  }, [selectedGroup.conversation_id, isAdmin, settings.historyVisibleToNewMembers, getToken]);

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
    } catch (e) {
      console.error("[social:chat]", e);
      toast.error("Couldn't start group chat. Try again.");
    } finally {
      setEnsuring(false);
    }
  };

  if (!selectedGroup.conversation_id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
          <ChatCircle weight="duotone" className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <p className="max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
          Start a shared chat for this group. Messages stay here so everyone can
          catch up later.
        </p>
        {isMember ? (
          <Button
            type="button"
            onClick={() => void ensureConversation()}
            disabled={ensuring}
            variant="default"
            className="h-10 rounded-xl px-5"
          >
            {ensuring ? "Starting…" : "Start group chat"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Join this group to open chat.
          </p>
        )}
      </div>
    );
  }

  /**
   * Determine if history should be gated for this user:
   * - Admins always see full history.
   * - When history_visible_to_new_members=false, non-admins see only messages
   *   from their conversation_participants.joined_at onward.
   */
  const historyNotBefore =
    !isAdmin &&
    !settings.historyVisibleToNewMembers &&
    settings.currentUserJoinedAt
      ? settings.currentUserJoinedAt
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Admin: history visibility toggle */}
      {isAdmin && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <ClockCounterClockwise
              weight="duotone"
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate text-xs text-muted-foreground">
              New members see full history
            </span>
          </div>
          <button
            type="button"
            onClick={() => void toggleHistoryVisibility()}
            disabled={updatingVisibility}
            aria-label={
              settings.historyVisibleToNewMembers
                ? "Disable history for new members"
                : "Enable history for new members"
            }
            aria-pressed={settings.historyVisibleToNewMembers}
            className="shrink-0 transition-opacity disabled:opacity-40"
            style={{ color: "#1a9e6e" }}
            title={
              settings.historyVisibleToNewMembers
                ? "Click to hide history from new members"
                : "Click to show full history to new members"
            }
          >
            {settings.historyVisibleToNewMembers ? (
              <ToggleRight weight="fill" className="h-6 w-6" />
            ) : (
              <ToggleLeft
                weight="fill"
                className="h-6 w-6 text-muted-foreground"
              />
            )}
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <StudyGroupRealtimeChat
          conversationId={selectedGroup.conversation_id}
          groupName={selectedGroup.name}
          isMember={isMember}
          historyNotBefore={historyNotBefore}
        />
      </div>
    </div>
  );
};
