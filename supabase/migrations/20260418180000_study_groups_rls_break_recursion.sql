-- Break 42P17 cycles from duplicate / subquery-based RLS policies.
-- Live DB had overlapping policies that queried study_group_members / study_groups from each other's RLS checks.

CREATE OR REPLACE FUNCTION public.is_study_group_created_by(_group_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_groups
    WHERE id = _group_id AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_study_group_public(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT is_public FROM public.study_groups WHERE id = _group_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_study_group_created_by(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_study_group_public(uuid) TO authenticated;

-- Redundant with "Users can view groups they are members of" but used IN (...) → members RLS → study_groups → recursion
DROP POLICY IF EXISTS "Users can see groups they are in" ON public.study_groups;

-- Redundant self-join on study_group_members for SELECT
DROP POLICY IF EXISTS "Users can see members of their groups" ON public.study_group_members;

-- Avoid EXISTS (SELECT 1 FROM study_groups ...) inside members RLS (re-enters study_groups policies)
DROP POLICY IF EXISTS "Users can manage members in study groups" ON public.study_group_members;
CREATE POLICY "Users can manage members in study groups" ON public.study_group_members
  FOR ALL USING (
    user_id = clerk_user_id()
    OR is_study_group_created_by(group_id, clerk_user_id())
  );

DROP POLICY IF EXISTS "Users can view members of their own groups" ON public.study_group_members;
CREATE POLICY "Users can view members of their own groups" ON public.study_group_members
  FOR SELECT USING (
    is_study_group_member(group_id, (auth.jwt() ->> 'sub')::text)
    OR (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND is_study_group_public(group_id)
    )
  );
