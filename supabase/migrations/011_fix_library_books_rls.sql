-- ============================================================
-- Fix Library Books RLS Policies
-- Add missing INSERT policy for authenticated users (admins)
-- ============================================================

-- Add INSERT policy for authenticated users (admin panel)
CREATE POLICY "library_books: admin insert"
  ON public.library_books FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for authenticated users (admin panel)
CREATE POLICY "library_books: admin update"
  ON public.library_books FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for authenticated users (admin panel)
CREATE POLICY "library_books: admin delete"
  ON public.library_books FOR DELETE
  TO authenticated
  USING (true);