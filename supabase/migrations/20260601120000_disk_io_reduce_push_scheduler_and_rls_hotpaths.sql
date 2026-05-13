-- Reduce Disk IO: (1) RLS "initplan" pattern on hot paths — evaluate JWT/Clerk helpers once per
-- statement instead of per row. (2) Run push-scheduler every 3 minutes instead of every minute.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ─────────────────────────────────────────────────────────────
-- 1) public.messages — high read/write volume (chat)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;

CREATE POLICY "Users can view messages they sent or received" ON public.messages
FOR SELECT USING (
  sender_id = ((SELECT auth.jwt()) ->> 'sub')::text
  OR recipient_id = ((SELECT auth.jwt()) ->> 'sub')::text
  OR public.is_conversation_participant(
    conversation_id,
    ((SELECT auth.jwt()) ->> 'sub')::text
  )
  OR public.is_study_group_chat_member(
    conversation_id,
    ((SELECT auth.jwt()) ->> 'sub')::text
  )
);

CREATE POLICY "Users can insert their own messages" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = ((SELECT auth.jwt()) ->> 'sub')::text
  AND (
    recipient_id IS NOT NULL
    OR public.is_conversation_participant(
      conversation_id,
      ((SELECT auth.jwt()) ->> 'sub')::text
    )
    OR public.is_study_group_chat_member(
      conversation_id,
      ((SELECT auth.jwt()) ->> 'sub')::text
    )
  )
);

-- ─────────────────────────────────────────────────────────────
-- 2) public.tasks — frequent list/count queries from the app
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow users to view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow users to create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow users to update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow users to delete their own tasks" ON public.tasks;

CREATE POLICY "Allow users to view their own tasks" ON public.tasks
  FOR SELECT USING (
    clerk_user_id = (SELECT auth.jwt()) ->> 'sub'
  );

CREATE POLICY "Allow users to create their own tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    clerk_user_id = (SELECT auth.jwt()) ->> 'sub'
  );

CREATE POLICY "Allow users to update their own tasks" ON public.tasks
  FOR UPDATE USING (
    clerk_user_id = (SELECT auth.jwt()) ->> 'sub'
  ) WITH CHECK (
    clerk_user_id = (SELECT auth.jwt()) ->> 'sub'
  );

CREATE POLICY "Allow users to delete their own tasks" ON public.tasks
  FOR DELETE USING (
    clerk_user_id = (SELECT auth.jwt()) ->> 'sub'
  );

-- ─────────────────────────────────────────────────────────────
-- 3) public.user_stats — achievements / gamification path
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Allow users to access their own stats" ON public.user_stats;

CREATE POLICY "Users can manage their own stats" ON public.user_stats
  FOR ALL
  USING ((SELECT public.get_clerk_user_id()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4) pg_cron: push-scheduler every 3 minutes (was * * * * *)
-- Same secret/url pattern as 20260601000000_notification_system_v2.sql
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
    RAISE NOTICE 'Skipping push-scheduler reschedule: set app.service_role_key and app.cron_secret, or change pg_cron in the dashboard.';
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

  PERFORM cron.schedule('push-scheduler', '*/3 * * * *', v_cmd);
END;
$$;
