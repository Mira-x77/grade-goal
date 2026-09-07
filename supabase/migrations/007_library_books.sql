-- ============================================================
-- Library Books
-- Stores books (textbooks, study guides, reference material)
-- separate from exam papers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.library_books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  author            TEXT,
  subject           TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT 'General', -- e.g. Textbook, Study Guide, Reference
  system            TEXT NOT NULL DEFAULT 'all',     -- 'apc', 'french', 'english', 'all'
  class_level       TEXT,                            -- optional, can apply to all levels
  description       TEXT,
  cover_url         TEXT,                            -- cover image
  file_url          TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  file_size_formatted TEXT NOT NULL DEFAULT '',
  content_hash      TEXT NOT NULL DEFAULT '',
  tags              TEXT[] DEFAULT '{}',
  downloads         INTEGER NOT NULL DEFAULT 0,
  published_year    INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS library_books_system_idx   ON public.library_books(system);
CREATE INDEX IF NOT EXISTS library_books_subject_idx  ON public.library_books(subject);
CREATE INDEX IF NOT EXISTS library_books_category_idx ON public.library_books(category);

-- RLS — books are public read, admin write (no user_id needed)
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_books: public read"
  ON public.library_books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "library_books: anon read"
  ON public.library_books FOR SELECT
  TO anon
  USING (true);

-- Grants
GRANT SELECT ON public.library_books TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.library_books TO authenticated;

-- updated_at trigger
CREATE TRIGGER update_library_books_updated_at
  BEFORE UPDATE ON public.library_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
