-- Fix for the RPC function returning "Invalid Code" for real codes
-- Unauthenticated users (app users) don't have UPDATE permissions on the subscription_codes table.
-- By adding SECURITY DEFINER, the function runs with the privileges of the creator (postgres/admin), allowing the app to mark the code as used.

CREATE OR REPLACE FUNCTION use_subscription_code(
  p_code VARCHAR(14),
  p_device_id VARCHAR(255)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  duration_months INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER -- <--- CRITICAL FIX: Allows the anon role to update the table
AS $$
DECLARE
  v_code_record RECORD;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_code_record
  FROM subscription_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid code', NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if already used
  IF v_code_record.is_used THEN
    RETURN QUERY SELECT FALSE, 'Code already used', NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Calculate expiry date
  v_expiry := NOW() + (v_code_record.duration_months || ' months')::INTERVAL;

  -- Mark code as used
  UPDATE subscription_codes
  SET is_used = TRUE,
      used_by = p_device_id,
      used_at = NOW()
  WHERE code = p_code;

  -- Update analytics
  UPDATE subscription_analytics
  SET total_codes_used = total_codes_used + 1,
      active_premium_users = active_premium_users + 1,
      last_updated = NOW()
  WHERE id = 'main';

  -- Return success
  RETURN QUERY SELECT TRUE, 'Premium activated successfully!', v_code_record.duration_months, v_expiry;
END;
$$ LANGUAGE plpgsql;
