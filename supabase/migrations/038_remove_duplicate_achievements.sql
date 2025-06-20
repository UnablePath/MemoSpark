-- Migration: Remove duplicate "Task Creator" achievement
-- Description: Deletes the redundant "Task Creator" achievement, which is a
-- duplicate of the "First Task" achievement.

DELETE FROM public.achievements
WHERE name = 'Task Creator'
AND type = 'task_completion'
AND criteria->>'tasks' = '1'; 