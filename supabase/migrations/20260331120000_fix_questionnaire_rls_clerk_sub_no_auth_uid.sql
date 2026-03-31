-- Clerk JWT sub is "user_..." (text), not a UUID. auth.uid() coerces sub to uuid and throws 22P02
-- when RLS policies reference (auth.uid())::text alongside jwt claims.

DROP POLICY IF EXISTS "Users can view their own questionnaire responses" ON public.user_questionnaire_responses;
DROP POLICY IF EXISTS "Users can insert their own questionnaire responses" ON public.user_questionnaire_responses;
DROP POLICY IF EXISTS "Users can update their own questionnaire responses" ON public.user_questionnaire_responses;

CREATE POLICY "Users can view their own questionnaire responses" ON public.user_questionnaire_responses
  FOR SELECT TO authenticated
  USING (
    user_id = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'user_id' IS NOT NULL AND user_id = (auth.jwt() ->> 'user_id'))
  );

CREATE POLICY "Users can insert their own questionnaire responses" ON public.user_questionnaire_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'user_id' IS NOT NULL AND user_id = (auth.jwt() ->> 'user_id'))
  );

CREATE POLICY "Users can update their own questionnaire responses" ON public.user_questionnaire_responses
  FOR UPDATE TO authenticated
  USING (
    user_id = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'user_id' IS NOT NULL AND user_id = (auth.jwt() ->> 'user_id'))
  )
  WITH CHECK (
    user_id = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'user_id' IS NOT NULL AND user_id = (auth.jwt() ->> 'user_id'))
  );
