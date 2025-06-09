-- Migration: Create tasks and timetable_entries tables with RLS and triggers
-- Description: Comprehensive backend foundation for MemoSpark task and event system

-- Create ENUM types for better type safety
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_type AS ENUM ('academic', 'personal', 'event');

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) > 0),
    description TEXT,
    due_date TIMESTAMPTZ,
    priority priority_level NOT NULL DEFAULT 'medium',
    type task_type NOT NULL DEFAULT 'personal',
    subject TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    reminder_settings JSONB DEFAULT '{"enabled": false}'::jsonb,
    recurrence_rule TEXT, -- iCalendar RRULE format
    original_due_date TIMESTAMPTZ, -- For recurring task instances
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create timetable_entries table
CREATE TABLE timetable_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL CHECK (length(course_name) > 0),
    course_code TEXT,
    instructor TEXT,
    location TEXT,
    start_time TIME,
    end_time TIME,
    days_of_week TEXT[] DEFAULT ARRAY[]::TEXT[],
    semester_start_date DATE,
    semester_end_date DATE,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint to ensure end_time is after start_time
    CONSTRAINT valid_time_range CHECK (
        (start_time IS NULL OR end_time IS NULL) OR 
        (end_time > start_time)
    ),
    
    -- Constraint to ensure semester dates are valid
    CONSTRAINT valid_semester_dates CHECK (
        (semester_start_date IS NULL OR semester_end_date IS NULL) OR 
        (semester_end_date >= semester_start_date)
    ),
    
    -- Constraint to validate days_of_week values
    CONSTRAINT valid_days_of_week CHECK (
        days_of_week <@ ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    ),
    
    -- Constraint to validate color format (basic hex color validation)
    CONSTRAINT valid_color_format CHECK (
        color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

CREATE INDEX idx_timetable_entries_user_id ON timetable_entries(user_id);
CREATE INDEX idx_timetable_entries_days_of_week ON timetable_entries USING gin(days_of_week);
CREATE INDEX idx_timetable_entries_course_name ON timetable_entries(course_name);
CREATE INDEX idx_timetable_entries_created_at ON timetable_entries(created_at);

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_entries_updated_at
    BEFORE UPDATE ON timetable_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks table
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timetable_entries table
CREATE POLICY "Users can view their own timetable entries" ON timetable_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetable entries" ON timetable_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetable entries" ON timetable_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetable entries" ON timetable_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE tasks IS 'User tasks and events with support for recurrence and reminders';
COMMENT ON TABLE timetable_entries IS 'User course schedule entries for semester planning';

COMMENT ON COLUMN tasks.recurrence_rule IS 'iCalendar RRULE format for recurring tasks';
COMMENT ON COLUMN tasks.original_due_date IS 'Original due date for recurring task instances';
COMMENT ON COLUMN tasks.reminder_settings IS 'JSON configuration for task reminders';

COMMENT ON COLUMN timetable_entries.days_of_week IS 'Array of weekday names when course occurs';
COMMENT ON COLUMN timetable_entries.color IS 'Hex color code for UI display (e.g., #3B82F6)'; 