-- ============================================================
-- Courses System
-- Allows admins to post course flyers/announcements
-- Users can browse available online courses
-- ============================================================

-- Course posts table
CREATE TABLE IF NOT EXISTS public.course_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor  TEXT,                        -- Course instructor name
  price       TEXT,                        -- Price (can be "Free", "$99", etc.)
  duration    TEXT,                        -- Duration (e.g., "4 weeks", "Self-paced")
  level       TEXT DEFAULT 'Beginner',     -- Beginner, Intermediate, Advanced
  category    TEXT DEFAULT 'General',      -- Math, Science, Languages, etc.
  image_url   TEXT,                        -- Course flyer/poster image
  link_url    TEXT,                        -- Registration/course link
  is_featured BOOLEAN DEFAULT false,       -- Featured courses
  is_active   BOOLEAN DEFAULT true,        -- Active/inactive
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ                  -- Optional expiry date
);

-- Track which users have viewed which courses (for analytics)
CREATE TABLE IF NOT EXISTS public.course_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.course_posts(id) ON DELETE CASCADE,
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS course_posts_category_idx     ON public.course_posts(category);
CREATE INDEX IF NOT EXISTS course_posts_level_idx       ON public.course_posts(level);
CREATE INDEX IF NOT EXISTS course_posts_featured_idx    ON public.course_posts(is_featured DESC);
CREATE INDEX IF NOT EXISTS course_posts_created_at_idx  ON public.course_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS course_posts_active_idx      ON public.course_posts(is_active);
CREATE INDEX IF NOT EXISTS course_views_user_id_idx     ON public.course_views(user_id);
CREATE INDEX IF NOT EXISTS course_views_course_id_idx   ON public.course_views(course_id);

-- RLS
ALTER TABLE public.course_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_views ENABLE ROW LEVEL SECURITY;

-- All users can read active courses
CREATE POLICY "course_posts: read active"
  ON public.course_posts FOR SELECT
  TO authenticated, anon
  USING (
    is_active = true AND 
    (expires_at IS NULL OR expires_at > now())
  );

-- Authenticated users can insert/update/delete courses (admin panel)
CREATE POLICY "course_posts: insert"
  ON public.course_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "course_posts: update"
  ON public.course_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "course_posts: delete"
  ON public.course_posts FOR DELETE
  TO authenticated
  USING (true);

-- course_views: users manage their own views
CREATE POLICY "course_views: select own"
  ON public.course_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "course_views: insert own"
  ON public.course_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT ON public.course_posts TO authenticated, anon;
GRANT SELECT, INSERT ON public.course_views TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_posts TO authenticated;

-- Comments
COMMENT ON TABLE public.course_posts IS 'Course announcements and flyers posted by admins';
COMMENT ON TABLE public.course_views IS 'Track which users have viewed which courses';
COMMENT ON COLUMN public.course_posts.image_url IS 'Course flyer/poster image URL';
COMMENT ON COLUMN public.course_posts.link_url IS 'Registration or course access link';
COMMENT ON COLUMN public.course_posts.is_featured IS 'Featured courses appear at the top';