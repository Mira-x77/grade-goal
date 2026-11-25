-- Premium starts when a code is redeemed, not when it was generated.
-- This is required for the app's premium download checks to agree with Supabase.

CREATE OR REPLACE FUNCTION check_premium_status(p_device_id TEXT)
RETURNS TABLE (
  has_premium BOOLEAN,
  expires_at TIMESTAMPTZ,
  downloads_used INTEGER,
  quota_limit INTEGER,
  can_download BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_month TEXT := get_current_month_year();
  v_quota_record RECORD;
  v_premium_active BOOLEAN := false;
  v_premium_expires TIMESTAMPTZ;
BEGIN
  SELECT true, sc.used_at + (sc.duration_months || ' months')::INTERVAL
  INTO v_premium_active, v_premium_expires
  FROM subscription_codes sc
  WHERE sc.is_used = true
    AND sc.used_at IS NOT NULL
    AND (sc.redeemed_by = auth.uid() OR sc.used_by = p_device_id)
    AND (sc.used_at + (sc.duration_months || ' months')::INTERVAL) > now()
  ORDER BY sc.used_at DESC
  LIMIT 1;

  v_premium_active := COALESCE(v_premium_active, false);

  SELECT * INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;

  IF NOT FOUND THEN
    INSERT INTO user_download_quotas (
      user_id, device_id, month_year, downloads_used, quota_limit, is_premium, premium_expires_at
    ) VALUES (
      auth.uid(), p_device_id, v_current_month, 0,
      CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
      v_premium_active, v_premium_expires
    ) RETURNING * INTO v_quota_record;
  ELSIF v_quota_record.is_premium IS DISTINCT FROM v_premium_active
     OR v_quota_record.premium_expires_at IS DISTINCT FROM v_premium_expires THEN
    UPDATE user_download_quotas
    SET is_premium = v_premium_active,
        quota_limit = CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
        premium_expires_at = v_premium_expires,
        updated_at = now()
    WHERE device_id = p_device_id AND month_year = v_current_month
    RETURNING * INTO v_quota_record;
  END IF;

  RETURN QUERY SELECT
    v_premium_active,
    v_premium_expires,
    v_quota_record.downloads_used,
    v_quota_record.quota_limit,
    v_premium_active OR v_quota_record.downloads_used < v_quota_record.quota_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION check_premium_status(TEXT) TO authenticated, anon;
