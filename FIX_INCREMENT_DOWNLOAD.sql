-- Fix increment download with quota function
-- Run this in Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS increment_download_with_quota(text, uuid, uuid, text, text);

-- Create or replace the increment download function
CREATE OR REPLACE FUNCTION increment_download_with_quota(
  p_device_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_paper_id UUID DEFAULT NULL,
  p_book_id UUID DEFAULT NULL,
  p_grading_system TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL
)
RETURNS TABLE (
  downloads_used INT,
  quota_limit INT,
  has_premium BOOLEAN,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_downloads_used INT := 0;
  v_quota_limit INT := 5;
  v_has_premium BOOLEAN := FALSE;
  v_month_year TEXT;
  v_can_download BOOLEAN;
BEGIN
  -- Get current month/year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Check if device has active premium subscription
  SELECT EXISTS (
    SELECT 1 
    FROM subscription_codes sc
    WHERE sc.is_used = TRUE
      AND sc.used_by->>'device_id' = p_device_id
      AND (sc.used_at + (sc.duration_months || ' months')::INTERVAL) > NOW()
  ) INTO v_has_premium;

  -- Get current downloads this month
  SELECT COALESCE(COUNT(*), 0)
  INTO v_downloads_used
  FROM download_tracking
  WHERE device_id = p_device_id
    AND TO_CHAR(downloaded_at, 'YYYY-MM') = v_month_year;

  -- Check if can download
  v_can_download := v_has_premium OR v_downloads_used < v_quota_limit;

  IF NOT v_can_download THEN
    -- Limit reached
    RETURN QUERY SELECT 
      v_downloads_used,
      v_quota_limit,
      v_has_premium,
      FALSE,
      'Download limit reached. Upgrade to premium for unlimited downloads.'::TEXT;
    RETURN;
  END IF;

  -- Insert download record
  INSERT INTO download_tracking (
    device_id,
    user_id,
    paper_id,
    book_id,
    grading_system,
    school,
    downloaded_at
  ) VALUES (
    p_device_id,
    p_user_id,
    p_paper_id,
    p_book_id,
    p_grading_system,
    p_school,
    NOW()
  );

  -- Update count
  v_downloads_used := v_downloads_used + 1;

  -- Return success
  RETURN QUERY SELECT 
    v_downloads_used,
    v_quota_limit,
    v_has_premium,
    TRUE,
    'Download tracked successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_download_with_quota(TEXT, UUID, UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- Comment
COMMENT ON FUNCTION increment_download_with_quota IS 'Track a download and check quota. Premium users have unlimited downloads. Free users limited to 5 per month.';
