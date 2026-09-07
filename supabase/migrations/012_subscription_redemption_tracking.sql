-- Track richer redemption metadata on subscription codes

ALTER TABLE subscription_codes
  ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grading_system TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS code_source TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_codes_redeemed_by ON subscription_codes(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code_source ON subscription_codes(code_source);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_school ON subscription_codes(school);

-- Drop old function signatures
DROP FUNCTION IF EXISTS use_subscription_code(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION use_subscription_code(
  p_code VARCHAR(14),
  p_device_id VARCHAR(255),
  p_user_id UUID DEFAULT NULL,
  p_grading_system TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL,
  p_code_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  duration_months INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_code_record
  FROM subscription_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid code'::TEXT, NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF v_code_record.is_used THEN
    RETURN QUERY SELECT FALSE, 'Code already used'::TEXT, NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  v_expiry := NOW() + (v_code_record.duration_months || ' months')::INTERVAL;

  UPDATE subscription_codes
  SET
    is_used = TRUE,
    used_by = COALESCE(p_device_id, used_by),
    used_at = NOW(),
    redeemed_by = p_user_id,
    grading_system = p_grading_system,
    school = p_school,
    code_source = p_code_source
  WHERE id = v_code_record.id;

  UPDATE subscription_analytics
  SET
    total_codes_used = total_codes_used + 1,
    active_premium_users = active_premium_users + 1,
    last_updated = NOW()
  WHERE id = 'main';

  RETURN QUERY SELECT
    TRUE,
    'Premium activated successfully!'::TEXT,
    v_code_record.duration_months,
    v_expiry;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION use_subscription_code(VARCHAR, VARCHAR, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
