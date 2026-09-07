-- ═══════════════════════════════════════════════════════════════════════════
-- CRITICAL: Run this to fix download tracking system
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_download_quota_status(TEXT);
DROP FUNCTION IF EXISTS increment_download_count(TEXT, UUID, UUID, UUID);

-- Create download quota status function
CREATE OR REPLACE FUNCTION get_download_quota_status(p_device_id TEXT)
RETURNS TABLE (
  downloads_used INT,
  downloads_limit INT,
  is_premium BOOLEAN,
  premium_expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_premium_record RECORD;
  v_current_month TEXT;
  v_download_count INT;
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COUNT(*)::INT INTO v_download_count
  FROM download_tracking
  WHERE device_id = p_device_id
    AND TO_CHAR(downloaded_at, 'YYYY-MM') = v_current_month;
  
  SELECT 
    sc.device_id,
    sc.activated_at,
    sc.duration_months,
    (sc.activated_at + (sc.duration_months || ' months')::INTERVAL) AS expires_at
  INTO v_premium_record
  FROM subscription_codes sc
  WHERE sc.device_id = p_device_id
    AND sc.is_used = TRUE
    AND (sc.activated_at + (sc.duration_months || ' months')::INTERVAL) > NOW()
  ORDER BY sc.activated_at DESC
  LIMIT 1;
  
  IF v_premium_record.device_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_download_count,
      -1,
      TRUE,
      v_premium_record.expires_at;
  ELSE
    RETURN QUERY SELECT 
      v_download_count,
      5,
      FALSE,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create increment download function
CREATE OR REPLACE FUNCTION increment_download_count(
  p_device_id TEXT,
  p_user_id UUID,
  p_paper_id UUID DEFAULT NULL,
  p_book_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota RECORD;
BEGIN
  SELECT * INTO v_quota
  FROM get_download_quota_status(p_device_id);
  
  IF NOT v_quota.is_premium AND v_quota.downloads_used >= v_quota.downloads_limit THEN
    RAISE EXCEPTION 'Download limit reached. Upgrade to premium for unlimited downloads.';
  END IF;
  
  INSERT INTO download_tracking (
    device_id,
    user_id,
    paper_id,
    book_id,
    downloaded_at
  ) VALUES (
    p_device_id,
    p_user_id,
    p_paper_id,
    p_book_id,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_download_quota_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_download_count(TEXT, UUID, UUID, UUID) TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Download tracking system fixed!';
END $$;
