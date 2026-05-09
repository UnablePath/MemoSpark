-- Security hardening: permissive RLS fixes, Clerk-aligned policies, SECURITY DEFINER search_path.
-- See Supabase database linter: rls_policy_always_true, rls_enabled_no_policy, function_search_path_mutable.

-- ---------------------------------------------------------------------------
-- Critical: user_subscriptions — remove open access; consolidate Clerk checks
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous access for user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
  FOR SELECT USING (clerk_user_id = public.get_clerk_user_id());

CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions
  FOR INSERT WITH CHECK (clerk_user_id = public.get_clerk_user_id());

CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions
  FOR UPDATE
  USING (clerk_user_id = public.get_clerk_user_id())
  WITH CHECK (clerk_user_id = public.get_clerk_user_id());

-- ---------------------------------------------------------------------------
-- High: Crashout comments / votes / reactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all operations for comments" ON public.crashout_post_comments;

CREATE POLICY "Users can insert comments on visible posts" ON public.crashout_post_comments
  FOR INSERT WITH CHECK (
    user_id = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.crashout_posts p
      WHERE p.id = crashout_post_comments.post_id
        AND (p.is_private = false OR p.user_id = public.get_clerk_user_id())
    )
  );

CREATE POLICY "Users can update own comments" ON public.crashout_post_comments
  FOR UPDATE
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can delete own comments" ON public.crashout_post_comments
  FOR DELETE USING (user_id = public.get_clerk_user_id());

DROP POLICY IF EXISTS "Enable all operations for votes" ON public.crashout_post_votes;

CREATE POLICY "Users can insert own votes" ON public.crashout_post_votes
  FOR INSERT WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can update own votes" ON public.crashout_post_votes
  FOR UPDATE
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can delete own votes" ON public.crashout_post_votes
  FOR DELETE USING (user_id = public.get_clerk_user_id());

DROP POLICY IF EXISTS "Enable all operations for reactions" ON public.post_reactions;

CREATE POLICY "Users can insert own reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can update own reactions" ON public.post_reactions
  FOR UPDATE
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can delete own reactions" ON public.post_reactions
  FOR DELETE USING (user_id = public.get_clerk_user_id());

-- ---------------------------------------------------------------------------
-- notification_analytics — drop permissive ALL; Clerk-aligned row scope
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS notification_analytics_user_access ON public.notification_analytics;
DROP POLICY IF EXISTS "Users can view their own notification analytics" ON public.notification_analytics;

