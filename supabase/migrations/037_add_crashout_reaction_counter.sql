-- Migration: Add crashout reaction counter to user_stats
-- Description: Adds a new column to track the number of reactions a user
-- has given in the Crashout Room, to be used for the "Crashout Supporter" achievement.

ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS crashout_reactions_count INTEGER NOT NULL DEFAULT 0; 