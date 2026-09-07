-- Fix download quota function to work with current schema
-- Run this in Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_download_quota_status(text);

-- Create or replace the download quota status function
CREATE OR REPLACE FUNCTION get_download_quota_status(p_device_id TEXT)
RETURNS TABLE (
  downloads_used INT,
  quota_limit INT,
  has_premium BOOLEAN,
  can_download BOOLEAN,
  month_year TEXT
) AS $$
DECLARE
  v_downloads_used INT := 0;
  v_quota_limit INT := 5;
  v_has_premium BOOLEAN := FALSE;
  v_month_year TEXT;
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

  -- Get downloads used this month
  SELECT COALESCE(COUNT(*), 0)
  INTO v_downloads_used
  FROM download_tracking
  WHERE device_id = p_device_id
    AND TO_CHAR(downloaded_at, 'YYYY-MM') = v_month_year;

  -- Premium users have unlimited downloads (can_download always true)
  RETURN QUERY SELECT 
    v_downloads_used,
    v_quota_limit,
    v_has_premium,
    CASE 
      WHEN v_has_premium THEN TRUE
      ELSE v_downloads_used < v_quota_limit
    END,
    v_month_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_download_quota_status(TEXT) TO anon, authenticated;

-- Comment
COMMENT ON FUNCTION get_download_quota_status IS 'Get download quota status for a device. Returns downloads used, limit, premium status, and whether more downloads are allowed.';
