-- Drop the legacy overload of create_group_chat_atomic that lacks the
-- dedupe-by-study-group logic.
--
-- Two overloads with the same parameter names (only differing in argument
-- ordering) made every named-argument supabase-js .rpc() call ambiguous —
-- Postgres errored ("function is not unique"), which surfaced in the client
-- as `[MessagingService] createGroupConversation failed`. That same
-- ambiguity also broke chat autoload on group open: the dedup branch in the
-- newer overload returns the existing conversation_id when a study group
-- already has a chat, but it was never being executed because the call
-- failed at resolution time.
--
-- Drop the older overload: (p_name text, p_user_id text, p_study_group_id uuid,
--                            p_metadata jsonb, p_description text)
-- Keep the newer one:        (p_name text, p_user_id text, p_description text,
--                            p_metadata jsonb, p_study_group_id uuid)

DROP FUNCTION IF EXISTS public.create_group_chat_atomic(text, text, uuid, jsonb, text);
