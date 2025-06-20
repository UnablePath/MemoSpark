-- Migration: Add Bubble Game Score Achievements
-- Description: Adds new achievements for reaching specific score milestones in the Bubble Pop game.

-- New Achievement: Bubble Pro (1000 points)
INSERT INTO public.achievements (name, description, icon, type, criteria, points_reward, is_secret)
VALUES (
  'Bubble Pro',
  'Achieve a score of 1000 in the Bubble Pop game.',
  '🎯',
  'wellness',
  '{"score": 1000}',
  25,
  false
)
ON CONFLICT (name) DO NOTHING;

-- New Achievement: Bubble Master (2500 points)
INSERT INTO public.achievements (name, description, icon, type, criteria, points_reward, is_secret)
VALUES (
  'Bubble Master',
  'Achieve a score of 2500 in the Bubble Pop game.',
  '🏆',
  'wellness',
  '{"score": 2500}',
  50,
  false
)
ON CONFLICT (name) DO NOTHING;

-- New Achievement: Bubble Legend (5000 points)
INSERT INTO public.achievements (name, description, icon, type, criteria, points_reward, is_secret)
VALUES (
  'Bubble Legend',
  'Achieve a score of 5000 in the Bubble Pop game. Truly legendary!',
  '👑',
  'wellness',
  '{"score": 5000}',
  100,
  true
)
ON CONFLICT (name) DO NOTHING; 