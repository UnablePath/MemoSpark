-- MemoSpark notification system v2 — Web Push + orchestration (replaces OneSignal push subscription storage)
-- After apply: set database settings app.supabase_url, app.service_role_key, app.cron_secret then re-run cron block or reschedule from SQL editor.

-- ─────────────────────────────────────────────────────────────
-- LAYER 1: DELIVERY
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DROP TABLE IF EXISTS push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES profiles (clerk_user_id) ON DELETE CASCADE,
  endpoint          TEXT NOT NULL,
  p256dh_key        TEXT NOT NULL,
  auth_key          TEXT NOT NULL,
  subscription_json JSONB NOT NULL,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_clerk_self ON push_subscriptions;

CREATE POLICY push_subscriptions_clerk_self ON push_subscriptions
  FOR ALL
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

-- ─────────────────────────────────────────────────────────────
-- LAYER 2: ORCHESTRATION
-- ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES profiles (clerk_user_id) ON DELETE CASCADE,
  category        TEXT NOT NULL
    CHECK (category IN ('task_reminder', 'streak', 'social', 'achievement', 'system')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  url             TEXT NOT NULL DEFAULT '/',
  icon            TEXT,
  image           TEXT,
  actions         JSONB,
  extra           JSONB,
  source_type     TEXT,
  source_id       UUID,
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  failure_reason  TEXT,
  retry_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);

