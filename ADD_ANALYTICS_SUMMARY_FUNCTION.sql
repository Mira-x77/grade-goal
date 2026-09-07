-- Add analytics summary function for admin dashboard
-- Run this in Supabase SQL Editor

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

-- Grant execute to authenticated users (admin)
GRANT EXECUTE ON FUNCTION get_analytics_summary(DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_analytics_summary IS 'Get daily analytics summary for admin dashboard. Returns sessions, users, time spent, page views, events, and downloads per day.';
