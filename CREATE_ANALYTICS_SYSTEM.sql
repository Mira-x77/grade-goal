-- Create comprehensive analytics system for app usage tracking
-- Run this in Supabase SQL Editor

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
  platform TEXT, -- web, android, ios
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_app_sessions_device ON app_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_start ON app_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_app_sessions_date ON app_sessions(DATE(session_start));

-- 2. Create page_views table to track screen navigation
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES app_sessions(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL, -- home, library, courses, settings, etc.
  page_path TEXT, -- /library, /courses, etc.
  view_duration_seconds INT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_page_views_device ON page_views(device_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page_name);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(DATE(viewed_at));

-- 3. Create event_tracking table for user actions
CREATE TABLE IF NOT EXISTS event_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES app_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- button_click, download, search, etc.
  event_name TEXT NOT NULL, -- add_mark, download_paper, search_library, etc.
  event_data JSONB, -- Additional event-specific data
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_tracking_device ON event_tracking(device_id);
CREATE INDEX IF NOT EXISTS idx_event_tracking_type ON event_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_event_tracking_name ON event_tracking(event_name);
CREATE INDEX IF NOT EXISTS idx_event_tracking_date ON event_tracking(DATE(occurred_at));

-- 4. Create download_tracking table (if not exists)
CREATE TABLE IF NOT EXISTS download_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  paper_id UUID,
  book_id UUID,
  grading_system TEXT,
  school TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for download tracking
CREATE INDEX IF NOT EXISTS idx_download_tracking_device ON download_tracking(device_id);
CREATE INDEX IF NOT EXISTS idx_download_tracking_date ON download_tracking(DATE(downloaded_at));
CREATE INDEX IF NOT EXISTS idx_download_tracking_month ON download_tracking(TO_CHAR(downloaded_at, 'YYYY-MM'));

-- 5. Enable RLS (Row Level Security)
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tracking ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (allow authenticated and anon users to insert their own data)

-- app_sessions policies
DROP POLICY IF EXISTS "Users can insert their own sessions" ON app_sessions;
CREATE POLICY "Users can insert their own sessions" ON app_sessions
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update their own sessions" ON app_sessions;
CREATE POLICY "Users can update their own sessions" ON app_sessions
  FOR UPDATE USING (device_id = current_setting('request.jwt.claim.device_id', true) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own sessions" ON app_sessions;
CREATE POLICY "Users can view their own sessions" ON app_sessions
  FOR SELECT USING (device_id = current_setting('request.jwt.claim.device_id', true) OR user_id = auth.uid());

-- page_views policies
DROP POLICY IF EXISTS "Users can insert their own page views" ON page_views;
CREATE POLICY "Users can insert their own page views" ON page_views
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own page views" ON page_views;
CREATE POLICY "Users can view their own page views" ON page_views
  FOR SELECT USING (device_id = current_setting('request.jwt.claim.device_id', true) OR user_id = auth.uid());

-- event_tracking policies
DROP POLICY IF EXISTS "Users can insert their own events" ON event_tracking;
CREATE POLICY "Users can insert their own events" ON event_tracking
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own events" ON event_tracking;
CREATE POLICY "Users can view their own events" ON event_tracking
  FOR SELECT USING (device_id = current_setting('request.jwt.claim.device_id', true) OR user_id = auth.uid());

-- download_tracking policies
DROP POLICY IF EXISTS "Users can insert their own downloads" ON download_tracking;
CREATE POLICY "Users can insert their own downloads" ON download_tracking
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own downloads" ON download_tracking;
CREATE POLICY "Users can view their own downloads" ON download_tracking
  FOR SELECT USING (device_id = current_setting('request.jwt.claim.device_id', true) OR user_id = auth.uid());

-- 7. Create function to get daily usage stats
CREATE OR REPLACE FUNCTION get_daily_usage_stats(p_device_id TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_sessions INT,
  total_time_seconds INT,
  total_time_formatted TEXT,
  pages_visited INT,
  events_tracked INT,
  downloads INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)::INT AS total_sessions,
    COALESCE(SUM(s.duration_seconds), 0)::INT AS total_time_seconds,
    CASE 
      WHEN COALESCE(SUM(s.duration_seconds), 0) >= 3600 
        THEN (COALESCE(SUM(s.duration_seconds), 0) / 3600) || 'h ' || ((COALESCE(SUM(s.duration_seconds), 0) % 3600) / 60) || 'm'
      WHEN COALESCE(SUM(s.duration_seconds), 0) >= 60
        THEN (COALESCE(SUM(s.duration_seconds), 0) / 60) || 'm ' || (COALESCE(SUM(s.duration_seconds), 0) % 60) || 's'
      ELSE COALESCE(SUM(s.duration_seconds), 0) || 's'
    END AS total_time_formatted,
    COUNT(DISTINCT pv.id)::INT AS pages_visited,
    COUNT(DISTINCT et.id)::INT AS events_tracked,
    COUNT(DISTINCT dt.id)::INT AS downloads
  FROM app_sessions s
  LEFT JOIN page_views pv ON pv.device_id = p_device_id AND DATE(pv.viewed_at) = p_date
  LEFT JOIN event_tracking et ON et.device_id = p_device_id AND DATE(et.occurred_at) = p_date
  LEFT JOIN download_tracking dt ON dt.device_id = p_device_id AND DATE(dt.downloaded_at) = p_date
  WHERE s.device_id = p_device_id
    AND DATE(s.session_start) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_usage_stats(TEXT, DATE) TO anon, authenticated;

-- 8. Create function to end session and calculate duration
CREATE OR REPLACE FUNCTION end_app_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_duration INT;
BEGIN
  -- Get session start time
  SELECT session_start INTO v_start_time
  FROM app_sessions
  WHERE id = p_session_id AND session_end IS NULL;

  IF v_start_time IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate duration
  v_duration := EXTRACT(EPOCH FROM (NOW() - v_start_time))::INT;

  -- Update session
  UPDATE app_sessions
  SET 
    session_end = NOW(),
    duration_seconds = v_duration
  WHERE id = p_session_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION end_app_session(UUID) TO anon, authenticated;

-- 9. Add comments for documentation
COMMENT ON TABLE app_sessions IS 'Tracks user sessions and time spent in app';
COMMENT ON TABLE page_views IS 'Tracks which pages/screens users visit';
COMMENT ON TABLE event_tracking IS 'Tracks user actions and interactions';
COMMENT ON TABLE download_tracking IS 'Tracks paper and book downloads';

COMMENT ON FUNCTION get_daily_usage_stats IS 'Get usage statistics for a device on a specific date';
COMMENT ON FUNCTION end_app_session IS 'End a session and calculate its duration';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Analytics system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - app_sessions (track time spent)';
  RAISE NOTICE '  - page_views (track screen navigation)';
  RAISE NOTICE '  - event_tracking (track user actions)';
  RAISE NOTICE '  - download_tracking (track downloads)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - get_daily_usage_stats(device_id, date)';
  RAISE NOTICE '  - end_app_session(session_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Implement tracking in app code';
END $$;