CREATE INDEX idx_notifications_status_sched ON notifications (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX idx_notifications_source ON notifications (source_type, source_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN notifications.retry_count IS 'Incremented when delivery attempts fail; scheduler skips rows with retry_count >= 3';

DROP POLICY IF EXISTS notifications_select_own ON notifications;

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (user_id = public.get_clerk_user_id());

DROP TABLE IF EXISTS notification_preferences CASCADE;

CREATE TABLE notification_preferences (
  user_id            TEXT PRIMARY KEY REFERENCES profiles (clerk_user_id) ON DELETE CASCADE,
  task_reminders     BOOLEAN NOT NULL DEFAULT true,
  streak_alerts      BOOLEAN NOT NULL DEFAULT true,
  social_activity    BOOLEAN NOT NULL DEFAULT true,
  achievements       BOOLEAN NOT NULL DEFAULT true,
  system_notices     BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start  TIME,
  quiet_hours_end    TIME,
  timezone           TEXT NOT NULL DEFAULT 'UTC',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_clerk_self ON notification_preferences;

CREATE POLICY notification_preferences_clerk_self ON notification_preferences
  FOR ALL
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

-- ─────────────────────────────────────────────────────────────
-- notify_user RPC
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_user (
  p_user_id         TEXT,
  p_category        TEXT,
  p_title           TEXT,
  p_body            TEXT,
  p_url             TEXT DEFAULT '/',
  p_scheduled_for   TIMESTAMPTZ DEFAULT now(),
  p_source_type     TEXT DEFAULT NULL,
  p_source_id       UUID DEFAULT NULL,
  p_actions         JSONB DEFAULT '[{"action":"open","title":"View"}]'::jsonb,
  p_extra           JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id               UUID;
  v_prefs            notification_preferences%ROWTYPE;
  v_category_enabled BOOLEAN;
  v_sched            TIMESTAMPTZ := p_scheduled_for;
  v_tz               TEXT;
  v_local_ts         TIMESTAMP WITHOUT TIME ZONE;
  v_local_time       TIME;
  v_prefs_found      BOOLEAN;
BEGIN
  IF p_category NOT IN ('task_reminder', 'streak', 'social', 'achievement', 'system') THEN
    RAISE EXCEPTION 'notify_user: invalid category %', p_category;
  END IF;

  SELECT * INTO v_prefs FROM notification_preferences np WHERE np.user_id = p_user_id;
  v_prefs_found := FOUND;

  IF NOT v_prefs_found THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_prefs FROM notification_preferences np WHERE np.user_id = p_user_id;
    v_prefs_found := FOUND;
  END IF;

  IF NOT v_prefs_found THEN
    v_category_enabled := TRUE;
  ELSE
    v_category_enabled := CASE p_category
      WHEN 'task_reminder' THEN v_prefs.task_reminders
      WHEN 'streak'        THEN v_prefs.streak_alerts
      WHEN 'social'       THEN v_prefs.social_activity
      WHEN 'achievement'  THEN v_prefs.achievements
      WHEN 'system'       THEN v_prefs.system_notices
      ELSE TRUE
    END;
  END IF;

  IF NOT v_category_enabled THEN
    RETURN NULL;
  END IF;

  IF v_prefs_found
     AND v_prefs.quiet_hours_start IS NOT NULL
     AND v_prefs.quiet_hours_end IS NOT NULL THEN
    v_tz := COALESCE(NULLIF(trim(v_prefs.timezone), ''), 'UTC');
    v_local_ts := v_sched AT TIME ZONE v_tz;
    v_local_time := v_local_ts::time;

    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      IF v_local_time >= v_prefs.quiet_hours_start AND v_local_time <= v_prefs.quiet_hours_end THEN
        v_sched := ((v_local_ts::date)::text || ' ' || v_prefs.quiet_hours_end::text)::timestamp AT TIME ZONE v_tz;
      END IF;
    ELSE
      IF v_local_time >= v_prefs.quiet_hours_start OR v_local_time < v_prefs.quiet_hours_end THEN
        v_sched := (((v_local_ts::date + 1))::text || ' ' || v_prefs.quiet_hours_end::text)::timestamp AT TIME ZONE v_tz;
      END IF;
    END IF;
  END IF;

  INSERT INTO notifications (
    user_id, category, title, body, url,
    scheduled_for, source_type, source_id, actions, extra
  ) VALUES (
    p_user_id, p_category, p_title, p_body, p_url,
    v_sched, p_source_type, p_source_id, p_actions, p_extra
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user (TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_user (TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, JSONB, JSONB) TO service_role;

-- Task reminder trigger
CREATE OR REPLACE FUNCTION public.trigger_task_reminder () RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          TEXT;
  v_remind_at        TIMESTAMPTZ;
  v_reminder_minutes INT;
BEGIN
  IF NEW.due_date IS NULL OR NEW.completed = TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.due_date IS NOT DISTINCT FROM NEW.due_date AND OLD.completed IS NOT DISTINCT FROM NEW.completed THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(NEW.clerk_user_id, NEW.user_id);
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE notifications
  SET status = 'cancelled'
  WHERE source_type = 'task'
    AND source_id = NEW.id
    AND status = 'pending';

  v_reminder_minutes := COALESCE(
    (NULLIF(trim(NEW.reminder_settings ->> 'minutes_before'), '')::int),
    (NULLIF(trim(NEW.reminder_settings ->> 'offset_minutes'), '')::int),
    15
  );

  v_remind_at := NEW.due_date - (v_reminder_minutes::text || ' minutes')::interval;

  IF v_remind_at > now() THEN
    PERFORM public.notify_user(
      v_user_id,
      'task_reminder',
      CASE NEW.priority::text
        WHEN 'high' THEN '🔴 ' || NEW.title
        ELSE '📌 ' || NEW.title
      END,
      'Due in ' || v_reminder_minutes::text || ' minutes',
      '/tasks?highlight=' || NEW.id::text,
      v_remind_at,
      'task',
      NEW.id,
      '[{"action":"complete","title":"✅ Done"},{"action":"snooze","title":"⏰ Snooze"}]'::jsonb,
      jsonb_build_object(
        'taskId', NEW.id,
        'sourceId', NEW.id::text,
        'sourceType', 'task',
        'priority', NEW.priority::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_reminder_notification () RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS NULL OR NEW.completed = TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.due_date IS NOT DISTINCT FROM NEW.due_date
     AND OLD.completed IS NOT DISTINCT FROM NEW.completed THEN
    RETURN NEW;
  END IF;

  UPDATE notifications
  SET status = 'cancelled'
  WHERE source_type = 'reminder'
    AND source_id = NEW.id
    AND status = 'pending';

  IF NEW.due_date > now() THEN
    PERFORM public.notify_user(
      NEW.user_id::text,
      'task_reminder',
      '⏰ ' || NEW.title,
      'Reminder is due now',
      '/reminders?highlight=' || NEW.id::text,
      NEW.due_date,
      'reminder',
      NEW.id,
      '[{"action":"complete","title":"✅ Done"},{"action":"snooze","title":"⏰ Snooze"}]'::jsonb,
      jsonb_build_object(
        'reminderId', NEW.id,
        'sourceId', NEW.id::text,
        'sourceType', 'reminder'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_due_date_set ON public.tasks;

CREATE TRIGGER on_task_due_date_set
  AFTER INSERT OR UPDATE OF due_date, completed, reminder_settings ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_task_reminder ();

DROP TRIGGER IF EXISTS on_reminder_set ON public.reminders;

CREATE TRIGGER on_reminder_set
  AFTER INSERT OR UPDATE OF due_date, completed ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reminder_notification ();

-- ─────────────────────────────────────────────────────────────
-- pg_cron: invoke push-scheduler every minute via pg_net
-- Supabase-hosted: ALTER DATABASE SET custom params is often denied; use SQL Editor /
-- Vault for secrets. Base URL for Edge Functions is fixed to this project URL.
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_cmd TEXT;
  v_sr TEXT := NULLIF(trim(current_setting('app.service_role_key', true)), '');
  v_cs TEXT := NULLIF(trim(current_setting('app.cron_secret', true)), '');
  v_jobid BIGINT;
  v_base_trim CONSTANT TEXT := 'https://pexqavlkabbguaqjdfce.supabase.co';
BEGIN
  IF v_sr IS NULL OR v_cs IS NULL THEN
    RAISE NOTICE 'Skipping push-scheduler cron: set app.service_role_key and app.cron_secret (if your role may set custom params), or configure pg_cron manually with Bearer + x-cron-secret.';
    RETURN;
  END IF;

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'push-scheduler' LIMIT 1;
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;

  v_cmd := format(
    $c$SELECT net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L, 'x-cron-secret', %L), body := '{}'::jsonb);$c$,
    v_base_trim || '/functions/v1/push-scheduler',
    'Bearer ' || v_sr,
    v_cs
  );

  PERFORM cron.schedule('push-scheduler', '* * * * *', v_cmd);
END;
$$;
