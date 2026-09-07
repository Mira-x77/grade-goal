-- ============================================================
-- User Downloads Cloud Sync
-- Tracks which papers a user has downloaded across devices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id      TEXT NOT NULL,
  paper_title   TEXT NOT NULL,
  paper_subject TEXT NOT NULL DEFAULT '',
  class_level   TEXT NOT NULL DEFAULT '',
  year          INTEGER,
  exam_type     TEXT,
  file_size     BIGINT NOT NULL DEFAULT 0,
  preview_url   TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ, -- soft delete: null = active, set = removed
  UNIQUE (user_id, paper_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_downloads_user_id_idx ON public.user_downloads(user_id);
CREATE INDEX IF NOT EXISTS user_downloads_paper_id_idx ON public.user_downloads(paper_id);
CREATE INDEX IF NOT EXISTS user_downloads_deleted_at_idx ON public.user_downloads(deleted_at);

-- RLS
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_downloads: select own"
  ON public.user_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_downloads: insert own"
  ON public.user_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_downloads: update own"
  ON public.user_downloads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_downloads: delete own"
  ON public.user_downloads FOR DELETE
  USING (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_downloads TO authenticated;
