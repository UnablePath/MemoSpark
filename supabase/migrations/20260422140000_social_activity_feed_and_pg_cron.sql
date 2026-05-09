-- Social activity stream with display names refreshed by pg_cron and manual refresh.
-- Event rows are written by triggers; RLS controls read access.

-- ---------------------------------------------------------------------------
-- 1) Core table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  verb text NOT NULL,
  object_type text NOT NULL DEFAULT 'unknown',
  object_id text,
  group_id uuid REFERENCES public.study_groups (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  actor_display_name text,
  group_display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_activity_created
  ON public.social_activity_events (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_activity_group
  ON public.social_activity_events (group_id)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_activity_actor
  ON public.social_activity_events (actor_id);

COMMENT ON TABLE public.social_activity_events IS 'High-signal social events; display names backfilled by maintain_social_activity_feed().';

-- ---------------------------------------------------------------------------
-- 2) RLS: readers see own actions, co-members for group events, or connection party
-- ---------------------------------------------------------------------------
ALTER TABLE public.social_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_activity_events_select ON public.social_activity_events;
CREATE POLICY social_activity_events_select ON public.social_activity_events
  FOR SELECT
  USING (
    actor_id = public.get_clerk_user_id()
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.study_group_members sgm
      WHERE sgm.group_id = social_activity_events.group_id
        AND sgm.user_id = public.get_clerk_user_id()
    ))
    OR (coalesce(metadata->> 'related_user_id', '') = public.get_clerk_user_id())
  );

-- No direct inserts from clients; triggers + maintenance use definer/owner

