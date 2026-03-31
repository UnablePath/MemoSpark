-- Clerk user id (text), flexible metadata — matches /api/analytics/onboarding POST handler.
CREATE TABLE IF NOT EXISTS public.onboarding_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  event text NOT NULL,
  step integer,
  step_name text,
  client_ts bigint,
  metadata jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id
  ON public.onboarding_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at
  ON public.onboarding_analytics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event
  ON public.onboarding_analytics (event);

COMMENT ON TABLE public.onboarding_analytics IS 'Onboarding funnel events; user_id is Clerk user id string.';
