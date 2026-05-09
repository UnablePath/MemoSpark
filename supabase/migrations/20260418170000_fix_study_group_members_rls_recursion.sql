-- 42P17: infinite recursion on study_group_members — policies call is_study_group_member(),
-- which SELECTs study_group_members and re-evaluates the same policy.
-- Fix: helper runs with row_security disabled for its internal reads.
-- Also allow authenticated users to read is_public groups (discover) and member rows for those groups.

CREATE OR REPLACE FUNCTION public.is_study_group_member(_group_id uuid, _user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_study_group_member(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.study_groups;
CREATE POLICY "Users can view groups they are members of" ON public.study_groups
  FOR SELECT USING (
    is_study_group_member(id, (auth.jwt() ->> 'sub')::text)
    OR (
      is_public IS TRUE
      AND (auth.jwt() ->> 'sub') IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can view members of their own groups" ON public.study_group_members;
CREATE POLICY "Users can view members of their own groups" ON public.study_group_members
  FOR SELECT USING (
    is_study_group_member(group_id, (auth.jwt() ->> 'sub')::text)
    OR (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.study_groups sg
        WHERE sg.id = study_group_members.group_id
          AND sg.is_public IS TRUE
      )
    )
  );
