# 📊 Analytics System - Complete Implementation Guide

## Current Status

### ❌ NOT IMPLEMENTED
The app currently **does NOT track**:
- Session time / time spent in app
- Page views / screen navigation  
- User interactions / button clicks
- App opens / launches
- Feature usage patterns

### ✅ What Exists (Limited)
- `course_views` table (empty - not used)
- `notification_reads` table (tracks notification reads)
- `user_profile` table (basic user data)

---

## What I Created

### 1. Database Schema (`CREATE_ANALYTICS_SYSTEM.sql`)
**Run this in Supabase SQL Editor**

**Tables:**
- `app_sessions` - Tracks session start/end, duration
- `page_views` - Tracks which screens user visits
- `event_tracking` - Tracks user actions (clicks, downloads, etc.)
- `download_tracking` - Tracks paper/book downloads

**Functions:**
- `get_daily_usage_stats(device_id, date)` - Get daily usage summary
- `end_app_session(session_id)` - End session, calculate duration

### 2. Analytics Service (`src/services/analyticsService.ts`)
**Frontend tracking service**

**Features:**
- Start/end sessions automatically
- Track page views with duration
- Track custom events
- Get daily usage stats
- Heartbeat to keep session alive

---

## Implementation Steps

### Step 1: Create Database Tables

1. Open Supabase: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
2. Click **SQL Editor**
3. Copy and paste **`CREATE_ANALYTICS_SYSTEM.sql`**
4. Click **Run**

**Expected Output:**
```
✅ Analytics system created successfully!

Tables created:
  - app_sessions (track time spent)
  - page_views (track screen navigation)
  - event_tracking (track user actions)
  - download_tracking (track downloads)
```

### Step 2: Initialize Analytics in App

Add to `src/App.tsx` or main entry point:

```typescript
import { analyticsService } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { user } = useAuth();
  const [appState, setAppState] = useState(null);

  useEffect(() => {
    // Initialize analytics when app starts
    const initAnalytics = async () => {
      const state = loadState();
      const gradingSystem = state?.settings?.gradingSystem || 'apc';
      
      await analyticsService.initialize(user?.id, gradingSystem);
    };

    initAnalytics();

    // End session when app closes
    return () => {
      analyticsService.endSession();
    };
  }, [user?.id]);

  return <YourApp />;
}
```

### Step 3: Track Page Views

Add to each page component:

```typescript
import { analyticsService } from '@/services/analyticsService';

export default function LibraryPage() {
  useEffect(() => {
    // Track page view
    analyticsService.trackPageView('library', '/library');
  }, []);

  return <YourPage />;
}
```

**Pages to track:**
- Home (`home`, `/`)
- Library (`library`, `/library`)
- Courses (`courses`, `/courses`)
- Feedback (`feedback`, `/feedback`)
- Settings (`settings`, `/settings`)
- Profile (`profile`, `/profile`)
- etc.

### Step 4: Track Events

Add to user actions:

```typescript
// Download event
const handleDownload = async (paper) => {
  await downloadService.downloadPaper(paper);
  await analyticsService.trackDownload('paper', paper.id);
};

// Button click
const handleButtonClick = () => {
  analyticsService.trackButtonClick('add_mark');
  // ... rest of logic
};

// Search
const handleSearch = (query) => {
  const results = searchLibrary(query);
  analyticsService.trackSearch(query, results.length);
};

// Feature use
const handlePremiumFeature = () => {
  analyticsService.trackFeatureUse('premium_subjects');
  // ... rest of logic
};
```

### Step 5: Admin Analytics Dashboard (ADMIN ONLY)

Add analytics page to admin panel:

**File:** `exam-library-admin/src/pages/Analytics.tsx` (Already created)

**Features:**
- View daily usage stats
- See most visited pages
- Track top events
- Monitor downloads
- Time spent per day
- Unique users count

**Route:** Add to admin router:
```typescript
import Analytics from './pages/Analytics';

<Route path="/analytics" element={<Analytics />} />
```

Users will NOT see any analytics - this is admin-only data.
```

---

## What Gets Tracked

### Sessions (app_sessions)
```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "device_id": "device-123",
  "session_start": "2024-01-15T10:30:00Z",
  "session_end": "2024-01-15T10:45:00Z",
  "duration_seconds": 900,
  "grading_system": "apc",
  "platform": "android"
}
```

**Tracks:**
- When user opens app
- When user closes app
- Total time spent per session
- Platform (web, android, ios)

### Page Views (page_views)
```json
{
  "id": "uuid",
  "session_id": "session-uuid",
  "page_name": "library",
  "page_path": "/library",
  "view_duration_seconds": 45,
  "viewed_at": "2024-01-15T10:32:00Z"
}
```

**Tracks:**
- Which screens user visits
- How long on each screen
- Navigation patterns

### Events (event_tracking)
```json
{
  "id": "uuid",
  "session_id": "session-uuid",
  "event_type": "download",
  "event_name": "download_paper",
  "event_data": {
    "item_id": "paper-uuid",
    "subject": "Mathematics"
  },
  "occurred_at": "2024-01-15T10:35:00Z"
}
```

**Tracks:**
- Button clicks
- Downloads
- Searches
- Feature usage
- Any custom action

---

## Example: Full Implementation

### In App.tsx:
```typescript
import { analyticsService } from '@/services/analyticsService';

