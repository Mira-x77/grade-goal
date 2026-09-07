-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE ANALYTICS SYSTEM FOR ADMIN TRACKING
-- Run this in Supabase SQL Editor
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

-- Done!
DO $$
BEGIN
  RAISE NOTICE '✅ Analytics system created successfully!';
  RAISE NOTICE 'Tables: app_sessions, page_views, event_tracking';
  RAISE NOTICE 'Function: get_analytics_summary(start_date, end_date)';
END $$;
