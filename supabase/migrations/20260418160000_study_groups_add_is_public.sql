-- Align DB with app + generated types: discover lists use `is_public`.
ALTER TABLE public.study_groups
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.study_groups.is_public IS 'When true, the group may appear in public discovery; private groups stay invite-only.';
