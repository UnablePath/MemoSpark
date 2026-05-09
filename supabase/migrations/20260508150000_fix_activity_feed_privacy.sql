-- Activity feed privacy fix: scope events to connections only.
-- Previously, anyone sharing a study group could see ALL co-member events,
-- which was an over-broad "surveillance" feed.  The correct behaviour:
--   • You always see your own events.
--   • You see events from users you are *connected* to (status='accepted').
--   • You see connection events where you are the direct target
--     (someone requested you, someone accepted your request).
--
-- pg_cron job for display-name backfill is unchanged (already active).

-- ---------------------------------------------------------------------------
-- 1) Tighten social_activity_events SELECT policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS social_activity_events_select ON public.social_activity_events;

CREATE POLICY social_activity_events_select
  ON public.social_activity_events
  FOR SELECT
  USING (
    -- own events
    actor_id = public.get_clerk_user_id()

    -- events from accepted connections only
    OR EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.status = 'accepted'
        AND (
          (c.requester_id = public.get_clerk_user_id() AND c.receiver_id = social_activity_events.actor_id)
          OR (c.receiver_id = public.get_clerk_user_id() AND c.requester_id = social_activity_events.actor_id)
        )
    )

    -- connection events targeting the current user, scoped to connection verbs only
    -- so an arbitrary event storing a user id in metadata doesn't leak
    OR (
      verb IN ('connection_requested', 'connection_accepted', 'connection_formed')
      AND coalesce(metadata ->> 'related_user_id', '') = public.get_clerk_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Ensure connections table is in the realtime publication so clients
--    can subscribe to INSERT/UPDATE events without polling.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Add a pg_cron job to refresh connection-related display names
--    (covers the "accept then display name missing" gap)
-- ---------------------------------------------------------------------------
DO $cron$
DECLARE
  jid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove stale job if present
    SELECT j.jobid INTO jid
    FROM cron.job j
    WHERE j.jobname = 'memospark_social_activity_maintain'
    LIMIT 1;

    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;

    -- Re-schedule at every 2 minutes for faster display-name resolution
    PERFORM cron.schedule(
      'memospark_social_activity_maintain',
      '*/2 * * * *',
      'SELECT public.maintain_social_activity_feed()'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object OR invalid_schema_name THEN
    RAISE NOTICE 'pg_cron job skipped (extension not available)';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron reschedule failed: %', SQLERRM;
END
$cron$;
