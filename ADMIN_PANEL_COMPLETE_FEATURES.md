# Admin Panel → App: Complete Feature List

## What Admin Panel Can Do That Affects The App

### ✅ 1. EXAM PAPERS (Upload/Papers Pages)
**Admin Actions:**
- ✅ Upload single PDF exam paper
- ✅ Mass upload multiple papers via CSV
- ✅ Edit paper metadata (title, subject, class level, year, exam type, session, tags, description)
- ✅ Delete papers (removes PDF from storage + database)
- ✅ View all papers with stats

**App Impact:**
- **Affected Pages:** Library (`/library`), PaperDetail (`/library/:paperId`)
- **Refresh:** Click 🔄 button in Library page
- **Actions:**
  - Add paper → Shows in Library grid
  - Edit paper → Updates title/metadata in Library
  - Delete paper → Disappears from Library
- **Status:** ✅ REFRESH BUTTON ADDED

---

### ✅ 2. BOOKS (Upload Page - Books Tab)
**Admin Actions:**
- ✅ Upload PDF books
- ✅ Set book metadata (title, category, subject, system, description)
- ✅ Edit book details
- ✅ Delete books

**App Impact:**
- **Affected Pages:** BooksLibrary (`/library/books`), BookDetail (`/book/:bookId`)
- **Refresh:** Need refresh button (currently missing)
- **Actions:**
  - Add book → Shows in Books grid
  - Edit book → Updates metadata
  - Delete book → Disappears from library
- **Status:** ⚠️ NEEDS REFRESH BUTTON

---

### ✅ 3. COURSES (Courses Page)
**Admin Actions:**
- ✅ Create new course posts
- ✅ Edit course details (title, description, instructor, price, duration, level, category, image, link)
- ✅ Toggle featured status (shows at top)
- ✅ Toggle active/inactive status
- ✅ Set expiry date for courses
- ✅ Delete courses

**App Impact:**
- **Affected Pages:** Courses (`/courses`)
- **Refresh:** Click 🔄 button in Courses page
- **Actions:**
  - Create course → Appears in Courses page
  - Feature course → Shows in "Featured Courses" section
  - Edit course → Updates displayed info
  - Deactivate course → Hides from app
  - Delete course → Disappears from app
- **Status:** ✅ REFRESH BUTTON ADDED

---

### ✅ 4. NOTIFICATIONS (Notifications Page)
**Admin Actions:**
- ✅ Send push notifications to users
- ✅ Target specific user groups (All, APC, French, Nigerian)
- ✅ Add title, body, icon (emoji), optional image
- ✅ Set action URL (deep link when clicked)
- ✅ Set expiry date
- ✅ Delete old notifications

**App Impact:**
- **Affected Pages:** Home page notification banner, Settings → Notifications
- **Refresh:** Automatic on app launch (uses `notificationService`)
- **Actions:**
  - Send notification → Shows banner at top of Home
  - Target filtering → Only shows to selected user group
  - Expired notification → Disappears from app
  - Delete notification → Removes from app
- **Status:** ✅ AUTO-REFRESH (fetches on app start)

---

### ✅ 5. SUBSCRIPTION CODES (SubscriptionCodes Page)
**Admin Actions:**
- ✅ Generate premium subscription codes
- ✅ Set duration (1 month, 3 months, 6 months, 1 year, lifetime)
- ✅ Bulk generate codes
- ✅ Print code sheets (PDF)
- ✅ View redemption stats
- ✅ Track code usage (redeemed/unused)

**App Impact:**
- **Affected Pages:** Settings → Redeem Code, Premium dialogs
- **Refresh:** Real-time (validates code on entry)
- **Actions:**
  - Generate code → User can redeem it in app
  - Code redeemed → Updates user's premium status
  - Premium unlocked → Removes paywalls, unlimited downloads
- **Status:** ✅ REAL-TIME (validates instantly)

---

### ✅ 6. APP SETTINGS (AppSettings Page)
**Admin Actions:**
- ✅ Toggle Premium Features ON/OFF globally
  - ON: Premium features active, codes work
  - OFF: Premium UI shows "Coming Soon", codes don't work

