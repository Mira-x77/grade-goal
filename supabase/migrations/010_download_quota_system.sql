-- ============================================================
-- Download Quota System
-- Implements monthly download limits for free users
-- Premium users get unlimited downloads
-- ============================================================

-- Create user download quotas table
CREATE TABLE IF NOT EXISTS public.user_download_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  downloads_used INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 5, -- Free tier limit
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, month_year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_download_quotas_device_month_idx ON public.user_download_quotas(device_id, month_year);
CREATE INDEX IF NOT EXISTS user_download_quotas_user_id_idx ON public.user_download_quotas(user_id);
CREATE INDEX IF NOT EXISTS user_download_quotas_month_year_idx ON public.user_download_quotas(month_year);

-- RLS policies
ALTER TABLE public.user_download_quotas ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own quota
CREATE POLICY "user_download_quotas: select own"
  ON public.user_download_quotas FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL); -- Allow anon for device-based tracking

-- Allow users to insert/update their own quota
CREATE POLICY "user_download_quotas: insert own"
  ON public.user_download_quotas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "user_download_quotas: update own"
  ON public.user_download_quotas FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Function to get current month-year string
CREATE OR REPLACE FUNCTION get_current_month_year()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(now(), 'YYYY-MM');
$$;

-- Function to check if user has premium access
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
  v_current_month TEXT;
  v_quota_record RECORD;
  v_premium_active BOOLEAN := false;
  v_premium_expires TIMESTAMPTZ;
BEGIN
  v_current_month := get_current_month_year();
  
  -- Check for active premium subscription via subscription codes
  SELECT 
    CASE 
      WHEN sc.is_used AND sc.used_by = p_device_id AND 
           (sc.created_at + (sc.duration_months || ' months')::INTERVAL) > now()
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
  
  -- Get or create quota record for current month
  SELECT * INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_download_quotas (
      user_id, device_id, month_year, downloads_used, quota_limit, is_premium, premium_expires_at
    ) VALUES (
      auth.uid(), p_device_id, v_current_month, 0, 
      CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
      COALESCE(v_premium_active, false), v_premium_expires
    )
    RETURNING * INTO v_quota_record;
  ELSE
    -- Update premium status if it changed
    IF v_quota_record.is_premium != COALESCE(v_premium_active, false) THEN
      UPDATE user_download_quotas 
      SET 
        is_premium = COALESCE(v_premium_active, false),
        quota_limit = CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
        premium_expires_at = v_premium_expires,
        updated_at = now()
      WHERE device_id = p_device_id AND month_year = v_current_month
      RETURNING * INTO v_quota_record;
    END IF;
  END IF;
  
  -- Return status
  RETURN QUERY SELECT 
    COALESCE(v_premium_active, false) as has_premium,
    v_premium_expires as expires_at,
    v_quota_record.downloads_used as downloads_used,
    v_quota_record.quota_limit as quota_limit,
    (v_quota_record.downloads_used < v_quota_record.quota_limit) as can_download;
END;
$$;

-- Function to increment download count with quota checking
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
  
  -- Check premium status and quota
  SELECT * INTO v_premium_status
  FROM check_premium_status(p_device_id);
  
  -- If user can't download, return error
  IF NOT v_premium_status.can_download THEN
    RETURN QUERY SELECT 
      false as success,
      'Download limit reached. Upgrade to premium for unlimited downloads.' as message,
      v_premium_status.downloads_used,
      v_premium_status.quota_limit,
      v_premium_status.has_premium;
    RETURN;
  END IF;
  
  -- Increment the appropriate counter
  IF p_paper_id IS NOT NULL THEN
    UPDATE public.exam_papers 
    SET downloads = downloads + 1 
    WHERE id = p_paper_id;
  END IF;
  
  IF p_book_id IS NOT NULL THEN
    UPDATE public.library_books 
    SET downloads = downloads + 1 
    WHERE id = p_book_id;
  END IF;
  
  -- Increment user's download count
  UPDATE user_download_quotas 
  SET 
    downloads_used = downloads_used + 1,
    updated_at = now()
  WHERE device_id = p_device_id AND month_year = v_current_month;
  
  -- Get updated counts
  SELECT downloads_used, quota_limit, is_premium 
  INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;
  
  -- Return success
  RETURN QUERY SELECT 
    true as success,
    'Download successful' as message,
    v_quota_record.downloads_used,
    v_quota_record.quota_limit,
    v_quota_record.is_premium;
END;
$$;

-- Function to get user's current quota status
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
    GREATEST(0, v_status.quota_limit - v_status.downloads_used) as downloads_remaining,
    v_status.has_premium,
    v_status.expires_at,
    get_current_month_year() as month_year,
    v_status.can_download;
END;
$$;

-- Function to reset monthly quotas (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_month TEXT;
BEGIN
  v_current_month := get_current_month_year();
  
  -- Archive old quota records (optional - keep for analytics)
  -- DELETE FROM user_download_quotas WHERE month_year < v_current_month;
  
  -- The quota system automatically creates new records for the current month
  -- when users try to download, so no explicit reset is needed
  
  RAISE NOTICE 'Monthly quota reset completed for month: %', v_current_month;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_premium_status(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_download_with_quota(TEXT, UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_download_quota_status(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_month_year() TO authenticated, anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.user_download_quotas TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_download_quotas_premium_expires_idx ON public.user_download_quotas(premium_expires_at) WHERE premium_expires_at IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.user_download_quotas IS 'Tracks monthly download quotas for users. Free users get 5 downloads/month, premium users get unlimited.';
COMMENT ON FUNCTION check_premium_status(TEXT) IS 'Checks if a device has premium access and returns quota information';
COMMENT ON FUNCTION increment_download_with_quota(TEXT, UUID, UUID) IS 'Increments download count while respecting quota limits';
COMMENT ON FUNCTION get_download_quota_status(TEXT) IS 'Returns current download quota status for a device';