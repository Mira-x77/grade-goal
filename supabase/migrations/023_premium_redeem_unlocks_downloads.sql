-- One paid code must unlock premium on the redeeming device.
-- Retrying the same (or a second) code must not swallow cash:
--   * already-used by this account + still valid => restore, do not error
--   * already has active premium => return that expiry, do not consume a new code
-- Download quota follows used_at (redemption), not created_at (code generation).
--
-- DROP first: Postgres will not change OUT/RETURNS TABLE of an existing function.
-- CASCADE is required: leftover overloads and dependent RPCs block CREATE.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_download_quota_status',
        'check_premium_status',
        'sync_premium_device',
        'get_active_premium_code',
        'use_subscription_code',
        'increment_download_with_quota'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.premium_device_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_code_id UUID NOT NULL REFERENCES public.subscription_codes(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_code_id, device_id)
);

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
  WHERE sc.is_used = true
    AND sc.used_at IS NOT NULL
    AND sc.redeemed_by = p_user_id
    AND (sc.used_at + (sc.duration_months || ' months')::INTERVAL) > now()
  ORDER BY sc.used_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_active_premium_code(UUID) TO authenticated, anon;

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
  v_code_id UUID;
  v_expires TIMESTAMPTZ;
  v_count INTEGER;
  v_max INTEGER := 2;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Sign in to use premium'::TEXT, 0, v_max;
    RETURN;
  END IF;

  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Invalid device'::TEXT, 0, v_max;
    RETURN;
  END IF;

  SELECT g.code_id, g.expires_at
    INTO v_code_id, v_expires
  FROM get_active_premium_code(v_user_id) g;

  IF v_code_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'No active premium subscription'::TEXT, 0, v_max;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.premium_device_registrations pdr
    WHERE pdr.subscription_code_id = v_code_id
      AND pdr.device_id = p_device_id
      AND pdr.expires_at > now()
  ) THEN
    SELECT count(*)::INTEGER INTO v_count
    FROM public.premium_device_registrations pdr
    WHERE pdr.subscription_code_id = v_code_id
      AND pdr.expires_at > now();
    RETURN QUERY SELECT true, v_expires, 'Premium active on this device'::TEXT, v_count, v_max;
    RETURN;
  END IF;

  -- Redeeming device is always allowed (used_by on the active code).
  IF EXISTS (
    SELECT 1 FROM public.subscription_codes sc
    WHERE sc.id = v_code_id AND sc.used_by = p_device_id
  ) THEN
    INSERT INTO public.premium_device_registrations (
      user_id, subscription_code_id, device_id, expires_at
    ) VALUES (
      v_user_id, v_code_id, p_device_id, v_expires
    )
    ON CONFLICT (subscription_code_id, device_id) DO UPDATE
      SET expires_at = EXCLUDED.expires_at;
    SELECT count(*)::INTEGER INTO v_count
    FROM public.premium_device_registrations pdr
    WHERE pdr.subscription_code_id = v_code_id
      AND pdr.expires_at > now();
    RETURN QUERY SELECT true, v_expires, 'Premium registered on this device'::TEXT, v_count, v_max;
    RETURN;
  END IF;

  SELECT count(*)::INTEGER INTO v_count
  FROM public.premium_device_registrations pdr
  WHERE pdr.subscription_code_id = v_code_id
    AND pdr.expires_at > now();

  IF v_count >= v_max THEN
    RETURN QUERY SELECT false, v_expires,
      'Premium is already active on 2 devices. This device cannot be added.'::TEXT,
      v_count, v_max;
    RETURN;
  END IF;

  INSERT INTO public.premium_device_registrations (
    user_id, subscription_code_id, device_id, expires_at
  ) VALUES (
    v_user_id, v_code_id, p_device_id, v_expires
  )
  ON CONFLICT (subscription_code_id, device_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at;

  RETURN QUERY SELECT true, v_expires, 'Premium registered on this device'::TEXT, v_count + 1, v_max;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_premium_device(TEXT) TO authenticated, anon;

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

  -- Redeeming device always gets paid access even if device-slot sync lagged.
  IF NOT v_premium_active THEN
    SELECT true, sc.used_at + (sc.duration_months || ' months')::INTERVAL
      INTO v_premium_active, v_premium_expires
    FROM public.subscription_codes sc
    WHERE sc.is_used = true
      AND sc.used_at IS NOT NULL
      AND sc.used_by = p_device_id
      AND (sc.used_at + (sc.duration_months || ' months')::INTERVAL) > now()
    ORDER BY sc.used_at DESC
    LIMIT 1;
    v_premium_active := COALESCE(v_premium_active, false);
  END IF;

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
  ELSE
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
    v_premium_active OR v_quota_record.downloads_used < 5;
END;
$$;

GRANT EXECUTE ON FUNCTION check_premium_status(TEXT) TO authenticated, anon;

CREATE OR REPLACE FUNCTION get_download_quota_status(p_device_id TEXT)
RETURNS TABLE (
  downloads_used INTEGER,
  quota_limit INTEGER,
  downloads_remaining INTEGER,
  has_premium BOOLEAN,
  premium_expires_at TIMESTAMPTZ,
  month_year TEXT,
  can_download BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_status RECORD;
BEGIN
  SELECT * INTO v_status FROM check_premium_status(p_device_id);

  RETURN QUERY SELECT
    v_status.downloads_used,
    v_status.quota_limit,
    CASE WHEN v_status.has_premium THEN 999999
         ELSE GREATEST(0, 5 - v_status.downloads_used) END,
    v_status.has_premium,
    v_status.expires_at,
    get_current_month_year(),
    v_status.can_download;
END;
$$;

GRANT EXECUTE ON FUNCTION get_download_quota_status(TEXT) TO authenticated, anon;

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
  v_user_id     UUID := COALESCE(auth.uid(), p_user_id);
  v_normalized  TEXT := upper(trim(p_code));
  v_active_code UUID;
  v_active_exp  TIMESTAMPTZ;
  v_months      INTEGER;
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

  -- Already premium: never consume a second paid code.
  SELECT g.code_id, g.expires_at
    INTO v_active_code, v_active_exp
  FROM get_active_premium_code(v_user_id) g;
  IF v_active_code IS NOT NULL THEN
    PERFORM sync_premium_device(p_device_id);

    SELECT sc.duration_months INTO v_months
    FROM public.subscription_codes sc WHERE sc.id = v_active_code;

    RETURN QUERY SELECT
      TRUE,
      'Premium already active on your account'::TEXT,
      v_months,
      v_active_exp;
    RETURN;
  END IF;

  SELECT * INTO v_code_record
  FROM subscription_codes
  WHERE code = v_normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid code'::TEXT, NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF v_code_record.is_used THEN
    IF v_code_record.redeemed_by = v_user_id AND v_code_record.used_at IS NOT NULL THEN
      v_expiry := v_code_record.used_at + (v_code_record.duration_months || ' months')::INTERVAL;
      IF v_expiry > NOW() THEN
        INSERT INTO public.premium_device_registrations (
          user_id, subscription_code_id, device_id, expires_at
        ) VALUES (
          v_user_id, v_code_record.id, p_device_id, v_expiry
        )
        ON CONFLICT (subscription_code_id, device_id) DO UPDATE
          SET expires_at = EXCLUDED.expires_at;

        RETURN QUERY SELECT
          TRUE, 'Premium already active on your account'::TEXT,
          v_code_record.duration_months, v_expiry;
        RETURN;
      END IF;
    END IF;

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
  PERFORM * FROM check_premium_status(p_device_id);
  SELECT * INTO v_premium_status FROM check_premium_status(p_device_id);

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