**App Impact:**
- **Affected Pages:** All premium gates, download limits, subscription dialogs
- **Refresh:** Requires app restart or check `AppConfigContext`
- **Actions:**
  - Enable premium → Premium features work
  - Disable premium → Premium features show "Coming Soon"
- **Status:** ⚠️ NEEDS APP RESTART OR CONFIG REFRESH

---

### ✅ 7. APP UPDATES (AppUpdates Page)
**Admin Actions:**
- ✅ Upload new APK files
- ✅ Set version name & code
- ✅ Add release notes, bug fixes, new features
- ✅ Mark update as mandatory
- ✅ Set minimum supported version
- ✅ Delete old updates

**App Impact:**
- **Affected Pages:** App startup, Settings → App Info
- **Refresh:** Automatic on app launch (uses `appUpdatesService`)
- **Actions:**
  - Upload APK → Triggers update dialog in app
  - Mandatory update → Forces user to update
  - Delete update → Removes from update check
- **Status:** ✅ AUTO-CHECK (on app start)

---

### ✅ 8. FEEDBACK (Feedback Page)
**Admin Actions:**
- ✅ View all user feedback submissions
- ✅ Update status (Under Review → Planned → In Progress → Completed)
- ✅ Delete feedback
- ✅ Filter by status, grading system
- ✅ Search feedback
- ✅ See vote counts

**App Impact:**
- **Affected Pages:** FeedbackBoard (`/feedback`)
- **Refresh:** User pulls to refresh in FeedbackBoard
- **Actions:**
  - Update status → Shows new status badge in app
  - Delete feedback → Item disappears
  - Status "Completed" → Shows green badge
- **Status:** ⚠️ USER NEEDS TO PULL TO REFRESH

---

## Summary Table

| Feature | Admin Can Do | App Page | Refresh Method | Status |
|---------|-------------|----------|----------------|--------|
| **Exam Papers** | Add/Edit/Delete | Library | 🔄 Button | ✅ DONE |
| **Books** | Add/Edit/Delete | BooksLibrary | Need button | ⚠️ TODO |
| **Courses** | Add/Edit/Delete/Feature | Courses | 🔄 Button | ✅ DONE |
| **Notifications** | Send/Delete/Target | Home banner | Auto | ✅ DONE |
| **Sub Codes** | Generate/Print | Redeem Code | Real-time | ✅ DONE |
| **App Settings** | Toggle Premium | All premium | App restart | ⚠️ TODO |
| **App Updates** | Upload APK | Update dialog | Auto | ✅ DONE |
| **Feedback** | Update Status | FeedbackBoard | Pull refresh | ⚠️ TODO |

## What Still Needs Fixing

### 1. ⚠️ BooksLibrary - Add Refresh Button
**Issue:** Admin deletes book → Still shows in app
**Fix:** Add 🔄 refresh button (same as Library/Courses)
**Files:** `src/pages/BooksLibrary.tsx`

### 2. ⚠️ App Settings - Config Refresh
**Issue:** Admin toggles premium ON/OFF → App doesn't know until restart
**Fix:** Add refresh mechanism in `AppConfigContext` or manual refresh button
**Files:** `src/contexts/AppConfigContext.tsx`, `src/pages/Settings.tsx`

### 3. ⚠️ Feedback Status Updates
**Issue:** Admin updates feedback status → User doesn't see until pull refresh
**Fix:** Add "Refresh" button or auto-refresh on focus
**Files:** `src/pages/FeedbackBoard.tsx`

## Cache Clearing Functions Available

```typescript
// Already implemented in cacheService.ts:
cacheService.clearAllPapers()  // ✅ Used by Library
cacheService.clearAllBooks()   // ⚠️ Not used yet
```

## Next Steps

1. Add refresh button to BooksLibrary page
2. Add config refresh to AppConfigContext
3. Add refresh button to FeedbackBoard
4. Test all admin → app sync flows