-- ---------------------------------------------------------------------------
-- 3) Trigger functions (write events)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_social_activity_from_connections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, metadata)
      VALUES (
        NEW.requester_id,
        'connection_requested',
        'user',
        NEW.receiver_id,
        jsonb_build_object('related_user_id', NEW.receiver_id, 'connection_id', NEW.id::text)
      );
    ELSIF NEW.status = 'accepted' THEN
      -- Single-row create (e.g. RPC auto-accept), one activity item for both parties
      INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, metadata)
      VALUES (
        NEW.requester_id,
        'connection_formed',
        'connection',
        NEW.id::text,
        jsonb_build_object(
          'related_user_id', NEW.receiver_id,
          'connection_id', NEW.id::text,
          'other_user_id', NEW.receiver_id
        )
      );
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND (OLD.status IS DISTINCT FROM NEW.status)
    AND NEW.status = 'accepted'
    AND OLD.status = 'pending' THEN
    INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, metadata)
    VALUES (
      NEW.receiver_id,
      'connection_accepted',
      'connection',
      NEW.id::text,
      jsonb_build_object('related_user_id', NEW.requester_id, 'connection_id', NEW.id::text)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_connections_social_activity ON public.connections;
CREATE TRIGGER trg_connections_social_activity
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_social_activity_from_connections();

-- study_group_members: join
CREATE OR REPLACE FUNCTION public.trg_social_activity_from_group_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  gname text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT sg.name INTO gname FROM public.study_groups sg WHERE sg.id = NEW.group_id;
    INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, group_id, metadata, group_display_name)
    VALUES (
      NEW.user_id,
      'joined_group',
      'study_group',
      NEW.group_id::text,
      NEW.group_id,
      jsonb_build_object('role', NEW.role, 'group_name', gname),
      gname
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sgm_social_activity ON public.study_group_members;
CREATE TRIGGER trg_sgm_social_activity
  AFTER INSERT ON public.study_group_members
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_social_activity_from_group_member();

-- study_sessions: new session
CREATE OR REPLACE FUNCTION public.trg_social_activity_from_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  gname text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT sg.name INTO gname FROM public.study_groups sg WHERE sg.id = NEW.group_id;
    INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, group_id, metadata, group_display_name)
    VALUES (
      NEW.created_by,
      'session_started',
      'study_session',
      NEW.id::text,
      NEW.group_id,
      jsonb_build_object('title', NEW.title, 'start_time', NEW.start_time, 'group_name', gname),
      gname
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_social_activity ON public.study_sessions;
CREATE TRIGGER trg_sessions_social_activity
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_social_activity_from_session();

-- study_group_resources: resource added
CREATE OR REPLACE FUNCTION public.trg_social_activity_from_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  gname text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT sg.name INTO gname FROM public.study_groups sg WHERE sg.id = NEW.group_id;
    INSERT INTO public.social_activity_events (actor_id, verb, object_type, object_id, group_id, metadata, group_display_name)
    VALUES (
      NEW.user_id,
      'resource_added',
      'study_group_resource',
      NEW.id::text,
      NEW.group_id,
      jsonb_build_object('title', NEW.title, 'resource_type', NEW.resource_type, 'group_name', gname),
      gname
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sgr_social_activity ON public.study_group_resources;
CREATE TRIGGER trg_sgr_social_activity
  AFTER INSERT ON public.study_group_resources
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_social_activity_from_resource();

-- ---------------------------------------------------------------------------
-- 4) Maintenance: backfill display names, ANALYZE (run by pg_cron + API refresh)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.maintain_social_activity_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.social_activity_events e
  SET actor_display_name = coalesce(
    p.full_name,
    split_part(p.email, '@', 1),
    left(e.actor_id, 8) || '...'
  )
  FROM public.profiles p
  WHERE p.clerk_user_id = e.actor_id
    AND (e.actor_display_name IS NULL OR e.actor_display_name = '');

  UPDATE public.social_activity_events e
  SET group_display_name = g.name
  FROM public.study_groups g
  WHERE e.group_id = g.id
    AND e.group_id IS NOT NULL
    AND (e.group_display_name IS NULL OR e.group_display_name = '');

  ANALYZE public.social_activity_events;
END;
$$;

COMMENT ON FUNCTION public.maintain_social_activity_feed() IS 'Refreshes display names. Scheduled every 5m via pg_cron and callable on demand.';

REVOKE ALL ON FUNCTION public.maintain_social_activity_feed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maintain_social_activity_feed() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_social_activity_feed() TO service_role;

-- ---------------------------------------------------------------------------
-- 5) pg_cron: refresh / maintain feed data for all users (cluster-wide)
-- ---------------------------------------------------------------------------
DO $cron$
DECLARE
  jid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT j.jobid INTO jid FROM cron.job j WHERE j.jobname = 'memospark_social_activity_maintain' LIMIT 1;
    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;
    PERFORM cron.schedule(
      'memospark_social_activity_maintain',
      '*/5 * * * *',
      'SELECT public.maintain_social_activity_feed()'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object OR invalid_schema_name THEN
    RAISE NOTICE 'pg_cron job skipped (cron extension or schema not available)';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule failed: %', SQLERRM;
END
$cron$;

-- ---------------------------------------------------------------------------
-- 6) Clerk-facing notification preferences (server actions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clerk_notification_preferences (
  clerk_user_id text PRIMARY KEY,
  categories jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clerk_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clerk_notif_self ON public.clerk_notification_preferences;
CREATE POLICY clerk_notif_self ON public.clerk_notification_preferences
  FOR ALL
  USING (clerk_user_id = public.get_clerk_user_id())
  WITH CHECK (clerk_user_id = public.get_clerk_user_id());

-- ---------------------------------------------------------------------------
-- 7) AI suggestion feedback (pattern engine), only when table is absent
-- ---------------------------------------------------------------------------
-- Many databases already have ai_suggestion_feedback (uuid user_id + more columns).
-- Do not recreate or re-policy an existing table.
DO $fb$
BEGIN
  IF to_regclass('public.ai_suggestion_feedback') IS NULL THEN
    CREATE TABLE public.ai_suggestion_feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      suggestion_id text NOT NULL,
      suggestion_type text NOT NULL,
      suggestion_title text NOT NULL,
      feedback text NOT NULL,
      suggestion_context jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_ai_suggestion_feedback_user
      ON public.ai_suggestion_feedback (user_id, created_at DESC);
    ALTER TABLE public.ai_suggestion_feedback ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ai_suggestion_feedback_insert ON public.ai_suggestion_feedback
      FOR INSERT
      WITH CHECK (user_id = public.get_clerk_user_id());
    CREATE POLICY ai_suggestion_feedback_select ON public.ai_suggestion_feedback
      FOR SELECT
      USING (user_id = public.get_clerk_user_id());
  END IF;
END
$fb$;

-- ---------------------------------------------------------------------------
-- 8) User reports (minimal moderation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_id text NOT NULL,
  reason text,
  context jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_reports_insert ON public.user_reports;
CREATE POLICY user_reports_insert ON public.user_reports
  FOR INSERT
  WITH CHECK (reporter_id = public.get_clerk_user_id());

DROP POLICY IF EXISTS user_reports_select ON public.user_reports;
CREATE POLICY user_reports_select ON public.user_reports
  FOR SELECT
  USING (reporter_id = public.get_clerk_user_id());
