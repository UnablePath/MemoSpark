-- Stress Tracking System Migration
-- Creates comprehensive schema for wellness monitoring and stress analytics

-- Stress tracking main table
CREATE TABLE IF NOT EXISTS stress_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stress_level INTEGER NOT NULL CHECK (stress_level >= 0 AND stress_level <= 100),
  stress_factors TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}', -- Additional context like location, time of day, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stress interventions table
CREATE TABLE IF NOT EXISTS stress_interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stress_reading_id UUID REFERENCES stress_tracking(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL, -- 'breathing', 'ragdoll_game', 'journal', 'break', 'music', etc.
  intervention_data JSONB DEFAULT '{}',
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Stress patterns and predictions
CREATE TABLE IF NOT EXISTS stress_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'daily', 'weekly', 'exam_period', 'deadline_approach'
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness recommendations
CREATE TABLE IF NOT EXISTS wellness_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Stress analytics view
CREATE OR REPLACE VIEW stress_analytics AS
SELECT 
  st.user_id,
  DATE_TRUNC('day', st.created_at) as date,
  AVG(st.stress_level) as avg_stress_level,
  MIN(st.stress_level) as min_stress_level,
  MAX(st.stress_level) as max_stress_level,
  COUNT(*) as reading_count,
  COUNT(si.id) as intervention_count,
  AVG(si.effectiveness_rating) as avg_intervention_effectiveness
FROM stress_tracking st
LEFT JOIN stress_interventions si ON st.id = si.stress_reading_id
GROUP BY st.user_id, DATE_TRUNC('day', st.created_at);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stress_tracking_user_id ON stress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_tracking_created_at ON stress_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_stress_interventions_user_id ON stress_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_patterns_user_id ON stress_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_wellness_recommendations_user_id ON wellness_recommendations(user_id);

-- RLS Policies
ALTER TABLE stress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_recommendations ENABLE ROW LEVEL SECURITY;

-- Stress tracking policies
CREATE POLICY "Users can view own stress tracking"
  ON stress_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stress tracking"
  ON stress_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stress tracking"
  ON stress_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stress interventions policies
CREATE POLICY "Users can view own stress interventions"
  ON stress_interventions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stress interventions"
  ON stress_interventions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stress interventions"
  ON stress_interventions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stress patterns policies
CREATE POLICY "Users can view own stress patterns"
  ON stress_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stress patterns"
  ON stress_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Wellness recommendations policies
CREATE POLICY "Users can view own wellness recommendations"
  ON wellness_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wellness recommendations"
  ON wellness_recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update stress patterns based on new readings
CREATE OR REPLACE FUNCTION update_stress_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called after each stress reading insert
  -- to update stress patterns and predictions
  PERFORM pg_notify('stress_pattern_update', NEW.user_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pattern updates
CREATE OR REPLACE TRIGGER stress_pattern_trigger
  AFTER INSERT ON stress_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_stress_patterns();

-- Function to generate wellness recommendations
CREATE OR REPLACE FUNCTION generate_wellness_recommendations(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_stress DECIMAL;
  recent_stress INTEGER;
BEGIN
  -- Get average stress level for the last week
  SELECT AVG(stress_level) INTO avg_stress
  FROM stress_tracking
  WHERE user_id = target_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Get most recent stress level
  SELECT stress_level INTO recent_stress
  FROM stress_tracking
  WHERE user_id = target_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Generate recommendations based on stress levels
  IF recent_stress > 70 THEN
    INSERT INTO wellness_recommendations (user_id, recommendation_type, title, description, priority)
    VALUES (
      target_user_id,
      'immediate_intervention',
      'High Stress Detected',
      'Your stress level is quite high. Consider taking a 5-minute breathing break or playing the ragdoll game.',
      5
    );
  END IF;

  IF avg_stress > 60 THEN
    INSERT INTO wellness_recommendations (user_id, recommendation_type, title, description, priority)
    VALUES (
      target_user_id,
      'lifestyle_adjustment',
      'Elevated Stress Trend',
      'Your stress levels have been elevated this week. Consider scheduling more breaks and reviewing your workload.',
      3
    );
  END IF;
END;
$$ LANGUAGE plpgsql; 