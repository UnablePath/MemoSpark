"use client";

import { studyGroupKeys } from "@/hooks/useStudyGroupQueries";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/client";
import { StudentDiscovery } from "@/lib/social/StudentDiscovery";
import { StudyGroupManager } from "@/lib/social/StudyGroupManager";
import { useAuth } from "@clerk/nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export const connectionHubKeys = {
  root: ["connectionHub"] as const,
  connections: (userId: string) =>
    [...connectionHubKeys.root, "connections", userId] as const,
  incoming: (userId: string) =>
    [...connectionHubKeys.root, "incoming", userId] as const,
  outgoing: (userId: string) =>
    [...connectionHubKeys.root, "outgoing", userId] as const,
};

export function usePrefetchConnectionHub(userId: string | null | undefined) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const studentDiscovery = useMemo(
    () => (userId ? new StudentDiscovery(getToken) : null),
    [getToken, userId],
  );
  const studyGroupManager = useMemo(
    () => (userId ? new StudyGroupManager(getToken) : null),
    [getToken, userId],
  );

  useEffect(() => {
    if (!userId || !studentDiscovery || !studyGroupManager) return;
    void qc.prefetchQuery({
      queryKey: connectionHubKeys.connections(userId),
      queryFn: () =>
        studentDiscovery.getConnections(userId, { limit: 50, offset: 0 }),
    });
    void qc.prefetchQuery({
      queryKey: connectionHubKeys.incoming(userId),
      queryFn: () =>
        studentDiscovery.getIncomingConnectionRequests(userId, {
          limit: 50,
          offset: 0,
        }),
    });
    void qc.prefetchQuery({
      queryKey: connectionHubKeys.outgoing(userId),
      queryFn: () =>
        studentDiscovery.getOutgoingConnectionRequests(userId, {
          limit: 50,
          offset: 0,
        }),
    });
    void qc.prefetchQuery({
      queryKey: studyGroupKeys.userGroups(userId),
      queryFn: () => studyGroupManager.getUserGroups(userId),
    });
  }, [qc, studentDiscovery, studyGroupManager, userId]);
}

export function useConnectionHubConnections(
  userId: string | undefined,
  studentDiscovery: StudentDiscovery | null,
) {
  return useQuery({
    queryKey: userId
      ? connectionHubKeys.connections(userId)
      : connectionHubKeys.connections(""),
    queryFn: async () => {
      if (!userId || !studentDiscovery) return [];
      return studentDiscovery.getConnections(userId, { limit: 50, offset: 0 });
    },
    enabled: Boolean(userId && studentDiscovery),
  });
}

export function useConnectionHubIncoming(
  userId: string | undefined,
  studentDiscovery: StudentDiscovery | null,
) {
  return useQuery({
    queryKey: userId
      ? connectionHubKeys.incoming(userId)
      : connectionHubKeys.incoming(""),
    queryFn: async () => {
      if (!userId || !studentDiscovery) return [];
      return studentDiscovery.getIncomingConnectionRequests(userId, {
        limit: 50,
        offset: 0,
      });
    },
    enabled: Boolean(userId && studentDiscovery),
  });
}

export function useConnectionHubOutgoing(
  userId: string | undefined,
  studentDiscovery: StudentDiscovery | null,
) {
  return useQuery({
    queryKey: userId
      ? connectionHubKeys.outgoing(userId)
      : connectionHubKeys.outgoing(""),
    queryFn: async () => {
      if (!userId || !studentDiscovery) return [];
      return studentDiscovery.getOutgoingConnectionRequests(userId, {
        limit: 50,
        offset: 0,
      });
    },
    enabled: Boolean(userId && studentDiscovery),
  });
}

/**
 * Subscribes to Supabase Realtime for the connections table so the UI
 * updates immediately when a request is sent, accepted, or declined —
 * without requiring a manual page refresh.
 *
 * Invalidates connection query keys on INSERT, UPDATE, and DELETE.
 */
export function useConnectionsRealtime(userId: string | null | undefined) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel | null = null;
    let client: ReturnType<typeof createAuthenticatedSupabaseClient> = null;

    try {
      client = createAuthenticatedSupabaseClient(getToken);
      if (!client) return;

      // Single channel covering both directions (requester & receiver) because
      // Supabase Realtime `filter` only supports one condition per channel.
      // RLS enforces row-level visibility server-side.
      channel = client
        .channel(`connections-realtime:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "connections",
            filter: `receiver_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.incoming(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "connections",
            filter: `requester_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.outgoing(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "connections",
            filter: `requester_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.connections(userId) });
            void qc.invalidateQueries({ queryKey: connectionHubKeys.outgoing(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "connections",
            filter: `receiver_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.incoming(userId) });
            void qc.invalidateQueries({ queryKey: connectionHubKeys.connections(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "connections",
            filter: `requester_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.connections(userId) });
            void qc.invalidateQueries({ queryKey: connectionHubKeys.outgoing(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "connections",
            filter: `receiver_id=eq.${userId}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: connectionHubKeys.connections(userId) });
            void qc.invalidateQueries({ queryKey: connectionHubKeys.incoming(userId) });
            void qc.invalidateQueries({ queryKey: ["social-activity"] });
          },
        )
        .subscribe();
    } catch (err) {
      console.error("[social:realtime] Failed to subscribe to connections:", err);
    }

    return () => {
      if (channel && client) {
        void client.removeChannel(channel);
      }
    };
  }, [userId, getToken, qc]);
}
