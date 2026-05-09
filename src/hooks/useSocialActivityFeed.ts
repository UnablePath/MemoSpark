"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/types/database";

export interface SocialActivityEventRow {
  id: string;
  actor_id: string;
  verb: string;
  object_type: string;
  object_id: string | null;
  group_id: string | null;
  metadata: Json;
  actor_display_name: string | null;
  group_display_name: string | null;
  created_at: string;
}

export interface SocialActivityResponse {
  events: SocialActivityEventRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchSocialActivityFeed(
  getToken: () => Promise<string | null>,
  opts: {
    scope?: "all" | "connections" | "groups";
    refresh?: boolean;
  } = {},
): Promise<SocialActivityResponse> {
  const t = await getToken();
  if (!t) {
    return { events: [], nextCursor: null, hasMore: false };
  }
  const sp = new URLSearchParams();
  sp.set("scope", opts.scope ?? "all");
  sp.set("limit", "30");
  if (opts.refresh) sp.set("refresh", "1");

  const res = await fetch(`/api/social/activity?${sp.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load activity feed");
  }
  return res.json() as Promise<SocialActivityResponse>;
}

export function useSocialActivityFeed(options?: { scope?: "all" | "connections" | "groups" }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const scope = options?.scope ?? "all";

  return useQuery({
    queryKey: ["social-activity", scope],
    enabled: isLoaded && isSignedIn,
    queryFn: () => fetchSocialActivityFeed(getToken, { scope, refresh: false }),
    staleTime: 60_000,
  });
}

export function useRefreshSocialActivity() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return async (scope: "all" | "connections" | "groups" = "all") => {
    const data = await fetchSocialActivityFeed(getToken, { scope, refresh: true });
    queryClient.setQueryData(["social-activity", scope], data);
    return data;
  };
}
