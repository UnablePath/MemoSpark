-- Migration: Add stress relief session counter to user_stats
-- Description: Adds a new column to track the number of stress relief sessions
-- a user has started, to be used for the "Zen Master" achievement.

ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS stress_relief_sessions_count INTEGER NOT NULL DEFAULT 0; 