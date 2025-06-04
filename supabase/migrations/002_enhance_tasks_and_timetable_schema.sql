-- Migration: Enhance existing tasks and user_timetables tables to match comprehensive requirements
-- Description: Update existing schema to support all features needed for task/event system

-- First, create the ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type AS ENUM ('academic', 'personal', 'event');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhance the tasks table
ALTER TABLE tasks 
-- Add missing columns
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{"enabled": false}'::jsonb,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS original_due_date TIMESTAMPTZ;

-- Update existing columns to use proper types and constraints
DO $$ BEGIN
    -- Update priority column to use ENUM if not already
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        -- If enum doesn't exist, add check constraint
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
        CHECK (priority IN ('low', 'medium', 'high')) NOT VALID;
    END IF;
    
    -- Update type column to use ENUM if not already  
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
        -- If enum doesn't exist, add check constraint
        ALTER TABLE tasks ADD CONSTRAINT tasks_type_check 
        CHECK (type IN ('academic', 'personal', 'event')) NOT VALID;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Ensure title has proper constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_title_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_title_check CHECK (length(title) > 0);

-- Update default values
ALTER TABLE tasks ALTER COLUMN completed SET DEFAULT false;
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'medium';
ALTER TABLE tasks ALTER COLUMN type SET DEFAULT 'personal';

-- Drop the old reminder column if it exists and is boolean
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tasks' AND column_name = 'reminder' 
               AND data_type = 'boolean') THEN
        -- Migrate data from old reminder column to new reminder_settings
        UPDATE tasks 
        SET reminder_settings = CASE 
            WHEN reminder = true THEN '{"enabled": true, "offset_minutes": 15}'::jsonb
            ELSE '{"enabled": false}'::jsonb
        END
        WHERE reminder_settings IS NULL;
        
        -- Drop the old column
        ALTER TABLE tasks DROP COLUMN IF EXISTS reminder;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Enhance the user_timetables table to match our requirements
-- Rename to timetable_entries for consistency if needed (or create an alias view)
DO $$ BEGIN
    -- Add missing constraints if they don't exist
    ALTER TABLE user_timetables DROP CONSTRAINT IF EXISTS valid_time_range;
    ALTER TABLE user_timetables ADD CONSTRAINT valid_time_range CHECK (
        (start_time IS NULL OR end_time IS NULL) OR 
        (end_time > start_time)
    );
    
    ALTER TABLE user_timetables DROP CONSTRAINT IF EXISTS valid_semester_dates;
    ALTER TABLE user_timetables ADD CONSTRAINT valid_semester_dates CHECK (
        (semester_start_date IS NULL OR semester_end_date IS NULL) OR 
        (semester_end_date >= semester_start_date)
    );
    
    ALTER TABLE user_timetables DROP CONSTRAINT IF EXISTS valid_days_of_week;
    ALTER TABLE user_timetables ADD CONSTRAINT valid_days_of_week CHECK (
        days_of_week <@ ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    );
    
    ALTER TABLE user_timetables DROP CONSTRAINT IF EXISTS valid_color_format;
    ALTER TABLE user_timetables ADD CONSTRAINT valid_color_format CHECK (
        color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'
    );
EXCEPTION
    WHEN others THEN null;
END $$;

-- Ensure course_name has proper constraint
ALTER TABLE user_timetables DROP CONSTRAINT IF EXISTS user_timetables_course_name_check;
ALTER TABLE user_timetables ADD CONSTRAINT user_timetables_course_name_check CHECK (length(course_name) > 0);

-- Update default values for user_timetables
ALTER TABLE user_timetables ALTER COLUMN color SET DEFAULT '#3B82F6';

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_due_date ON tasks(user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_completed_type ON tasks(completed, type);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_original_due_date ON tasks(original_due_date) WHERE original_due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_timetables_user_id_days ON user_timetables(user_id) WHERE array_length(days_of_week, 1) > 0;
CREATE INDEX IF NOT EXISTS idx_user_timetables_semester_dates ON user_timetables(semester_start_date, semester_end_date) WHERE semester_start_date IS NOT NULL;

-- Update the updated_at trigger function to be more robust
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure triggers exist for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_timetables_updated_at ON user_timetables;
CREATE TRIGGER update_user_timetables_updated_at
    BEFORE UPDATE ON user_timetables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for backward compatibility and consistent naming
CREATE OR REPLACE VIEW timetable_entries AS
SELECT 
    id,
    user_id,
    course_name,
    course_code,
    instructor,
    location,
    start_time,
    end_time,
    days_of_week,
    semester_start_date,
    semester_end_date,
    color,
    created_at,
    updated_at
FROM user_timetables;

-- Grant appropriate permissions on the view
ALTER VIEW timetable_entries OWNER TO postgres;

-- Update table comments for documentation
COMMENT ON TABLE tasks IS 'Enhanced user tasks and events with support for recurrence, detailed reminders, and comprehensive metadata';
COMMENT ON TABLE user_timetables IS 'Enhanced user course schedule entries for semester planning with improved constraints and validation';

COMMENT ON COLUMN tasks.reminder_settings IS 'JSON configuration for task reminders including type, offset, and preferences';
COMMENT ON COLUMN tasks.recurrence_rule IS 'iCalendar RRULE format for recurring tasks and events';
COMMENT ON COLUMN tasks.original_due_date IS 'Original due date for recurring task instances to track schedule changes';

COMMENT ON COLUMN user_timetables.days_of_week IS 'Array of weekday names when course occurs, validated against standard weekday names';
COMMENT ON COLUMN user_timetables.color IS 'Hex color code for UI display, validated format #RRGGBB'; 