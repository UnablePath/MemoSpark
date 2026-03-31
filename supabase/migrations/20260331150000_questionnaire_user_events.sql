-- Per-user questionnaire funnel events (distinct from aggregate `questionnaire_analytics` in 008).
CREATE TABLE IF NOT EXISTS questionnaire_user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    template_id UUID REFERENCES questionnaire_templates(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_user_events_user ON questionnaire_user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_user_events_template ON questionnaire_user_events(template_id);

ALTER TABLE questionnaire_user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own questionnaire events"
  ON questionnaire_user_events FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can select own questionnaire events"
  ON questionnaire_user_events FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

COMMENT ON TABLE questionnaire_user_events IS 'Step-level questionnaire analytics; 008 questionnaire_analytics remains for aggregate reports.';
