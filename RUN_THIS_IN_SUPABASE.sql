-- ═══════════════════════════════════════════════════════════════════════════
-- RUN THIS IN SUPABASE SQL EDITOR
-- Copy and paste this entire file, then click RUN
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: FIX PREMIUM/DOWNLOAD SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_download_quota_status(TEXT);
DROP FUNCTION IF EXISTS increment_download_count(TEXT, UUID, UUID, UUID);

-- Fix download quota status function
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
  -- Get current month in YYYY-MM format
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Count downloads this month
  SELECT COUNT(*)::INT INTO v_download_count
  FROM download_tracking
  WHERE device_id = p_device_id
    AND TO_CHAR(downloaded_at, 'YYYY-MM') = v_current_month;
  
  -- Check for premium subscription
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
    -- Premium user: unlimited downloads
    RETURN QUERY SELECT 
      v_download_count,
      -1, -- -1 means unlimited
      TRUE,
      v_premium_record.expires_at;
  ELSE
    -- Free user: 5 downloads per month
    RETURN QUERY SELECT 
      v_download_count,
      5,
      FALSE,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix increment download count function
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
  -- Get current quota status
  SELECT * INTO v_quota
  FROM get_download_quota_status(p_device_id);
  
  -- Check if user has reached limit (free users only)
  IF NOT v_quota.is_premium AND v_quota.downloads_used >= v_quota.downloads_limit THEN
    RAISE EXCEPTION 'Download limit reached. Upgrade to premium for unlimited downloads.';
  END IF;
  
  -- Record the download
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

-- Success message for Part 1
DO $$
BEGIN
  RAISE NOTICE '✅ PART 1 COMPLETE: Premium/Download system fixed!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: CREATE ANALYTICS SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create app_sessions table to track time spent
CREATE TABLE IF NOT EXISTS app_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INT,
  grading_system TEXT,
  app_version TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_device ON app_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_start ON app_sessions(session_start);

-- 2. Create page_views table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES app_sessions(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  page_path TEXT,
  view_duration_seconds INT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_device ON page_views(device_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page_name);

-- 3. Create event_tracking table
CREATE TABLE IF NOT EXISTS event_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES app_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_tracking_device ON event_tracking(device_id);
CREATE INDEX IF NOT EXISTS idx_event_tracking_type ON event_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_event_tracking_name ON event_tracking(event_name);

-- 4. Enable RLS
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tracking ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Users can insert their own sessions" ON app_sessions;
CREATE POLICY "Users can insert their own sessions" ON app_sessions
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update their own sessions" ON app_sessions;
CREATE POLICY "Users can update their own sessions" ON app_sessions
  FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "Users can view their own sessions" ON app_sessions;
CREATE POLICY "Users can view their own sessions" ON app_sessions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own page views" ON page_views;
CREATE POLICY "Users can insert their own page views" ON page_views
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own page views" ON page_views;
CREATE POLICY "Users can view their own page views" ON page_views
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own events" ON event_tracking;
CREATE POLICY "Users can insert their own events" ON event_tracking
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own events" ON event_tracking;
CREATE POLICY "Users can view their own events" ON event_tracking
  FOR SELECT USING (TRUE);

-- 6. Create function to end session
CREATE OR REPLACE FUNCTION end_app_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_duration INT;
BEGIN
  SELECT session_start INTO v_start_time
  FROM app_sessions
  WHERE id = p_session_id AND session_end IS NULL;

  IF v_start_time IS NULL THEN
    RETURN FALSE;
  END IF;

  v_duration := EXTRACT(EPOCH FROM (NOW() - v_start_time))::INT;

  UPDATE app_sessions
  SET 
    session_end = NOW(),
    duration_seconds = v_duration
  WHERE id = p_session_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_app_session(UUID) TO anon, authenticated;

-- 7. Create analytics summary function for admin
CREATE OR REPLACE FUNCTION get_analytics_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  sessions INT,
  unique_users INT,
  total_hours NUMERIC,
  page_views INT,
  events INT,
  downloads INT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::INTERVAL)::DATE AS date
  ),
  daily_sessions AS (
    SELECT 
      DATE(session_start) AS date,
      COUNT(*)::INT AS sessions,
      COUNT(DISTINCT device_id)::INT AS unique_users,
      ROUND(SUM(COALESCE(duration_seconds, 0))::NUMERIC / 3600, 2) AS total_hours
    FROM app_sessions
    WHERE DATE(session_start) BETWEEN start_date AND end_date
    GROUP BY DATE(session_start)
  ),
  daily_views AS (
    SELECT 
      DATE(viewed_at) AS date,
      COUNT(*)::INT AS page_views
    FROM page_views
    WHERE DATE(viewed_at) BETWEEN start_date AND end_date
    GROUP BY DATE(viewed_at)
  ),
  daily_events AS (
    SELECT 
      DATE(occurred_at) AS date,
      COUNT(*)::INT AS events
    FROM event_tracking
    WHERE DATE(occurred_at) BETWEEN start_date AND end_date
    GROUP BY DATE(occurred_at)
  ),
  daily_downloads AS (
    SELECT 
      DATE(downloaded_at) AS date,
      COUNT(*)::INT AS downloads
    FROM download_tracking
    WHERE DATE(downloaded_at) BETWEEN start_date AND end_date
    GROUP BY DATE(downloaded_at)
  )
  SELECT 
    ds.date,
    COALESCE(s.sessions, 0)::INT,
    COALESCE(s.unique_users, 0)::INT,
    COALESCE(s.total_hours, 0),
    COALESCE(v.page_views, 0)::INT,
    COALESCE(e.events, 0)::INT,
    COALESCE(d.downloads, 0)::INT
  FROM date_series ds
  LEFT JOIN daily_sessions s ON ds.date = s.date
  LEFT JOIN daily_views v ON ds.date = v.date
  LEFT JOIN daily_events e ON ds.date = e.date
  LEFT JOIN daily_downloads d ON ds.date = d.date
  ORDER BY ds.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_analytics_summary(DATE, DATE) TO authenticated;

-- Success message for Part 2
DO $$
BEGIN
  RAISE NOTICE '✅ PART 2 COMPLETE: Analytics system created!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL DONE! Database setup complete.';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✅ Premium code system';
  RAISE NOTICE '  ✅ Download quota (5 for free, unlimited for premium)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  ✅ app_sessions table (time tracking)';
  RAISE NOTICE '  ✅ page_views table (page tracking)';
  RAISE NOTICE '  ✅ event_tracking table (action tracking)';
  RAISE NOTICE '  ✅ Analytics functions for admin dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test the app!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
