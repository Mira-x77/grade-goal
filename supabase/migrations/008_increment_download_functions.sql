-- ============================================================
-- Download Count Increment Functions
-- Functions to safely increment download counts for papers and books
-- ============================================================

-- Function to increment paper download count
CREATE OR REPLACE FUNCTION increment_downloads(paper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.exam_papers 
  SET downloads = downloads + 1 
  WHERE id = paper_id;
END;
$$;

-- Function to increment book download count
CREATE OR REPLACE FUNCTION increment_book_downloads(book_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.library_books 
  SET downloads = downloads + 1 
  WHERE id = book_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_downloads(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_book_downloads(UUID) TO authenticated, anon;