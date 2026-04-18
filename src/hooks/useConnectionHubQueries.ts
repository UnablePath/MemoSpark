"use client";

import { studyGroupKeys } from "@/hooks/useStudyGroupQueries";
import { StudentDiscovery } from "@/lib/social/StudentDiscovery";
import { StudyGroupManager } from "@/lib/social/StudyGroupManager";
import { useAuth } from "@clerk/nextjs";
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