CREATE POLICY "Users can view their own notification analytics" ON public.notification_analytics
  FOR SELECT USING (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

-- ---------------------------------------------------------------------------
-- streaks — remove open system policy; profile-scoped read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can update streaks" ON public.streaks;
DROP POLICY IF EXISTS "Users can view their own streaks" ON public.streaks;

CREATE POLICY "Users can view their own streaks" ON public.streaks
  FOR SELECT USING (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

-- ---------------------------------------------------------------------------
-- refund_requests — scope to Clerk user
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Users can insert own refund requests" ON public.refund_requests;

CREATE POLICY "Users can view own refund requests" ON public.refund_requests
  FOR SELECT USING (clerk_user_id = public.get_clerk_user_id());

CREATE POLICY "Users can insert own refund requests" ON public.refund_requests
  FOR INSERT WITH CHECK (clerk_user_id = public.get_clerk_user_id());

-- ---------------------------------------------------------------------------
-- group_audit_log — inserts only via SECURITY DEFINER helpers / triggers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert audit logs" ON public.group_audit_log;

-- ---------------------------------------------------------------------------
-- settings — Clerk profile id; remove open insert
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert default settings" ON public.settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;

CREATE POLICY "Users can view their own settings" ON public.settings
  FOR SELECT USING (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

CREATE POLICY "Users can insert their own settings" ON public.settings
  FOR INSERT WITH CHECK (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

CREATE POLICY "Users can update their own settings" ON public.settings
  FOR UPDATE
  USING (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  )
  WITH CHECK (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

-- ---------------------------------------------------------------------------
-- connections — tighten UPDATE WITH CHECK
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS connections_update ON public.connections;

CREATE POLICY connections_update ON public.connections
  FOR UPDATE
  USING (
    public.get_clerk_user_id() = requester_id OR public.get_clerk_user_id() = receiver_id
  )
  WITH CHECK (
    public.get_clerk_user_id() = requester_id OR public.get_clerk_user_id() = receiver_id
  );

-- ---------------------------------------------------------------------------
-- Medium: tables with RLS enabled but no policies (explicit rules)
-- ---------------------------------------------------------------------------
-- Reference / catalog: readable when authenticated (Clerk JWT present)
CREATE POLICY achievement_templates_select_authenticated ON public.achievement_templates
  FOR SELECT USING (public.get_clerk_user_id() IS NOT NULL);

CREATE POLICY coin_spending_categories_select_authenticated ON public.coin_spending_categories
  FOR SELECT USING (public.get_clerk_user_id() IS NOT NULL);

CREATE POLICY reward_shop_items_select_authenticated ON public.reward_shop_items
  FOR SELECT USING (public.get_clerk_user_id() IS NOT NULL);

CREATE POLICY role_permissions_select_authenticated ON public.role_permissions
  FOR SELECT USING (public.get_clerk_user_id() IS NOT NULL);

-- daily_streaks: Clerk text user_id
CREATE POLICY daily_streaks_own_all ON public.daily_streaks
  FOR ALL
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

-- notification_history (single policy: read/update legacy uuid rows or clerk_id rows; writes must set clerk_user_id)
CREATE POLICY notification_history_own_all ON public.notification_history
  FOR ALL
  USING (
    clerk_user_id = public.get_clerk_user_id()
    OR user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  )
  WITH CHECK (
    clerk_user_id = public.get_clerk_user_id()
    AND (
      user_id IS NULL
      OR user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
    )
  );

-- onboarding_analytics
CREATE POLICY onboarding_analytics_select_own ON public.onboarding_analytics
  FOR SELECT USING (user_id = public.get_clerk_user_id());

CREATE POLICY onboarding_analytics_insert_own ON public.onboarding_analytics
  FOR INSERT WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY onboarding_analytics_update_own ON public.onboarding_analytics
  FOR UPDATE
  USING (user_id = public.get_clerk_user_id())
  WITH CHECK (user_id = public.get_clerk_user_id());

-- payment_authorizations: highly sensitive — own rows only, read-only from client
CREATE POLICY payment_authorizations_select_own ON public.payment_authorizations
  FOR SELECT USING (clerk_user_id = public.get_clerk_user_id());

-- user_roles: profile-linked uuid
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT USING (
    user_id = (SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.get_clerk_user_id() LIMIT 1)
  );

-- Study group satellite tables: group members only
CREATE POLICY study_group_achievements_member_read ON public.study_group_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_achievements.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_resources_member_read ON public.study_group_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_resources.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_resources_member_insert ON public.study_group_resources
  FOR INSERT WITH CHECK (
    user_id = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_resources.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_resources_member_update ON public.study_group_resources
  FOR UPDATE
  USING (
    user_id = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_resources.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  )
  WITH CHECK (
    user_id = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_resources.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_resources_member_delete ON public.study_group_resources
  FOR DELETE USING (
    user_id = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_resources.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_schedule_member_read ON public.study_group_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_schedule.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_schedule_member_write ON public.study_group_schedule
  FOR INSERT WITH CHECK (
    created_by = public.get_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_schedule.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_schedule_member_update ON public.study_group_schedule
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_schedule.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_schedule.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

CREATE POLICY study_group_schedule_member_delete ON public.study_group_schedule
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = study_group_schedule.group_id
        AND m.user_id = public.get_clerk_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: pin search_path (mitigate search_path hijacking)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, p.proname AS fn, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prokind = 'f'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.sch, r.fn, r.args
    );
  END LOOP;
END $$;
