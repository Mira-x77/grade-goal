# Test Analytics System - Step by Step

## Current Status
✅ Dashboard showing: 1 library page view detected
⚠️ Sessions showing: 0 (needs app to stay open longer)

---

## Quick Test (5 Minutes)

### Step 1: Open App & Wait
1. Open app: http://localhost:5173/
2. **Wait 5 seconds** (for analytics to initialize)
3. Check browser console (F12) → should see: `📊 Analytics initialized`

### Step 2: Navigate Between Pages
Do this **slowly** (wait 5 seconds on each page):
1. Go to **Home** → wait 5 seconds
2. Go to **Library** → wait 5 seconds
3. Go to **Courses** → wait 5 seconds
4. Go to **Settings** → wait 5 seconds
5. Go to **Profile** → wait 5 seconds
6. Go to **Feedback** → wait 5 seconds

### Step 3: Perform Actions
1. **Download a paper** from Library
2. **Search** for something
3. **Click** around
4. **Stay on app for at least 30 seconds total**

### Step 4: Check Data in Supabase
1. Open Supabase: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
2. Go to **SQL Editor**
3. Paste `CHECK_ANALYTICS_DATA.sql` and run it
4. You should see:
   - ✅ app_sessions: 1 record
   - ✅ page_views: 6 records (home, library, courses, settings, profile, feedback)
   - ✅ event_tracking: 2-3 records (downloads, clicks)

### Step 5: Check Admin Dashboard
1. Open admin: http://127.0.0.1:3001/analytics
2. Refresh the page
3. Should see:
   - **Unique Users: 1**
   - **Total Sessions: 1**
   - **Total Time Spent: ~1 minute**
   - **Page Views: 6+**

---

## Why Data Might Be Missing

### Session Not Created:
**Cause:** App closed before 2-second initialization delay
**Fix:** Keep app open for at least 5 seconds after loading

### Page Views Not Tracked:
**Cause:** Navigated too quickly
**Fix:** Wait 3-5 seconds on each page before navigating

### Events Not Tracked:
**Cause:** No actions performed (downloads, clicks)
**Fix:** Download a paper, search, click buttons

---

## Verify Each Table

### 1. Check app_sessions:
```sql
SELECT COUNT(*) as sessions FROM app_sessions;
```
**Expected:** 1 or more

### 2. Check page_views:
```sql
SELECT page_name, COUNT(*) as views 
FROM page_views 
GROUP BY page_name;
```
**Expected:**
- home: 1
- library: 1
- courses: 1
- settings: 1
- profile: 1
- feedback: 1

### 3. Check event_tracking:
```sql
SELECT event_type, event_name, COUNT(*) as count 
FROM event_tracking 
GROUP BY event_type, event_name;
```
**Expected:**
- download: download_paper (1+)
- search: search_query (if you searched)

---

## Debug: If Still No Data

### Check Browser Console:
1. Open console (F12)
2. Look for errors
3. Should see: `📊 Analytics initialized`
4. Should NOT see: analytics errors

### Check Network Tab:
1. Open Network tab (F12)
2. Filter by "supabase"
3. Should see POST requests to:
   - `app_sessions` (when app opens)
   - `page_views` (when you navigate)
   - `event_tracking` (when you click/download)

### Check Supabase Logs:
1. Supabase → Logs
2. Look for errors
3. Check RLS policies aren't blocking

---

## Force Data Creation (Manual Test)

Run this in Supabase SQL Editor to manually insert test data:

```sql
-- Insert test session
INSERT INTO app_sessions (device_id, session_start, session_end, duration_seconds, grading_system, platform)
VALUES ('test-device-123', NOW() - INTERVAL '10 minutes', NOW(), 600, 'apc', 'web');

-- Get the session ID
DO $$
DECLARE
  test_session_id UUID;
BEGIN
  SELECT id INTO test_session_id FROM app_sessions WHERE device_id = 'test-device-123' LIMIT 1;
  
  -- Insert test page views
  INSERT INTO page_views (device_id, session_id, page_name, page_path, view_duration_seconds, viewed_at)
  VALUES 
    ('test-device-123', test_session_id, 'home', '/', 45, NOW() - INTERVAL '10 minutes'),
    ('test-device-123', test_session_id, 'library', '/library', 120, NOW() - INTERVAL '9 minutes'),
    ('test-device-123', test_session_id, 'courses', '/courses', 60, NOW() - INTERVAL '7 minutes');
  
  -- Insert test events
  INSERT INTO event_tracking (device_id, session_id, event_type, event_name, occurred_at)
  VALUES 
    ('test-device-123', test_session_id, 'download', 'download_paper', NOW() - INTERVAL '8 minutes'),
    ('test-device-123', test_session_id, 'search', 'search_query', NOW() - INTERVAL '6 minutes');
END $$;
```

After running this, refresh admin dashboard → should see data!

---

## Expected Results After Full Test

### Admin Dashboard Should Show:
```
Unique Users: 1
Total Sessions: 1-2
Total Time Spent: 1-5 minutes
Avg Session Duration: 1-3 minutes

Daily Activity:
  Today: 1 session, 1 user, 0.1h total

Most Visited Pages:
  1. Library - 2 views (avg 30s)
  2. Home - 1 view (avg 15s)
  3. Courses - 1 view (avg 20s)

Top Events:
  1. download_paper - 1×
  2. search_query - 1×
```

---

## Summary

**Working:** ✅ Page views being tracked (1 library view detected)
**Issue:** ⚠️ Sessions need app to stay open longer (2+ seconds)
**Fix:** Keep app open, navigate slowly, wait on pages

**Test it properly and data will show!**
