"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import {
  connectionHubKeys,
  useConnectionHubConnections,
  useConnectionHubIncoming,
  useConnectionHubOutgoing,
} from "@/hooks/useConnectionHubQueries";
import { MessagingService } from "@/lib/messaging/MessagingService";
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
  statusDot?: "online" | "idle" | "alert" | null;
  children?: React.ReactNode;
}> = ({ avatarUrl, fallback, name, unit, meta, statusDot, children }) => {
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
          <AvatarFallback className="rounded-none bg-muted font-mono text-sm uppercase">
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

  const handleSearch = useCallback(async () => {
    if (!user || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await studentDiscovery.searchUsers(searchTerm, user.id);
    setSearchResults(results);
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
    await studentDiscovery.acceptConnectionRequest(requesterId, user.id);
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
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!user) return;
    await studentDiscovery.rejectConnectionRequest(requesterId, user.id);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: connectionHubKeys.incoming(user.id),
      }),
      queryClient.invalidateQueries({
        queryKey: connectionHubKeys.outgoing(user.id),
      }),
    ]);
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
    setActionLoadingId(otherId);
    try {
      const ok = await studentDiscovery.removeConnection(user.id, otherId);
      if (ok) toast.success("Channel closed");
      await queryClient.invalidateQueries({
        queryKey: connectionHubKeys.connections(user.id),
      });
    } catch {
      toast.error("Disconnect failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlock = async (otherId: string) => {
    if (!user) return;
    setActionLoadingId(otherId);
    try {
      await studentDiscovery.blockUser(user.id, otherId);
      toast.success("Signal blocked");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.connections(user.id),
        }),
        queryClient.invalidateQueries({
          queryKey: connectionHubKeys.incoming(user.id),
        }),
      ]);
    } catch {
      toast.error("Block failed");
    } finally {
      setActionLoadingId(null);
    }
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
    } catch (error) {
      console.error("Error starting chat:", error);
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
                          fallback={
                            result.full_name?.charAt(0)?.toUpperCase() ?? "?"
                          }
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
                        fallback={
                          request.requester?.full_name?.charAt(0) ?? "?"
                        }
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
                        fallback={request.receiver?.full_name?.charAt(0) ?? "?"}
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

      {/* CONNECTED */}
      <Chrome>
        <div className="px-3 pt-3 sm:px-4">
          <SectionHead label="CONNECTED" count={connections.length} />
        </div>
        <div className="divide-y divide-border/50">
          {connections.length > 0 ? (
            <AnimatePresence initial={false}>
              {connections.map((connection) => {
                const profile = getConnectionProfile(connection);
                if (!profile) return null;
                return (
                  <motion.div key={connection.id} {...rowMotion}>
                    <TelemetryRow
                      avatarUrl={profile.avatar_url}
                      fallback={profile.full_name?.charAt(0) ?? "?"}
                      name={profile.full_name ?? "Unknown"}
                      unit={unitId(profile.clerk_user_id)}
                      meta={
                        profile.year_of_study
                          ? profile.year_of_study.toUpperCase()
                          : "CHANNEL OPEN"
                      }
                      statusDot="online"
                    >
                      <Dialog>
                        <DialogTrigger asChild>
                          <SquareBtn
                            tone="default"
                            onClick={() => startChat(profile)}
                            aria-label={`Open chat with ${profile.full_name}`}
                          >
                            <ChatIcon className="h-3.5 w-3.5" weight="bold" />
                            <span className="hidden sm:inline">CHAT</span>
                          </SquareBtn>
                        </DialogTrigger>
                        <DialogContent className="flex h-[600px] max-w-2xl flex-col">
                          <DialogHeader>
                            <DialogTitle className="font-mono uppercase tracking-[0.12em]">
                              CH / {profile.full_name}
                            </DialogTitle>
                            <DialogDescription>
                              Direct channel with your connection
                            </DialogDescription>
                          </DialogHeader>
                          {chatConversationId && chatUser ? (
                            <div className="flex-1">
                              <ChatInterface
                                initialConversationId={chatConversationId}
                              />
                            </div>
                          ) : null}
                        </DialogContent>
                      </Dialog>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SquareBtn tone="ghost" aria-label="More actions">
                            <DotsThreeVertical
                              className="h-4 w-4"
                              weight="bold"
                            />
                          </SquareBtn>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono">
                          <DropdownMenuItem
                            onClick={() => handleUnfriend(profile.clerk_user_id)}
                            className="text-xs uppercase tracking-[0.12em]"
                          >
                            <UserMinus
                              className="mr-2 h-3.5 w-3.5"
                              weight="bold"
                            />
                            UNLINK
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs uppercase tracking-[0.12em] text-destructive"
                            onClick={() => handleBlock(profile.clerk_user_id)}
                          >
                            <Prohibit
                              className="mr-2 h-3.5 w-3.5"
                              weight="bold"
                            />
                            BLOCK
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TelemetryRow>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <NoSignal label="NO ACTIVE CHANNELS" />
          )}
        </div>
      </Chrome>
    </div>
  );
};
