'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import { taskKeys } from '@/hooks/useTaskQueries';

/**
 * Subscribe to Supabase Realtime for the authenticated user's tasks (+ reminders).
 * Any insert/update/delete event invalidates React Query caches so a second
 * device or server-side mutation is reflected within seconds.
 *
 * Mount this ONCE near the top of the task hub; remounting it elsewhere creates
 * duplicate channels.
 */
export function useRealtimeTasks(): void {
  const { userId, getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const wrappedTokenFn = useMemo(
    () => wrapClerkTokenForSupabase(getToken),
    [getToken],
  );
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const client = createAuthenticatedSupabaseClient(wrappedTokenFn);
        if (!client) return;

        const invalidateAll = () => {
          queryClient.invalidateQueries({ queryKey: taskKeys.all });
        };

        const tasksChannel = client
          .channel(`tasks:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: `clerk_user_id=eq.${userId}`,
            },
            invalidateAll,
          )
          .subscribe();

        const remindersChannel = client
          .channel(`reminders:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'reminders',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ['reminders'] });
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            },
          )
          .subscribe();

        if (cancelled) {
          client.removeChannel(tasksChannel);
          client.removeChannel(remindersChannel);
          return;
        }

        cleanup = () => {
          client.removeChannel(tasksChannel);
          client.removeChannel(remindersChannel);
        };
      } catch (error) {
        console.warn('[tasks:realtime] failed to subscribe', error);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cleanup?.();
    };
  }, [isLoaded, isSignedIn, userId, wrappedTokenFn, queryClient]);
}
