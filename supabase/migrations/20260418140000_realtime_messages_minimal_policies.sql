-- Minimal Realtime authorization for private channels (broadcast + presence).
-- Requires JWT role `authenticated` (Clerk third-party auth / Supabase templates).
-- Tighten with realtime.topic() + membership checks when product rules require it.
-- Dashboard: Realtime → Settings → disable "Allow public access" to enforce private channels.

DROP POLICY IF EXISTS "realtime_messages_authenticated_select_minimal" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_messages_authenticated_insert_minimal" ON realtime.messages;

CREATE POLICY "realtime_messages_authenticated_select_minimal"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "realtime_messages_authenticated_insert_minimal"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
