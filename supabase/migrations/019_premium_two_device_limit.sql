-- Premium follows the redeeming account, max 2 registered devices per code redemption.
-- Codes remain one-time use; expiry is based on used_at + duration (unchanged).

CREATE TABLE IF NOT EXISTS public.premium_device_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_code_id UUID NOT NULL REFERENCES public.subscription_codes(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_code_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_device_reg_user
  ON public.premium_device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_device_reg_device
  ON public.premium_device_registrations(device_id);
CREATE INDEX IF NOT EXISTS idx_premium_device_reg_expires
  ON public.premium_device_registrations(expires_at);

ALTER TABLE public.premium_device_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "premium_devices: select own"
  ON public.premium_device_registrations FOR SELECT
  USING (auth.uid() = user_id);

-- Backfill device slot #1 from existing redemptions
INSERT INTO public.premium_device_registrations (user_id, subscription_code_id, device_id, expires_at)
SELECT
  sc.redeemed_by,
  sc.id,
  sc.used_by,
  sc.used_at + (sc.duration_months || ' months')::INTERVAL
FROM public.subscription_codes sc
WHERE sc.is_used = true
  AND sc.redeemed_by IS NOT NULL
  AND sc.used_by IS NOT NULL
  AND sc.used_at IS NOT NULL
ON CONFLICT (subscription_code_id, device_id) DO NOTHING;

-- Resolve active subscription row for a user (latest non-expired redemption)
CREATE OR REPLACE FUNCTION get_active_premium_code(p_user_id UUID)
RETURNS TABLE (
  code_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sc.id,
    sc.used_at + (sc.duration_months || ' months')::INTERVAL AS expires_at
  FROM public.subscription_codes sc
  WHERE sc.redeemed_by = p_user_id
    AND sc.is_used = true
    AND sc.used_at IS NOT NULL
    AND (sc.used_at + (sc.duration_months || ' months')::INTERVAL) > now()
  ORDER BY sc.used_at DESC
  LIMIT 1;
$$;

-- Register current device for user's active premium (auto on login / redeem)
CREATE OR REPLACE FUNCTION sync_premium_device(p_device_id TEXT)
RETURNS TABLE (
  has_premium BOOLEAN,
  expires_at TIMESTAMPTZ,
  message TEXT,
  devices_registered INTEGER,
  devices_max INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_active RECORD;
  v_count INTEGER;
  v_max INTEGER := 2;
BEGIN
  devices_max := v_max;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Sign in to use premium'::TEXT, 0, v_max;
    RETURN;
  END IF;

  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Invalid device'::TEXT, 0, v_max;
    RETURN;
  END IF;

  SELECT * INTO v_active FROM get_active_premium_code(v_user_id);
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'No active premium subscription'::TEXT, 0, v_max;
    RETURN;
  END IF;

  expires_at := v_active.expires_at;

  IF EXISTS (
    SELECT 1 FROM public.premium_device_registrations pdr
    WHERE pdr.subscription_code_id = v_active.code_id
      AND pdr.device_id = p_device_id
      AND pdr.expires_at > now()
  ) THEN
    SELECT count(*)::INTEGER INTO devices_registered
    FROM public.premium_device_registrations pdr
    WHERE pdr.subscription_code_id = v_active.code_id
      AND pdr.expires_at > now();

    RETURN QUERY SELECT true, v_active.expires_at, 'Premium active on this device'::TEXT, devices_registered, v_max;
    RETURN;
  END IF;

  SELECT count(*)::INTEGER INTO v_count
  FROM public.premium_device_registrations pdr
  WHERE pdr.subscription_code_id = v_active.code_id
    AND pdr.expires_at > now();

  devices_registered := v_count;

  IF v_count >= v_max THEN
    RETURN QUERY SELECT false, v_active.expires_at,
      'Premium is already active on 2 devices. This device cannot be added.'::TEXT,
      v_count, v_max;
    RETURN;
  END IF;

  INSERT INTO public.premium_device_registrations (
    user_id, subscription_code_id, device_id, expires_at
  ) VALUES (
    v_user_id, v_active.code_id, p_device_id, v_active.expires_at
  )
  ON CONFLICT (subscription_code_id, device_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at;

  devices_registered := v_count + 1;
  RETURN QUERY SELECT true, v_active.expires_at, 'Premium registered on this device'::TEXT, devices_registered, v_max;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_premium_device(TEXT) TO authenticated, anon;

-- Account + device premium check (replaces device-only OR user-only logic)
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
  v_sync RECORD;
BEGIN
  SELECT * INTO v_sync FROM sync_premium_device(p_device_id);
  v_premium_active := COALESCE(v_sync.has_premium, false);
  v_premium_expires := v_sync.expires_at;

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

-- Code redemption: bind to account + register first device
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
  v_user_id     UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE, 'Please sign in to activate premium on your account'::TEXT,
      NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN QUERY SELECT
      FALSE, 'Device identification required'::TEXT,
      NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

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
    is_used        = TRUE,
    used_by        = p_device_id,
    used_at        = NOW(),
    redeemed_by    = v_user_id,
    grading_system = p_grading_system,
    school         = p_school,
    code_source    = p_code_source
  WHERE id = v_code_record.id;

  INSERT INTO public.premium_device_registrations (
    user_id, subscription_code_id, device_id, expires_at
  ) VALUES (
    v_user_id, v_code_record.id, p_device_id, v_expiry
  )
  ON CONFLICT (subscription_code_id, device_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at;

  BEGIN
    UPDATE subscription_analytics
    SET
      total_codes_used     = total_codes_used + 1,
      active_premium_users = active_premium_users + 1,
      last_updated         = NOW()
    WHERE id = 'main';
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN QUERY SELECT TRUE, 'Premium activated successfully!'::TEXT, v_code_record.duration_months, v_expiry;
END;
$$;

GRANT EXECUTE ON FUNCTION use_subscription_code(VARCHAR, VARCHAR, UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;