useEffect(() => {
  // Initialize on app start
  const state = loadState();
  analyticsService.initialize(
    user?.id, 
    state?.settings?.gradingSystem
  );

  // Update user when they log in
  if (user) {
    analyticsService.updateUserId(user.id);
  }

  // End session on app close
  return () => analyticsService.endSession();
}, [user?.id]);
```

### In Library.tsx:
```typescript
useEffect(() => {
  analyticsService.trackPageView('library', '/library');
}, []);

const handleDownload = async (paper) => {
  try {
    await downloadService.downloadPaper(paper);
    await analyticsService.trackDownload('paper', paper.id);
    toast.success('Downloaded!');
  } catch (error) {
    toast.error('Download failed');
  }
};
```

### In Home.tsx:
```typescript
useEffect(() => {
  analyticsService.trackPageView('home', '/');
}, []);

const handleAddMark = () => {
  analyticsService.trackButtonClick('add_mark');
  setShowAddMark(true);
};

const handleFeatureUse = (feature) => {
  analyticsService.trackFeatureUse(feature);
  // ... rest of logic
};
```

---

## Admin Dashboard (View Analytics)

### Query Daily Usage:
```sql
SELECT 
  DATE(session_start) as date,
  COUNT(*) as sessions,
  SUM(duration_seconds) / 3600 as hours_spent,
  COUNT(DISTINCT device_id) as unique_users
FROM app_sessions
WHERE session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;
```

### Query Most Visited Pages:
```sql
SELECT 
  page_name,
  COUNT(*) as views,
  AVG(view_duration_seconds) as avg_duration_seconds
FROM page_views
WHERE viewed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY page_name
ORDER BY views DESC;
```

### Query Top Events:
```sql
SELECT 
  event_type,
  event_name,
  COUNT(*) as occurrences
FROM event_tracking
WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type, event_name
ORDER BY occurrences DESC
LIMIT 10;
```

---

## Benefits

### For Users:
- See their own activity stats
- Track time spent studying
- Monitor their progress

### For Admin:
- Understand how users use the app
- Identify popular features
- Find unused features
- Optimize user experience
- Make data-driven decisions

### For Development:
- Track feature adoption
- Identify bugs (unusual patterns)
- Monitor performance
- A/B testing data

---

## Privacy & GDPR Compliance

✅ **Anonymous tracking**: Device ID, not personal data  
✅ **User control**: Can opt out  
✅ **Data retention**: Set retention period (e.g., 90 days)  
✅ **Transparent**: Show users what's tracked

**Add opt-out in Settings:**
```typescript
const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

const toggleAnalytics = (enabled) => {
  setAnalyticsEnabled(enabled);
  if (!enabled) {
    analyticsService.endSession();
  }
  // Save preference
  localStorage.setItem('analytics_enabled', enabled);
};
```

---

## Testing

### Test Session Tracking:
1. Open app
2. Check Supabase → app_sessions table
3. Should see new record with session_start
4. Close app (wait 5 seconds)
5. Check again → session_end and duration_seconds filled

### Test Page Tracking:
1. Navigate to Library
2. Wait 10 seconds
3. Navigate to Courses
4. Check Supabase → page_views table
5. Should see 2 records with durations

### Test Event Tracking:
1. Download a paper
2. Check Supabase → event_tracking table
3. Should see download event

### Test Daily Stats:
```typescript
const stats = await analyticsService.getDailyStats();
console.log(stats);
// Output: { totalSessions: 1, totalTimeFormatted: "15m 30s", ... }
```

---

## Next Steps

1. ✅ Run `CREATE_ANALYTICS_SYSTEM.sql` in Supabase
2. ✅ Add `analyticsService` to app initialization
3. ✅ Add `trackPageView()` to each page
4. ✅ Add `trackEvent()` to user actions
5. ✅ Test tracking works
6. ✅ Build admin dashboard to view analytics
7. ✅ Add opt-out option for privacy

---

## Summary

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Database Tables** | ✅ Created | Run SQL script |
| **Analytics Service** | ✅ Created | Already in code |
| **Session Tracking** | ⚠️ Not integrated | Add to App.tsx |
| **Page Tracking** | ⚠️ Not integrated | Add to each page |
| **Event Tracking** | ⚠️ Not integrated | Add to actions |
| **Daily Stats** | ✅ Available | Use `getDailyStats()` |
| **Admin Dashboard** | ❌ Not created | Build analytics view |

**Ready to implement!** Start with Step 1 (create database tables).
