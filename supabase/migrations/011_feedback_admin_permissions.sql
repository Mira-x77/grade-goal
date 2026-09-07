-- ============================================================
-- Feedback Admin Permissions Fix
-- Ensures admins can delete any feedback while users can delete their own
-- ============================================================

-- Drop existing policies to recreate them with proper admin permissions
DROP POLICY IF EXISTS "delete own feedback" ON public.feedback;
DROP POLICY IF EXISTS "admin update status" ON public.feedback;

-- Allow users to delete their own feedback OR admins to delete any feedback
CREATE POLICY "delete feedback" ON public.feedback
  FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Allow admins to update feedback status and other fields
CREATE POLICY "admin update feedback" ON public.feedback
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Grant necessary permissions for admin operations
GRANT DELETE ON public.feedback TO authenticated;
GRANT UPDATE ON public.feedback TO authenticated;

-- Comments
COMMENT ON POLICY "delete feedback" ON public.feedback IS 'Users can delete their own feedback, admins can delete any feedback';
COMMENT ON POLICY "admin update feedback" ON public.feedback IS 'Admins can update feedback status and other fields';