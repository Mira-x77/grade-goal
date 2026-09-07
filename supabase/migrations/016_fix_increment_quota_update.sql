-- Fix increment_download_with_quota when quota row was missing (UPDATE matched 0 rows)

CREATE OR REPLACE FUNCTION increment_download_with_quota(
  p_device_id TEXT,
  p_paper_id UUID DEFAULT NULL,
  p_book_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  downloads_used INTEGER,
  quota_limit INTEGER,
  has_premium BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_month TEXT;
  v_quota_record RECORD;
  v_premium_status RECORD;
BEGIN
  v_current_month := get_current_month_year();

  -- Ensures user_download_quotas row exists for this month
  PERFORM * FROM check_premium_status(p_device_id);

  SELECT * INTO v_premium_status
  FROM check_premium_status(p_device_id);

  IF NOT v_premium_status.can_download THEN
    RETURN QUERY SELECT
      false,
      'Download limit reached. Upgrade to premium for unlimited downloads.'::TEXT,
      v_premium_status.downloads_used,
      v_premium_status.quota_limit,
      v_premium_status.has_premium;
    RETURN;
  END IF;

  IF p_paper_id IS NOT NULL THEN
    UPDATE public.exam_papers SET downloads = downloads + 1 WHERE id = p_paper_id;
  END IF;

  IF p_book_id IS NOT NULL THEN
    UPDATE public.library_books SET downloads = downloads + 1 WHERE id = p_book_id;
  END IF;

  UPDATE user_download_quotas
  SET downloads_used = downloads_used + 1, updated_at = now()
  WHERE device_id = p_device_id AND month_year = v_current_month;

  IF NOT FOUND THEN
    INSERT INTO user_download_quotas (
      user_id, device_id, month_year, downloads_used, quota_limit, is_premium, premium_expires_at
    ) VALUES (
      auth.uid(), p_device_id, v_current_month, 1,
      CASE WHEN v_premium_status.has_premium THEN 999999 ELSE 5 END,
      v_premium_status.has_premium,
      v_premium_status.expires_at
    );
  END IF;

  SELECT downloads_used, quota_limit, is_premium
  INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;

  RETURN QUERY SELECT
    true,
    'Download successful'::TEXT,
    COALESCE(v_quota_record.downloads_used, 1),
    COALESCE(v_quota_record.quota_limit, 5),
    COALESCE(v_quota_record.is_premium, false);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_download_with_quota(TEXT, UUID, UUID) TO authenticated, anon;
