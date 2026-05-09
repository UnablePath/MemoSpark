-- Deterministic connection RPCs used by StudentDiscovery.
-- These are SECURITY INVOKER functions and rely on existing table policies.

CREATE OR REPLACE FUNCTION public.create_or_accept_connection(actor_id text, other_id text)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  existing_row public.connections%ROWTYPE;
  reverse_row public.connections%ROWTYPE;
BEGIN
  IF actor_id IS NULL OR other_id IS NULL OR actor_id = '' OR other_id = '' OR actor_id = other_id THEN
    RAISE EXCEPTION 'Invalid actor_id/other_id';
  END IF;

  SELECT *
  INTO existing_row
  FROM public.connections
  WHERE requester_id = actor_id AND receiver_id = other_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_row.id IS NOT NULL THEN
    RETURN QUERY SELECT existing_row.id, existing_row.status;
    RETURN;
  END IF;

  SELECT *
  INTO reverse_row
  FROM public.connections
  WHERE requester_id = other_id AND receiver_id = actor_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF reverse_row.id IS NOT NULL THEN
    UPDATE public.connections
    SET status = 'accepted', updated_at = now()
    WHERE id = reverse_row.id;
    RETURN QUERY SELECT reverse_row.id, 'accepted'::text;
    RETURN;
  END IF;

  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (actor_id, other_id, 'pending')
  RETURNING connections.id, connections.status
  INTO id, status;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_connection(actor_id text, other_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  affected integer := 0;
BEGIN
  IF actor_id IS NULL OR other_id IS NULL OR actor_id = '' OR other_id = '' OR actor_id = other_id THEN
    RETURN false;
  END IF;

  DELETE FROM public.connections
  WHERE status = 'accepted'
    AND (
      (requester_id = actor_id AND receiver_id = other_id)
      OR
      (requester_id = other_id AND receiver_id = actor_id)
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_user(actor_id text, other_id text)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  rel public.connections%ROWTYPE;
BEGIN
  IF actor_id IS NULL OR other_id IS NULL OR actor_id = '' OR other_id = '' OR actor_id = other_id THEN
    RAISE EXCEPTION 'Invalid actor_id/other_id';
  END IF;

  SELECT *
  INTO rel
  FROM public.connections
  WHERE (requester_id = actor_id AND receiver_id = other_id)
     OR (requester_id = other_id AND receiver_id = actor_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF rel.id IS NOT NULL THEN
    UPDATE public.connections
    SET requester_id = actor_id,
        receiver_id = other_id,
        status = 'blocked',
        updated_at = now()
    WHERE id = rel.id;
    RETURN QUERY SELECT rel.id, 'blocked'::text;
    RETURN;
  END IF;

  INSERT INTO public.connections (requester_id, receiver_id, status)
  VALUES (actor_id, other_id, 'blocked')
  RETURNING connections.id, connections.status
  INTO id, status;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(actor_id text, other_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  affected integer := 0;
BEGIN
  IF actor_id IS NULL OR other_id IS NULL OR actor_id = '' OR other_id = '' OR actor_id = other_id THEN
    RETURN false;
  END IF;

  DELETE FROM public.connections
  WHERE requester_id = actor_id
    AND receiver_id = other_id
    AND status = 'blocked';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_accept_connection(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_connection(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(text, text) TO authenticated;
