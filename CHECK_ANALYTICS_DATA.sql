-- Run this in Supabase SQL Editor to check analytics data

-- Check app_sessions table
SELECT 
  id,
  device_id,
  session_start,
  session_end,
  duration_seconds,
  grading_system,
  platform,
  created_at
FROM app_sessions
ORDER BY session_start DESC
LIMIT 10;

-- Check page_views table
SELECT 
  id,
  device_id,
  session_id,
  page_name,
  page_path,
  view_duration_seconds,
  viewed_at
FROM page_views
ORDER BY viewed_at DESC
LIMIT 10;

-- Check event_tracking table
SELECT 
  id,
  device_id,
  event_type,
  event_name,
  event_data,
  occurred_at
FROM event_tracking
ORDER BY occurred_at DESC
LIMIT 10;

-- Check download_tracking table
SELECT 
  id,
  device_id,
  paper_id,
  book_id,
  grading_system,
  downloaded_at
FROM download_tracking
ORDER BY downloaded_at DESC
LIMIT 10;

-- Get summary counts
SELECT 
  (SELECT COUNT(*) FROM app_sessions) as total_sessions,
  (SELECT COUNT(*) FROM page_views) as total_page_views,
  (SELECT COUNT(*) FROM event_tracking) as total_events,
  (SELECT COUNT(*) FROM download_tracking) as total_downloads;
