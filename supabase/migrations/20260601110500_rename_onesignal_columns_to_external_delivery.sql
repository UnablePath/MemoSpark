-- Rename legacy provider columns so MemoSpark notification code stays OneSignal-string-free.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_analytics'
      AND column_name = 'onesignal_notification_id'
  ) THEN
    ALTER TABLE public.notification_analytics
      RENAME COLUMN onesignal_notification_id TO external_delivery_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_queue'
      AND column_name = 'onesignal_notification_id'
  ) THEN
    ALTER TABLE public.notification_queue
      RENAME COLUMN onesignal_notification_id TO external_delivery_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'smart_reminder_queue'
      AND column_name = 'onesignal_notification_id'
  ) THEN
    ALTER TABLE public.smart_reminder_queue
      RENAME COLUMN onesignal_notification_id TO external_delivery_id;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_notification_queue_onesignal_id;
CREATE INDEX IF NOT EXISTS idx_notification_queue_external_delivery_id
  ON public.notification_queue (external_delivery_id);
