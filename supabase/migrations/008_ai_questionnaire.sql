-- AI Questionnaire and User Preferences Schema
-- This migration creates tables for AI-powered questionnaire system that learns user patterns

-- Table for questionnaire templates/questions
CREATE TABLE IF NOT EXISTS questionnaire_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'onboarding', 'preferences', 'schedule', 'habits', 'stress'
    questions JSONB NOT NULL, -- Array of question objects with type, options, dependencies
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    order_priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for user questionnaire responses
CREATE TABLE IF NOT EXISTS user_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
    responses JSONB NOT NULL, -- User's answers to questions
    completion_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    completion_percentage NUMERIC(5,2) DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, template_id) -- One response per user per template
);

-- Table for analyzed user patterns from questionnaire data
CREATE TABLE IF NOT EXISTS user_ai_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    
    -- Schedule patterns
    preferred_study_times JSONB, -- Array of time slots
    productivity_peaks JSONB, -- Times when user is most productive
    break_preferences JSONB, -- Preferred break duration and frequency
    
    -- Learning patterns
    learning_style TEXT, -- 'visual', 'auditory', 'kinesthetic', 'mixed'
    attention_span INTEGER, -- Minutes
    difficulty_preference TEXT, -- 'easy_to_hard', 'hard_first', 'mixed'
    
    -- Stress and wellness patterns
    stress_triggers JSONB, -- Array of stress triggers
    stress_relief_preferences JSONB, -- Preferred stress relief activities
    motivation_factors JSONB, -- What motivates the user
    
    -- Task management patterns
    task_completion_style TEXT, -- 'batch', 'sequential', 'priority_based'
    deadline_pressure_response TEXT, -- 'thrives', 'struggles', 'balanced'
    collaboration_preference TEXT, -- 'solo', 'group', 'mixed'
    
    -- Notification preferences
    notification_timing JSONB, -- When to send notifications
    reminder_frequency TEXT, -- 'low', 'medium', 'high'
    
    -- Confidence scores for each pattern (0-1)
    pattern_confidence JSONB DEFAULT '{}',
    
    -- Analysis metadata
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    data_sources JSONB DEFAULT '[]', -- Which questionnaires contributed to this pattern
    analysis_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for questionnaire analytics
CREATE TABLE IF NOT EXISTS questionnaire_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
    user_demographics JSONB, -- Aggregate demographic data
    response_patterns JSONB, -- Common response patterns
    completion_rates JSONB, -- Completion statistics
    question_effectiveness JSONB, -- Which questions provide best insights
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_category ON questionnaire_templates(category);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_active ON questionnaire_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_template_id ON user_questionnaire_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_status ON user_questionnaire_responses(completion_status);
CREATE INDEX IF NOT EXISTS idx_user_patterns_user_id ON user_ai_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_analytics_template ON questionnaire_analytics(template_id);

-- RLS Policies
ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for questionnaire_templates (public read)
CREATE POLICY "Anyone can view active questionnaire templates" ON questionnaire_templates
    FOR SELECT TO authenticated USING (is_active = true);

-- Policies for user_questionnaire_responses
CREATE POLICY "Users can view their own questionnaire responses" ON user_questionnaire_responses
    FOR SELECT TO authenticated USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert their own questionnaire responses" ON user_questionnaire_responses
    FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update their own questionnaire responses" ON user_questionnaire_responses
    FOR UPDATE TO authenticated USING (auth.jwt() ->> 'sub' = user_id)
    WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policies for user_ai_patterns
CREATE POLICY "Users can view their own AI patterns" ON user_ai_patterns
    FOR SELECT TO authenticated USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert their own AI patterns" ON user_ai_patterns
    FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update their own AI patterns" ON user_ai_patterns
    FOR UPDATE TO authenticated USING (auth.jwt() ->> 'sub' = user_id)
    WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policies for questionnaire_analytics (public read for aggregated data)
