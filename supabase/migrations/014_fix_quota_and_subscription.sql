-- ============================================================
-- Prerequisite: redemption columns on subscription_codes (from 012)
-- ============================================================

ALTER TABLE subscription_codes
  ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grading_system TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS code_source TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_codes_redeemed_by ON subscription_codes(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code_source ON subscription_codes(code_source);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_school ON subscription_codes(school);

-- ============================================================
-- Fix 1: check_premium_status — null is_premium constraint violation
--
-- When no subscription_codes row matches, PostgreSQL leaves
-- v_premium_active as NULL (overrides the := false initializer).
-- The subsequent INSERT then passes NULL for is_premium, which
-- violates the NOT NULL constraint on user_download_quotas.
--
-- Fix: wrap every use of v_premium_active with COALESCE(..., false)
-- AND re-initialize it explicitly after the SELECT INTO.
-- ============================================================

CREATE OR REPLACE FUNCTION check_premium_status(p_device_id TEXT)
RETURNS TABLE (
  has_premium   BOOLEAN,
  expires_at    TIMESTAMPTZ,
  downloads_used INTEGER,
  quota_limit   INTEGER,
  can_download  BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_month   TEXT;
  v_quota_record    RECORD;
  v_premium_active  BOOLEAN;   -- intentionally no default here
  v_premium_expires TIMESTAMPTZ;
BEGIN
  v_current_month := get_current_month_year();

  -- Check for an active premium subscription via subscription codes.
  -- If no row matches, v_premium_active stays NULL — we fix that below.
  SELECT
    CASE
      WHEN sc.is_used
        AND sc.used_by = p_device_id
        AND (sc.created_at + (sc.duration_months || ' months')::INTERVAL) > now()
      THEN true
      ELSE false
    END,
    sc.created_at + (sc.duration_months || ' months')::INTERVAL
  INTO v_premium_active, v_premium_expires
  FROM subscription_codes sc
  WHERE sc.used_by = p_device_id
    AND sc.is_used = true
    AND (sc.created_at + (sc.duration_months || ' months')::INTERVAL) > now()
  ORDER BY sc.created_at DESC
  LIMIT 1;

  -- *** THE FIX: if no row was found, SELECT INTO leaves v_premium_active NULL ***
  v_premium_active := COALESCE(v_premium_active, false);

  -- Get or create quota record for current month
  SELECT * INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;

  IF NOT FOUND THEN
    INSERT INTO user_download_quotas (
      user_id, device_id, month_year, downloads_used,
      quota_limit, is_premium, premium_expires_at
    ) VALUES (
      auth.uid(),
      p_device_id,
      v_current_month,
      0,
      CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
      v_premium_active,   -- now guaranteed non-null
      v_premium_expires
    )
    RETURNING * INTO v_quota_record;
  ELSE
    -- Update premium status if it changed
    IF v_quota_record.is_premium != v_premium_active THEN
      UPDATE user_download_quotas
      SET
        is_premium         = v_premium_active,
        quota_limit        = CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
        premium_expires_at = v_premium_expires,
        updated_at         = now()
      WHERE device_id = p_device_id AND month_year = v_current_month
      RETURNING * INTO v_quota_record;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_premium_active                                          AS has_premium,
    v_premium_expires                                         AS expires_at,
    v_quota_record.downloads_used                             AS downloads_used,
    v_quota_record.quota_limit                                AS quota_limit,
    (v_quota_record.downloads_used < v_quota_record.quota_limit) AS can_download;
END;
$$;

GRANT EXECUTE ON FUNCTION check_premium_status(TEXT) TO authenticated, anon;


-- ============================================================
-- Fix 2: use_subscription_code — restore the 6-parameter signature
--
-- fix-rpc.sql was applied after migration 012 and replaced the
-- 6-param function with a 2-param version.  The client always
-- calls with 6 params (p_code, p_device_id, p_user_id,
-- p_grading_system, p_school, p_code_source), so Supabase
-- returns 404 "no matches found in the schema cache".
--
-- This restores the full 6-param SECURITY DEFINER version.
-- ============================================================

-- Drop the 2-param stub left by fix-rpc.sql
DROP FUNCTION IF EXISTS use_subscription_code(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION use_subscription_code(
  p_code           VARCHAR(14),
  p_device_id      VARCHAR(255),
  p_user_id        UUID    DEFAULT NULL,
  p_grading_system TEXT    DEFAULT NULL,
  p_school         TEXT    DEFAULT NULL,
  p_code_source    TEXT    DEFAULT NULL
)
RETURNS TABLE (
  success         BOOLEAN,
  message         TEXT,
  duration_months INTEGER,
  expires_at      TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_code_record RECORD;
  v_expiry      TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_code_record
  FROM subscription_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE, 'Invalid code'::TEXT,
      NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF v_code_record.is_used THEN
    RETURN QUERY SELECT
      FALSE, 'Code already used'::TEXT,
      NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  v_expiry := NOW() + (v_code_record.duration_months || ' months')::INTERVAL;

  UPDATE subscription_codes
  SET
    is_used        = TRUE,
    used_by        = COALESCE(p_device_id, used_by),
    used_at        = NOW(),
    redeemed_by    = p_user_id,
    grading_system = p_grading_system,
    school         = p_school,
    code_source    = p_code_source
  WHERE id = v_code_record.id;

  -- Update analytics (ignore if analytics table doesn't exist)
  BEGIN
    UPDATE subscription_analytics
    SET
      total_codes_used    = total_codes_used + 1,
      active_premium_users = active_premium_users + 1,
      last_updated        = NOW()
    WHERE id = 'main';
  EXCEPTION WHEN undefined_table THEN
    NULL; -- analytics table optional
  END;

  RETURN QUERY SELECT
    TRUE,
    'Premium activated successfully!'::TEXT,
    v_code_record.duration_months,
    v_expiry;
END;
$$;

GRANT EXECUTE ON FUNCTION use_subscription_code(VARCHAR, VARCHAR, UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;
