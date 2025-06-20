-- Migration: Add Bubble Game Score Achievements
-- Description: Adds new achievements for reaching specific score milestones in the Bubble Pop game.

INSERT INTO public.achievements (name, description, icon, type, criteria, points_reward)
VALUES 
  (
    'Bubble Pro',
    'Achieve a score of 1000 in the Bubble Pop game.',
    '🎯',
    'wellness',
    '{"score": 1000}',
    25
  ),
  (
    'Bubble Master',
    'Achieve a score of 2500 in the Bubble Pop game.',
    '🏆',
    'wellness',
    '{"score": 2500}',
    50
  ),
  (
    'Bubble Legend',
    'Achieve a score of 5000 in the Bubble Pop game. Truly legendary!',
    '👑',
    'wellness',
    '{"score": 5000}',
    100
  )
ON CONFLICT (name) DO NOTHING; 