CREATE POLICY "Anyone can view questionnaire analytics" ON questionnaire_analytics
    FOR SELECT TO authenticated USING (true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_questionnaire_templates_updated_at 
    BEFORE UPDATE ON questionnaire_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_questionnaire_responses_updated_at 
    BEFORE UPDATE ON user_questionnaire_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ai_patterns_updated_at 
    BEFORE UPDATE ON user_ai_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default questionnaire templates
INSERT INTO questionnaire_templates (title, description, category, questions, order_priority) VALUES
(
    'Study Habits & Preferences',
    'Help us understand your study patterns and preferences',
    'preferences',
    '[
        {
            "id": "study_time_preference",
            "type": "multiple_choice",
            "question": "When do you feel most productive for studying?",
            "options": ["Early morning (6-9 AM)", "Morning (9-12 PM)", "Afternoon (12-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late night (11 PM+)"],
            "required": true
        },
        {
            "id": "study_duration",
            "type": "slider",
            "question": "How long can you typically focus on studying without a break?",
            "min": 15,
            "max": 180,
            "unit": "minutes",
            "required": true
        },
        {
            "id": "learning_style",
            "type": "multiple_choice",
            "question": "Which learning style describes you best?",
            "options": ["Visual (charts, diagrams, images)", "Auditory (lectures, discussions)", "Kinesthetic (hands-on, movement)", "Reading/Writing (text-based)", "Mixed approach"],
            "required": true
        },
        {
            "id": "difficulty_approach",
            "type": "multiple_choice",
            "question": "How do you prefer to approach difficult tasks?",
            "options": ["Start with easy tasks to build momentum", "Tackle hardest tasks first", "Mix easy and hard tasks", "Break difficult tasks into smaller parts"],
            "required": true
        },
        {
            "id": "collaboration_style",
            "type": "multiple_choice",
            "question": "Do you prefer to study alone or with others?",
            "options": ["Always alone", "Mostly alone", "Sometimes with others", "Mostly with others", "Always in groups"],
            "required": true
        }
    ]',
    1
),
(
    'Schedule & Routine',
    'Tell us about your daily schedule and routine preferences',
    'schedule',
    '[
        {
            "id": "wake_time",
            "type": "time",
            "question": "What time do you usually wake up?",
            "required": true
        },
        {
            "id": "sleep_time",
            "type": "time",
            "question": "What time do you usually go to bed?",
            "required": true
        },
        {
            "id": "break_frequency",
            "type": "multiple_choice",
            "question": "How often do you like to take breaks while studying?",
            "options": ["Every 15-20 minutes", "Every 30-45 minutes", "Every hour", "Every 2 hours", "When I feel tired"],
            "required": true
        },
        {
            "id": "break_activities",
            "type": "multiple_select",
            "question": "What do you like to do during breaks?",
            "options": ["Walk around", "Listen to music", "Social media", "Snack/drink", "Exercise", "Chat with friends", "Rest/nap", "Other"],
            "required": true
        },
        {
            "id": "deadline_behavior",
            "type": "multiple_choice",
            "question": "How do you typically handle deadlines?",
            "options": ["Start immediately when assigned", "Start with plenty of time", "Start with moderate time", "Start close to deadline", "Procrastinate until last minute"],
            "required": true
        }
    ]',
    2
),
(
    'Stress & Wellness',
    'Help us understand your stress patterns and wellness needs',
    'stress',
    '[
        {
            "id": "stress_level",
            "type": "slider",
            "question": "How would you rate your current stress level?",
            "min": 1,
            "max": 10,
            "required": true
        },
        {
            "id": "stress_triggers",
            "type": "multiple_select",
            "question": "What typically causes you stress?",
            "options": ["Upcoming deadlines", "Difficult subjects", "Heavy workload", "Social situations", "Financial concerns", "Family expectations", "Future uncertainty", "Poor grades"],
            "required": true
        },
        {
            "id": "stress_relief",
            "type": "multiple_select",
            "question": "What helps you manage stress?",
            "options": ["Exercise", "Music", "Talking to friends", "Deep breathing", "Gaming", "Reading", "Meditation", "Sleep", "Creative activities"],
            "required": true
        },
        {
            "id": "motivation_factors",
            "type": "multiple_select",
            "question": "What motivates you to study?",
            "options": ["Good grades", "Future career", "Personal growth", "Family pride", "Competition", "Learning new things", "Avoiding failure", "Rewards"],
            "required": true
        },
        {
            "id": "burnout_signs",
            "type": "multiple_select",
            "question": "How do you know when you need a break?",
            "options": ["Difficulty concentrating", "Feeling overwhelmed", "Physical tiredness", "Loss of motivation", "Irritability", "Poor sleep", "Headaches", "Anxiety"],
            "required": false
        }
    ]',
    3
);

-- Insert default user patterns for analysis
-- This will be populated by the QuestionnaireManager when users complete questionnaires 