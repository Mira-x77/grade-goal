-- ============================================================
-- Exam Papers Library System
-- Core table for storing exam paper metadata and files
-- ============================================================

-- Create exam_papers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  year INTEGER NOT NULL,
  exam_type TEXT NOT NULL,
  session TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_size_formatted TEXT,
  content_hash TEXT,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  preview_url TEXT,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_papers_class_level ON public.exam_papers(class_level);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON public.exam_papers(subject);
CREATE INDEX IF NOT EXISTS idx_exam_papers_year ON public.exam_papers(year DESC);
CREATE INDEX IF NOT EXISTS idx_exam_papers_created_at ON public.exam_papers(created_at DESC);

-- Enable RLS
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to read all papers
CREATE POLICY IF NOT EXISTS "exam_papers: public read"
  ON public.exam_papers FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated users to insert papers (admin functionality)
CREATE POLICY IF NOT EXISTS "exam_papers: authenticated insert"
  ON public.exam_papers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update papers (admin functionality)
CREATE POLICY IF NOT EXISTS "exam_papers: authenticated update"
  ON public.exam_papers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete papers (admin functionality)
CREATE POLICY IF NOT EXISTS "exam_papers: authenticated delete"
  ON public.exam_papers FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for exam papers if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-papers', 'exam-papers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exam-papers bucket
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "exam_papers: public read storage" ON storage.objects;
  DROP POLICY IF EXISTS "exam_papers: authenticated upload storage" ON storage.objects;
  DROP POLICY IF EXISTS "exam_papers: authenticated delete storage" ON storage.objects;
END$$;

-- Allow anyone to view exam paper files
CREATE POLICY "exam_papers: public read storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exam-papers');

-- Allow authenticated users to upload exam papers
CREATE POLICY "exam_papers: authenticated upload storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exam-papers');

-- Allow authenticated users to delete exam papers
CREATE POLICY "exam_papers: authenticated delete storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'exam-papers');

-- RPC function to increment downloads count
CREATE OR REPLACE FUNCTION public.increment_downloads(paper_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.exam_papers
  SET downloads = downloads + 1
  WHERE id = paper_id;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.exam_papers TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.exam_papers TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.exam_papers IS 'Stores metadata for exam papers available in the library';
COMMENT ON COLUMN public.exam_papers.class_level IS 'Student class level (e.g., Troisième, 1ère, Tle)';
COMMENT ON COLUMN public.exam_papers.exam_type IS 'Type of exam (e.g., BEPC, Probatoire, Baccalauréat)';
COMMENT ON COLUMN public.exam_papers.session IS 'Exam session or term';
COMMENT ON COLUMN public.exam_papers.file_url IS 'Public URL to the PDF file in storage';
COMMENT ON COLUMN public.exam_papers.preview_url IS 'Optional preview image URL';
COMMENT ON COLUMN public.exam_papers.downloads IS 'Number of times this paper has been downloaded';
