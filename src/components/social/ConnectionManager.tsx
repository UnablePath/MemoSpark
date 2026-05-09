"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DirectMessageChat } from "@/components/social/chat/DirectMessageChat";
import {
  connectionHubKeys,
  useConnectionHubConnections,
  useConnectionHubIncoming,
  useConnectionHubOutgoing,
  useConnectionsRealtime,
} from "@/hooks/useConnectionHubQueries";
import { MessagingService } from "@/lib/messaging/MessagingService";
import {
  connectionAvatarHue,
  connectionDisplayInitials,
} from "@/lib/social/connectionDisplay";
import {
  createMemoSparkReportMailtoHref,
  openMemoSparkSupportMailHref,
} from "@/lib/support/memosparkSupportEmail";
import {
  StudentDiscovery,
  type UserSearchResult,
} from "@/lib/social/StudentDiscovery";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Chat as ChatIcon,
  Check,
  DotsThreeVertical,
  Flag,
  Prohibit,
  UserMinus,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import type React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface ConnectionManagerProps {
  searchTerm: string;
}

/* ─────────────── helpers ─────────────── */

/** Stable deterministic "unit id" derived from a clerk id, for CRT metadata flavor. */
function unitId(id: string | null | undefined): string {
  if (!id) return "UNIT / ----";
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `UNIT / ${tail || "0000"}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "--";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "--";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "JUST NOW";
  if (m < 60) return `T-${m}M`;
  const h = Math.floor(m / 60);
  if (h < 24) return `T-${h}H`;
  const d = Math.floor(h / 24);
  return `T-${d}D`;
}

/* ─────────────── atoms ─────────────── */

const SectionHead: React.FC<{
  label: string;
  count: number;
  accent?: "default" | "alert";
}> = ({ label, count, accent = "default" }) => {
  const padded = String(count).padStart(4, "0");
  return (
    <div
      className={cn(
        "flex items-center gap-2 pb-2 text-[0.68rem] font-semibold uppercase",
        "tracking-[0.2em] text-foreground/80",
        "font-mono",
      )}
    >
      <span aria-hidden className="text-muted-foreground">
        [
      </span>
      <span className="text-foreground">{label}</span>
      <span aria-hidden className="text-muted-foreground">
        /
      </span>
      <span
        className={cn(
          "tabular-nums",
          accent === "alert"
            ? "text-[hsl(var(--destructive))]"
            : "text-primary",
        )}
      >
        {padded}
      </span>
      <span aria-hidden className="text-muted-foreground">
        ]
      </span>
      <span aria-hidden className="ml-1 flex-1 border-t border-dashed border-border/70" />
    </div>
  );
};

const Chrome: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <section
    className={cn(
      "relative border border-border/70 bg-card/60",
      "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
      className,
    )}
  >
    {children}
  </section>
);

/** A single telemetry row. Uses content-visibility for cheap virtualization. */
const TelemetryRow: React.FC<{
  avatarUrl?: string | null;
  fallback: string;
  name: string;
  unit: string;
  meta: string;
  /** Stable id for avatar color (e.g. Clerk user id). */
  hueKey?: string | null;
  statusDot?: "online" | "idle" | "alert" | null;
  children?: React.ReactNode;
}> = ({ avatarUrl, fallback, name, unit, meta, hueKey, statusDot, children }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4",
        "border-t border-border/50 first:border-t-0",
        "transition-colors duration-150",
        "hover:bg-muted/30 focus-within:bg-muted/30",
      )}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "72px",
      }}
    >
      <div className="relative">
        <Avatar className="h-11 w-11 rounded-none ring-1 ring-border/70">
          <AvatarImage src={avatarUrl || ""} className="rounded-none" />
          <AvatarFallback
            className="rounded-none font-mono text-xs font-semibold uppercase text-white"
            style={{
              backgroundColor: `hsl(${connectionAvatarHue(hueKey ?? `${name}:${unit}`)} 36% 36%)`,
            }}
          >
            {fallback}
          </AvatarFallback>
        </Avatar>
        {statusDot ? (
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2 w-2 ring-2 ring-background",
              statusDot === "online" && "bg-primary",
              statusDot === "idle" && "bg-muted-foreground",
              statusDot === "alert" && "bg-[hsl(var(--destructive))]",
            )}
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
          {unit}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          {meta}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
};

/** Sharp utilitarian icon button, 44px min touch target. */
const SquareBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "default" | "accept" | "danger" | "ghost";
  }
> = ({ tone = "default", className, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={cn(
      "inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 px-2.5",
      "border font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
      "transition-[background,color,border-color] duration-150",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      tone === "default" &&
        "border-border/70 bg-background/40 text-foreground/80 hover:border-foreground/50 hover:text-foreground",
      tone === "accept" &&
        "border-primary/70 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20",
      tone === "danger" &&
        "border-[hsl(var(--destructive)/0.6)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.14)]",
      tone === "ghost" &&
        "border-transparent text-muted-foreground hover:border-border/70 hover:text-foreground",
      className,
    )}
  >
    {children}
  </button>
);

/** No-signal placeholder when a bucket is empty. */
const NoSignal: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-4 py-8 text-center">
    <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
      &lt; {label} /&gt;
    </p>
  </div>
);

/* ─────────────── main ─────────────── */

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  searchTerm,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  const studentDiscovery = useMemo(
    () => new StudentDiscovery(getToken),
    [getToken],
  );
  const messagingService = useMemo(
    () => new MessagingService(getToken),
    [getToken],
  );

  const connectionsQuery = useConnectionHubConnections(user?.id, studentDiscovery);
  const incomingQuery = useConnectionHubIncoming(user?.id, studentDiscovery);
  const outgoingQuery = useConnectionHubOutgoing(user?.id, studentDiscovery);

  // Live updates — no refresh needed when a request arrives or is accepted
  useConnectionsRealtime(user?.id);
  const connections = connectionsQuery.data ?? [];
  const incomingRequests = incomingQuery.data ?? [];
  const outgoingRequests = outgoingQuery.data ?? [];

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [chatUser, setChatUser] = useState<{
    full_name?: string;
    clerk_user_id: string;
    avatar_url?: string | null;
  } | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(
    null,
  );
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const [reportBody, setReportBody] = useState("");

  const handleSearch = useCallback(async () => {
    if (!user || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await studentDiscovery.searchUsers(searchTerm, user.id);
      setSearchResults(results);
    } catch (err) {
      console.error("[social:search]", err);
      toast.error("Search failed. Check your connection and try again.");
    }
  }, [studentDiscovery, searchTerm, user]);

  useEffect(() => {
    const id = setTimeout(() => {
      void handleSearch();
    }, 300);
    return () => clearTimeout(id);
  }, [handleSearch]);

  const handleSendRequest = async (receiverId: string) => {
    if (!user || loadingRequestId === receiverId) return;
    setLoadingRequestId(receiverId);
    try {
      const status = await studentDiscovery.sendConnectionRequest(
        user.id,
        receiverId,
      );
      if (status === "accepted") {
        toast.success("Match locked. Channel open.");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: connectionHubKeys.connections(user.id),
          }),
          queryClient.invalidateQueries({
            queryKey: connectionHubKeys.incoming(user.id),
          }),
          queryClient.invalidateQueries({
            queryKey: connectionHubKeys.outgoing(user.id),
          }),
        ]);
      } else {
        setSentRequests((prev) => [...prev, receiverId]);
        toast.success("Request dispatched");
        try {
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: receiverId,
              notification: {
                app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
                headings: { en: "New connection request" },
                contents: {
                  en: `${user.firstName ?? "Someone"} wants to connect with you`,
                },
                data: { type: "connection_request" },
              },
            }),
          });
        } catch {}
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: connectionHubKeys.outgoing(user.id),
          }),
          queryClient.invalidateQueries({
            queryKey: connectionHubKeys.incoming(user.id),
          }),
        ]);
      }
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast.error("Dispatch failed");
    } finally {
      setLoadingRequestId(null);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    try {
      await studentDiscovery.acceptConnectionRequest(requesterId, user.id);
      toast.success("Connection accepted.");
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: requesterId,
            notification: {
              app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
              headings: { en: "Request accepted" },
              contents: {
                en: `${user.firstName ?? "Your connection"} accepted your request`,
              },
              data: { type: "connection_accept" },
            },
          }),
        });
      } catch {}
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.connections(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.outgoing(user.id),
        }),
      ]);
    } catch (err) {
      console.error("[social:acceptRequest]", err);
      toast.error("Couldn't accept the request. Check your connection and try again.");
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!user) return;
    try {
      await studentDiscovery.rejectConnectionRequest(requesterId, user.id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.outgoing(user.id),
        }),
      ]);
    } catch (err) {
      console.error("[social:rejectRequest]", err);
      toast.error("Couldn't decline the request. Check your connection and try again.");
    }
  };

  const handleCancelOutgoing = async (receiverId: string) => {
    if (!user) return;
    setActionLoadingId(receiverId);
    try {
      const ok = await studentDiscovery.cancelConnectionRequest(
        user.id,
        receiverId,
      );
      if (ok) toast.success("Request aborted");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.outgoing(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
      ]);
    } catch {
      toast.error("Abort failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnfriend = async (otherId: string) => {
    if (!user) return;
    const shouldUnfriend = window.confirm(
      "Unfriend this student? Your direct chat history will stay available, but they will leave your active connections.",
    );
    if (!shouldUnfriend) return;
    setActionLoadingId(otherId);
    try {
      const ok = await studentDiscovery.removeConnection(user.id, otherId);
      if (ok) toast.success("Connection removed. Chat history is preserved.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.connections(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.outgoing(user.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["social-activity"] }),
      ]);
    } catch (err) {
      console.error("[social:unfriend]", err);
      toast.error("Couldn't remove this connection. Try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlock = async (otherId: string) => {
    if (!user) return;
    const shouldBlock = window.confirm(
      "Block this student? This removes them from your connections and prevents future connection requests where blocking is enforced.",
    );
    if (!shouldBlock) return;
    setActionLoadingId(otherId);
    try {
      await studentDiscovery.blockUser(user.id, otherId);
      toast.success("Student blocked.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.connections(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.outgoing(user.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["social-activity"] }),
      ]);
    } catch (err) {
      console.error("[social:block]", err);
      toast.error("Couldn't block this student. Try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReportStudent = () => {
    if (!reportTarget?.id || !reportBody.trim()) return;
    try {
      const href = createMemoSparkReportMailtoHref({
        subjectDetail: `Student · ${reportTarget.name ?? reportTarget.id}`,
        studentWrittenReport: reportBody.trim(),
        contextLines: [
          "Report type: Student safety (connections)",
          `Reported Clerk user ID: ${reportTarget.id}`,
          ...(reportTarget.name
            ? [`Display name as shown in MemoSpark: ${reportTarget.name}`]
            : []),
        ],
        pageUrl:
          typeof window !== "undefined" ? window.location.href : undefined,
      });
      openMemoSparkSupportMailHref(href);
      toast.success("Opening your email app…", {
        description:
          "Send the message when it looks right. We review every report.",
      });
      setReportTarget(null);
      setReportBody("");
    } catch (err) {
      console.error("[social:reportStudent]", err);
      toast.error(
        "Could not open email for this report. Mail support@memospark.live manually.",
      );
    }
  };

  const openReportStudent = (otherId: string, displayName?: string | null) => {
    setReportTarget({ id: otherId, name: displayName ?? null });
    setReportBody("");
  };

  const getConnectionProfile = (connection: {
    requester_id: string;
    requester?: {
      clerk_user_id: string;
      full_name?: string | null;
      avatar_url?: string | null;
      year_of_study?: string | null;
    } | null;
    receiver?: {
      clerk_user_id: string;
      full_name?: string | null;
      avatar_url?: string | null;
      year_of_study?: string | null;
    } | null;
  }) =>
    connection.requester_id === user?.id
      ? connection.receiver
      : connection.requester;

  const startChat = async (otherUser: {
    clerk_user_id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  }) => {
    if (!user?.id) return;
    try {
      const conversationId =
        await messagingService.getOrCreateDirectConversation(
          user.id,
          otherUser.clerk_user_id,
        );
      setChatConversationId(conversationId);
      setChatUser({
        clerk_user_id: otherUser.clerk_user_id,
        full_name: otherUser.full_name ?? undefined,
        avatar_url: otherUser.avatar_url ?? undefined,
      });
      setChatSheetOpen(true);
    } catch (err) {
      console.error("[social:startChat]", err);
      toast.error("Couldn't open the chat. Check your connection and try again.");
    }
  };

  const rowMotion = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: -4, filter: "blur(2px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: 4, filter: "blur(2px)" },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="relative space-y-4 font-sans">
      {/* SEARCH RESULTS */}
      <AnimatePresence initial={false}>
        {searchResults.length > 0 ? (
          <motion.div
            key="search"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Chrome>
              <div className="px-3 pt-3 sm:px-4">
                <SectionHead label="SEARCH" count={searchResults.length} />
              </div>
              <div className="divide-y divide-border/50">
                <AnimatePresence initial={false}>
                  {searchResults.map((result) => {
                    const alreadyConnected = connections.some(
                      (c) =>
                        c.requester?.clerk_user_id === result.clerk_user_id ||
                        c.receiver?.clerk_user_id === result.clerk_user_id,
                    );
                    const alreadyOutgoing = outgoingRequests.some(
                      (o) => o.receiver_id === result.clerk_user_id,
                    );
                    const disabled =
                      sentRequests.includes(result.clerk_user_id) ||
                      loadingRequestId === result.clerk_user_id ||
                      alreadyOutgoing ||
                      alreadyConnected;

                    return (
                      <motion.div key={result.clerk_user_id} {...rowMotion}>
                        <TelemetryRow
                          avatarUrl={result.avatar_url}
                          fallback={connectionDisplayInitials(
                            result.full_name,
                          )}
                          hueKey={result.clerk_user_id}
                          name={result.full_name ?? "Unknown"}
                          unit={unitId(result.clerk_user_id)}
                          meta={
                            result.year_of_study
                              ? result.year_of_study.toUpperCase()
                              : "COHORT / --"
                          }
                        >
                          <SquareBtn
                            tone={
                              disabled
                                ? "ghost"
                                : alreadyConnected
                                  ? "ghost"
                                  : "accept"
                            }
                            disabled={disabled}
                            onClick={() =>
                              handleSendRequest(result.clerk_user_id)
                            }
                            aria-label="Send connection request"
                          >
                            <UserPlus className="h-3.5 w-3.5" weight="bold" />
                            <span className="hidden sm:inline">
                              {loadingRequestId === result.clerk_user_id
                                ? "DISPATCH…"
                                : alreadyConnected
                                  ? "LINKED"
                                  : alreadyOutgoing ||
                                      sentRequests.includes(
                                        result.clerk_user_id,
                                      )
                                    ? "SENT"
                                    : "CONNECT"}
                            </span>
                          </SquareBtn>
                        </TelemetryRow>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Chrome>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* INBOX + DISPATCHED side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Chrome>
          <div className="px-3 pt-3 sm:px-4">
            <SectionHead
              label="INBOX"
              count={incomingRequests.length}
              accent={incomingRequests.length > 0 ? "alert" : "default"}
            />
          </div>
          <div className="divide-y divide-border/50">
            {incomingRequests.length > 0 ? (
              <AnimatePresence initial={false}>
                {incomingRequests
                  .filter((r) => r.requester)
                  .map((request) => (
                    <motion.div key={request.id} {...rowMotion}>
                      <TelemetryRow
                        avatarUrl={request.requester?.avatar_url}
                        fallback={connectionDisplayInitials(
                          request.requester?.full_name,
                        )}
                        hueKey={request.requester_id}
                        name={request.requester?.full_name ?? "Unknown"}
                        unit={unitId(request.requester_id)}
                        meta={`REQ ${formatRelative(request.created_at)}`}
                        statusDot="alert"
                      >
                        <SquareBtn
                          tone="danger"
                          aria-label="Dismiss request"
                          onClick={() => handleRejectRequest(request.requester_id)}
                        >
                          <X className="h-3.5 w-3.5" weight="bold" />
                        </SquareBtn>
                        <SquareBtn
                          tone="accept"
                          aria-label="Accept request"
                          onClick={() => handleAcceptRequest(request.requester_id)}
                        >
                          <Check className="h-3.5 w-3.5" weight="bold" />
                          <span className="hidden sm:inline">ACCEPT</span>
                        </SquareBtn>
                      </TelemetryRow>
                    </motion.div>
                  ))}
              </AnimatePresence>
            ) : (
              <NoSignal label="NO INBOUND SIGNAL" />
            )}
          </div>
        </Chrome>

        <Chrome>
          <div className="px-3 pt-3 sm:px-4">
            <SectionHead label="DISPATCHED" count={outgoingRequests.length} />
          </div>
          <div className="divide-y divide-border/50">
            {outgoingRequests.length > 0 ? (
              <AnimatePresence initial={false}>
                {outgoingRequests
                  .filter((r) => r.receiver)
                  .map((request) => (
                    <motion.div key={request.id} {...rowMotion}>
                      <TelemetryRow
                        avatarUrl={request.receiver?.avatar_url}
                        fallback={connectionDisplayInitials(
                          request.receiver?.full_name,
                        )}
                        hueKey={request.receiver_id}
                        name={request.receiver?.full_name ?? "Unknown"}
                        unit={unitId(request.receiver_id)}
                        meta={`SENT ${formatRelative(request.created_at)}`}
                        statusDot="idle"
                      >
                        <SquareBtn
                          tone="default"
                          disabled={actionLoadingId === request.receiver_id}
                          onClick={() =>
                            handleCancelOutgoing(request.receiver_id)
                          }
                        >
                          {actionLoadingId === request.receiver_id
                            ? "…"
                            : "ABORT"}
                        </SquareBtn>
                      </TelemetryRow>
                    </motion.div>
                  ))}
              </AnimatePresence>
            ) : (
              <NoSignal label="NO OUTBOUND SIGNAL" />
            )}
          </div>
        </Chrome>
      </div>

      {/* CONNECTED — bento grid + single chat surface */}
      <Chrome>
        <div className="px-3 pt-3 sm:px-4">
          <SectionHead label="CONNECTED" count={connections.length} />
        </div>
        <div className="p-3 sm:p-4">
          {connections.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence initial={false}>
                {connections.map((connection) => {
                  const profile = getConnectionProfile(connection);
                  if (!profile) return null;
                  const glyph = connectionDisplayInitials(profile.full_name);
                  const hue = connectionAvatarHue(profile.clerk_user_id);
                  return (
                    <motion.div
                      key={connection.id}
                      {...rowMotion}
                      className="h-full"
                    >
                      <div
                        className={cn(
                          "flex h-full flex-col gap-3 rounded-2xl border border-border/55 bg-card/85 p-4",
                          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-12 w-12 rounded-xl ring-1 ring-border/60">
                              <AvatarImage
                                src={profile.avatar_url || ""}
                                className="rounded-xl object-cover"
                                alt=""
                              />
                              <AvatarFallback
                                className="rounded-xl text-xs font-semibold uppercase text-white"
                                style={{
                                  backgroundColor: `hsl(${hue} 38% 38%)`,
                                }}
                              >
                                {glyph}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              aria-hidden
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                                "bg-primary",
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {profile.full_name ?? "Unknown"}
                            </p>
                            <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                              {unitId(profile.clerk_user_id)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">
                              {profile.year_of_study
                                ? profile.year_of_study.toUpperCase()
                                : "Open channel"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex min-h-[44px] items-center gap-2">
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 min-h-11 min-w-0 flex-1 gap-2 rounded-xl text-sm font-medium"
                            onClick={() => void startChat(profile)}
                            aria-label={`Open chat with ${profile.full_name}`}
                          >
                            <ChatIcon className="h-4 w-4" weight="bold" />
                            Chat
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 shrink-0 rounded-xl"
                                aria-label="More actions for this connection"
                              >
                                <DotsThreeVertical
                                  className="h-4 w-4"
                                  weight="bold"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[12rem] rounded-xl"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUnfriend(profile.clerk_user_id)
                                }
                              >
                                <UserMinus
                                  className="mr-2 h-4 w-4"
                                  weight="bold"
                                />
                                Unfriend
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleBlock(profile.clerk_user_id)}
                              >
                                <Prohibit
                                  className="mr-2 h-4 w-4"
                                  weight="bold"
                                />
                                Block
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openReportStudent(
                                    profile.clerk_user_id,
                                    profile.full_name,
                                  )
                                }
                              >
                                <Flag
                                  className="mr-2 h-4 w-4"
                                  weight="bold"
                                />
                                Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <NoSignal label="NO ACTIVE CHANNELS" />
          )}
        </div>
      </Chrome>

      <Dialog
        open={chatSheetOpen}
        onOpenChange={(open) => {
          setChatSheetOpen(open);
          if (!open) {
            setChatConversationId(null);
            setChatUser(null);
          }
        }}
      >
        <DialogContent
          className="flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(640px,85vh)] sm:max-h-[85vh] sm:rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 bg-background px-4 py-3 pr-14 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
              {chatUser?.full_name
                ? `Chat · ${chatUser.full_name}`
                : "Direct chat"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Messages stay in this thread with your connection.
            </DialogDescription>
          </DialogHeader>
          {chatConversationId && chatUser ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
              <DirectMessageChat
                conversationId={chatConversationId}
                className="min-h-0 flex-1 border-0 bg-transparent"
                recipientName={
                  chatUser.full_name ?? chatUser.clerk_user_id ?? "Connection"
                }
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Opening channel…
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(null);
            setReportBody("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Report a student</DialogTitle>
            <DialogDescription>
              Tell us what needs review for{" "}
              <span className="font-medium text-foreground">
                {reportTarget?.name ?? "this student"}
              </span>
              . Tap below to open your email app with a draft to MemoSpark support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="report-reason">What happened?</Label>
            <Textarea
              id="report-reason"
              value={reportBody}
              onChange={(e) => setReportBody(e.target.value)}
              placeholder="A few clear sentences help us act quickly."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setReportTarget(null);
                setReportBody("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!reportBody.trim()}
              onClick={handleReportStudent}
            >
              Email support
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
