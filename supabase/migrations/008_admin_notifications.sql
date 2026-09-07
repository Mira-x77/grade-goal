-- ============================================================
-- Admin Notifications
-- Allows admins to send in-app notifications to users.
-- Users see them in the bell/notification sheet on the home screen.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT 'all', -- 'all', 'apc', 'french', 'nigerian'
  icon        TEXT,                        -- optional emoji or icon name
  image_url   TEXT,                        -- optional image URL
  action_url  TEXT,                        -- optional deep link (e.g. /library/books)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ                  -- optional expiry, null = never expires
);

-- Track which users have read which notifications
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS admin_notifications_target_idx    ON public.admin_notifications(target);
CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notification_reads_user_id_idx    ON public.notification_reads(user_id);

-- RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads  ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read notifications
CREATE POLICY "admin_notifications: read all"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (
    expires_at IS NULL OR expires_at > now()
  );

-- Authenticated users can insert/update/delete notifications (admin panel)
CREATE POLICY "admin_notifications: insert"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_notifications: update"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_notifications: delete"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (true);

-- For anon read (app before login):
CREATE POLICY "admin_notifications: anon read"
  ON public.admin_notifications FOR SELECT
  TO anon
  USING (expires_at IS NULL OR expires_at > now());

-- notification_reads: users manage their own reads
CREATE POLICY "notification_reads: select own"
  ON public.notification_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_reads: insert own"
  ON public.notification_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT ON public.admin_notifications TO authenticated, anon;
GRANT SELECT, INSERT ON public.notification_reads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
