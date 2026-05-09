-- Ensure postgres_changes on public.messages works for Realtime Chat fallback sync.
-- Verified on hosted project via pg_publication_tables (messages present); repo migration 018 omitted this.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables pt
    WHERE pt.pubname = 'supabase_realtime'
      AND pt.schemaname = 'public'
      AND pt.tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
