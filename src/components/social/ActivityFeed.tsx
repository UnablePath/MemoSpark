"use client";

import { cn } from "@/lib/utils";
import {
  useRefreshSocialActivity,
  useSocialActivityFeed,
} from "@/hooks/useSocialActivityFeed";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowsClockwise, Waveform } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type React from "react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function lineForEvent(row: {
  verb: string;
  actor_display_name: string | null;
  group_display_name: string | null;
  metadata: Record<string, unknown> | null;
}): string {
  const who = row.actor_display_name || "Someone";
  const g =
    row.group_display_name ||
    (typeof row.metadata?.group_name === "string" ? row.metadata.group_name : null);
  const title =
    typeof row.metadata?.title === "string" ? row.metadata.title : null;

  switch (row.verb) {
    case "connection_requested":
      return `${who} sent a connection request`;
    case "connection_accepted":
    case "connection_formed":
      return `${who} made a new connection`;
    case "joined_group":
      return g ? `${who} joined ${g}` : `${who} joined a study group`;
    case "session_started":
      return g && title
        ? `${who} started a session in ${g}: “${title}”`
        : `${who} started a study session`;
    case "resource_added":
      return g && title
        ? `${who} added a resource in ${g}: “${title}”`
        : `${who} shared a resource in a group`;
    default:
      return `${who} posted an update`;
  }
}

/**
 * Social activity feed — shows events from the current student's connections
 * and connection events involving them.  Display names are backfilled every
 * 2 minutes via pg_cron; manual refresh also triggers the maintenance RPC.
 */
export const ActivityFeed: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { data, isLoading, isError, error, isFetching } = useSocialActivityFeed({
    scope: "all",
  });
  const runRefresh = useRefreshSocialActivity();
  const [busy, setBusy] = useState(false);

  const onRefresh = useCallback(async () => {
    setBusy(true);
    try {
      await runRefresh("all");
    } finally {
      setBusy(false);
    }
  }, [runRefresh]);

  const events = data?.events ?? [];
  const empty = !isLoading && events.length === 0;

  return (
    <section
      className={cn(
        "relative border border-border/70 bg-card/60",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
      )}
      aria-labelledby="activity-feed-heading"
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground sm:px-4">
        <span aria-hidden>[</span>
        <Waveform className="h-3 w-3" weight="bold" />
        <span id="activity-feed-heading">FEED</span>
        <span aria-hidden>/</span>
        <span className="text-primary">LIVE</span>
        <span aria-hidden>]</span>
        <span
          aria-hidden
          className="ml-auto flex-1 border-t border-dashed border-border/50"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md"
          onClick={() => {
            if (!busy) void onRefresh();
          }}
          disabled={isFetching || busy}
          title="Refresh feed now"
          aria-label="Refresh activity feed"
        >
          <ArrowsClockwise
            className={cn("h-3.5 w-3.5", (isFetching || busy) && "animate-spin")}
          />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[auto_1fr]">
        <div className="hidden border-r border-border/40 p-4 sm:block">
          <div className="flex h-full flex-col justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={`scan-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: decorative
                  i
                }`}
                aria-hidden
                className="block h-px w-6 bg-border/70"
              />
            ))}
          </div>
        </div>

        <div className="min-h-[8rem] px-3 py-4 sm:px-4">
          {isLoading && (
            <div className="space-y-2" aria-busy="true" aria-live="polite">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-destructive" role="alert">
              {error instanceof Error ? error.message : "Could not load feed."}
            </p>
          )}

          {empty && !isError && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground/80">
                  &lt; NO RECENT ACTIVITY /&gt;
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing from your connections yet. Connect with a classmate
                  and their activity will show up here.
                </p>
              </div>
              <motion.span
                aria-hidden
                className="h-4 w-2 self-center bg-primary"
                animate={reduceMotion ? undefined : { opacity: [1, 0.1, 1] }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 1.1, repeat: Number.POSITIVE_INFINITY }
                }
              />
            </div>
          )}

          {events.length > 0 && (
            <ul className="space-y-3" aria-live="polite">
              {events.map((e) => {
                const t = parseISO(e.created_at);
                const when = Number.isNaN(t.getTime())
                  ? ""
                  : formatDistanceToNow(t, { addSuffix: true });
                return (
                  <li
                    key={e.id}
                    className="border-b border-border/40 pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm text-foreground">
                      {lineForEvent({
                        ...e,
                        metadata: (e.metadata || {}) as Record<string, unknown>,
                      })}
                    </p>
                    {when && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{when}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
