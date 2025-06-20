-- Migration: Add mood post counter to user_stats
-- Description: Adds a new column to track the number of crashout posts
-- with a mood attached, to be used for the "Mood Tracker" achievement.

ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS mood_posts_count INTEGER NOT NULL DEFAULT 0; 