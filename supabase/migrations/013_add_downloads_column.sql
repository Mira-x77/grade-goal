-- ============================================================
-- Add downloads column to exam_papers if it doesn't exist
-- ============================================================

-- Add downloads column to exam_papers table
ALTER TABLE public.exam_papers 
ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.exam_papers.downloads IS 'Number of times this paper has been downloaded';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exam_papers_downloads ON public.exam_papers(downloads DESC);

-- Verify library_books also has downloads column (should already exist from migration 007)
ALTER TABLE public.library_books 
ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.library_books.downloads IS 'Number of times this book has been downloaded';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_library_books_downloads ON public.library_books(downloads DESC);
