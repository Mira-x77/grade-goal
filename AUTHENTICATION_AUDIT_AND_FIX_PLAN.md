# GoStudy Authentication & Data Persistence - Comprehensive Audit & Fix

## Executive Summary

**Date:** 2026-09-02  
**Status:** ⚠️ CRITICAL ISSUES IDENTIFIED  
**Required Action:** Implement proper onboarding persistence and auth flow fixes

---

## ✅ WHAT'S WORKING CORRECTLY

### 1. No Duplicate Sign-In Pages
- **Finding:** Only ONE authentication system exists
- **Components:** 
  - `WelcomePage.tsx` - Initial landing with guest/sign-in options
  - `AuthPage.tsx` - Dedicated OAuth sign-in page
  - `AuthSheet.tsx` - Modal OAuth component
  - `SignInSuccess.tsx` - Success transition page
- **Verdict:** NO fake/wallpaper duplicate pages found ✅

### 2. Supabase as Source of Truth
- **Database Tables:**
  - `user_app_state` - Stores complete AppState as JSONB
  - `user_history` - Stores mark history entries
  - `user_streak` - Stores streak data
- **RLS Policies:** Properly configured with `auth.uid() = user_id` ✅
- **Cloud Sync Service:** Functional implementation exists ✅

### 3. Cross-Device Data Restoration
- **Function:** `restoreUserDataFromCloud()` exists
- **Syncing:** Happens on login via `syncOnLogin()`
- **Caching:** LocalStorage used as cache, not sole source ✅

---

## ❌ CRITICAL ISSUES REQUIRING FIXES

### Issue #1: Onboarding Data NOT Persisted to Supabase

**Problem:**  
When a user completes onboarding, the data is saved ONLY to localStorage:
```typescript
// In SimpleOnboarding.tsx handleFinish()
saveState(updated);  // Only saves to localStorage!
localStorage.setItem("grade_calculator_setup_done", "true");
navigate("/", { replace: true });
```

**Impact:**
- User completes onboarding on Device A
- Signs into same account on Device B
- Onboarding data doesn't appear → User forced through onboarding again ❌
- Data loss on app reinstall/clear cache

**Root Cause:**  
The `handleFinish()` function never calls `saveAppStateToCloud()`

---

### Issue #2: Sign-In Moved to Beginning Breaks Flow

**Problem:**  
When sign-in was moved to step 1 of onboarding:
```typescript
// Step 1 - Sign in → Step 2 - Name → ... → Step 6 - Subjects
```

The new flow causes issues:
1. User signs in at step 1
2. Completes onboarding (steps 2-6)
3. `handleFinish()` saves to localStorage only
4. User data never uploaded to Supabase account
5. On logout/re-login → onboarding data lost ❌

**Previous Flow (when sign-in was at end):**
```typescript
handleGoogleAuth() {
  handleFinish();  // This saved state before auth
  // Then initiated OAuth
}
```
This at least saved locally before OAuth redirect.

**New Flow Problem:**
```typescript
handleGoogleAuth() {
  // Just navigates to next step
  goNext();  // No save happens!
}
```

---

### Issue #3: No Onboarding Completion Flag in Supabase

**Problem:**  
Onboarding completion is determined by:
```typescript
// In ProtectedRoute.tsx
const hasOnboarding = !!(saved?.studentName && saved?.settings?.gradingSystem);
```

This checks localStorage only. If user signs in on new device:
- localStorage is empty
- User appears to have incomplete onboarding
- Forced through onboarding again even though they completed it ❌

**Missing:**  
- No `onboarding_completed` flag in `user_app_state`
- No onboarding metadata in database

---

### Issue #4: Race Conditions in Auth Flow

**Problem:**  
Auth callback and data restoration have timing issues:

```typescript
// In AuthContext.tsx
if (event === "SIGNED_IN" && session?.user) {
  if (initialSessionRestoredRef.current) {
    await syncOnLogin(session.user.id);
  }
}
```

Possible race:
1. User completes OAuth
2. Redirects to `/auth/callback`
3. Auth state change fires
4. Sync attempt happens before onboarding data was saved
5. Nothing to restore → user appears new ❌

---

### Issue #5: AppState Structure Lacks Metadata

**Current AppState:**
```typescript
{
  step: "marks",
  studentName: "...",
  classLevel: "...",
  subjects: [...],
  settings: {...},
  // No onboarding_completed flag
  // No created_at timestamp
  // No last_updated timestamp
}
```

**Missing Metadata:**
- Onboarding completion status
- Account creation date
- Last sync timestamp
- Data version/schema version

---

## 🔧 REQUIRED FIXES

### Fix #1: Persist Onboarding Data to Supabase

**Implementation:**

```typescript
// In SimpleOnboarding.tsx
const handleFinish = async () => {
  if (saving) return;
  setSaving(true);

  try {
    const updated: AppState = {
      // ... existing state construction
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    };

    // Save locally first
    saveState(updated);
    localStorage.setItem("grade_calculator_setup_done", "true");

    // If user is authenticated, save to Supabase immediately
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await saveAppStateToCloud(session.user.id, updated);
    }

    navigate("/", { replace: true });
  } catch (error) {
    console.error("Failed to save onboarding:", error);
    toast.error("Failed to save your settings. Please try again.");
  } finally {
    setSaving(false);
  }
};
```

---

### Fix #2: Update AppState Type

**Add to `types/exam.ts`:**
```typescript
export interface AppState {
  // ... existing fields
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  account_created_at?: string;
  last_synced_at?: string;
}
```

---

### Fix #3: Update Onboarding Detection Logic

**In ProtectedRoute.tsx:**
```typescript
const hasCompletedOnboarding = () => {
  // Check localStorage first (fast)
  const saved = loadState();
  if (saved?.onboarding_completed) return true;
  
  // Also check the flag
  if (saved?.studentName && saved?.settings?.gradingSystem) {
    // Backward compatibility: if has data but no flag, consider complete
    return true;
  }
  
  return false;
};
```

---

### Fix #4: Add Post-Onboarding Sync

**New component: `OnboardingComplete.tsx`:**
```typescript
export default function OnboardingComplete() {
  const { session } = useAuth();
  
  useEffect(() => {
    const syncOnboardingData = async () => {
      if (!session?.user) return;
      
      const state = loadState();
      if (state) {
        await saveAppStateToCloud(session.user.id, {
          ...state,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        });
      }
      
      // Navigate to home after successful sync
      navigate("/", { replace: true });
    };
    
    syncOnboardingData();
  }, [session]);
  
  return <LoadingSpinner text="Saving your settings..." />;
}
```

---

### Fix #5: Handle Guest → Authenticated Upgrade

**When guest user signs in later:**
```typescript
// In AuthCallback.tsx or after OAuth success
const upgradeGuestToAuthenticated = async (userId: string) => {
  const localState = loadState();
  
  if (localState) {
    // User had local data (guest mode)
    // Upload it to their new authenticated account
    await pushLocalDataToCloud(userId);
  }
};
```

---

### Fix #6: Improve syncOnLogin Logic

**In AuthContext.tsx:**
```typescript
const syncOnLogin = async (userId: string) => {
  const hasLocalData = !!localStorage.getItem('scoretarget_state');
  const localState = hasLocalData ? loadState() : null;
  
  // Check if user has cloud data
  const cloudState = await loadAppStateFromCloud(userId);
  
  if (cloudState && cloudState.onboarding_completed) {
    // User has completed onboarding before
    // Restore their data
    await restoreUserDataFromCloud(userId);
  } else if (localState && localState.onboarding_completed) {
    // User completed onboarding locally (guest mode)
    // Upload to cloud
    await pushLocalDataToCloud(userId);
  } else if (cloudState) {
    // User has some cloud data but onboarding not complete
    // Restore what they have
    await restoreUserDataFromCloud(userId);
  } else if (localState) {
    // User has local data only
    // Upload it
    await pushLocalDataToCloud(userId);
  }
  // else: new user with no data → will go through onboarding
};
```

---

### Fix #7: Update Onboarding Flow with Sign-In at Start

**Option A: Keep Sign-In at Start (Recommended)**
```typescript
// Step 1: Sign in (optional) - sets session
// Steps 2-6: Collect onboarding data
// Step 6 finish: Save to localStorage AND Supabase if authenticated

const handleFinish = async () => {
  // Save state
  const updated = {...};
  saveState(updated);
  
  // Check if authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Already signed in → save to cloud immediately
    await saveAppStateToCloud(session.user.id, updated);
    navigate("/", { replace: true });
  } else {
    // Guest mode → navigate normally
    // Data will be uploaded if they sign in later
    navigate("/", { replace: true });
  }
};
```

**Option B: Move Sign-In Back to End**
This solves the original issue but creates the problem you mentioned about swapping it.

**Recommendation:** Keep sign-in at start (Option A) but add proper cloud save at end.

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Database Schema (No changes needed!)
- [x] `user_app_state` table exists
- [x] RLS policies configured
- [x] Upsert functions exist
- [ ] Add migration notes for `onboarding_completed` field in JSONB

### Phase 2: TypeScript Types
- [ ] Update `AppState` interface with metadata fields
- [ ] Add `onboarding_completed` boolean
- [ ] Add `onboarding_completed_at` timestamp
- [ ] Add `last_synced_at` timestamp

### Phase 3: Onboarding Component
- [ ] Update `handleFinish()` to save to Supabase
- [ ] Add error handling for cloud save failures
- [ ] Add loading state during save
- [ ] Update `handleGoogleAuth()` at step 1

### Phase 4: Auth Context
- [ ] Improve `syncOnLogin()` logic
- [ ] Handle guest→authenticated upgrade
- [ ] Add proper data merge logic
- [ ] Handle conflicts (local vs cloud)

### Phase 5: Protected Route
- [ ] Update onboarding detection logic
- [ ] Check `onboarding_completed` flag
- [ ] Maintain backward compatibility

### Phase 6: Testing
- [ ] Test new user onboarding
- [ ] Test guest → authenticated upgrade
- [ ] Test cross-device restoration
- [ ] Test logout → login data persistence
- [ ] Test app reinstall scenario
- [ ] Test offline onboarding → later sync

---

## 🧪 TEST SCENARIOS

### Test A: New Authenticated User
1. Open app → Welcome page
2. Click "Sign In" → Complete OAuth
3. Complete onboarding steps 2-6
4. Data saves to Supabase ✅
5. Logout
6. Sign in again
7. **Expected:** Onboarding data restored, goes directly to home ✅

### Test B: Guest → Authenticated Upgrade
1. Open app → "Continue as Guest"
2. Complete onboarding
3. Use app (add subjects, etc.)
4. Go to Settings → Sign In
5. **Expected:** Local data uploads to account ✅

### Test C: Cross-Device Restoration
1. **Device A:** Sign in → Complete onboarding
2. **Device B:** Sign in with same account
3. **Expected:** Onboarding data appears, no re-onboarding ✅

### Test D: Partial Onboarding
1. Sign in → Start onboarding
2. Complete steps 1-3, close app
3. Reopen app
4. **Expected:** Resume from step 4 (if possible) or restart

### Test E: Offline Onboarding
1. Turn off network
2. Complete onboarding as guest
3. Turn on network
4. Sign in
5. **Expected:** Data syncs to cloud ✅

---

## 🎯 PRIORITY FIXES

### 🔥 CRITICAL (Do First)
1. **Fix #1:** Make `handleFinish()` save to Supabase
2. **Fix #2:** Add `onboarding_completed` to AppState
3. **Fix #3:** Update onboarding detection logic

### ⚠️ HIGH (Do Soon)
4. **Fix #4:** Post-onboarding cloud sync
5. **Fix #5:** Guest → authenticated upgrade
6. **Fix #6:** Improve syncOnLogin logic

### 📌 MEDIUM (Do After)
7. Add conflict resolution for local vs cloud data
8. Add retry logic for failed syncs
9. Add sync status indicator in UI

---

## 🚫 WHAT NOT TO DO

### ❌ Do NOT:
1. Delete existing user data during migration
2. Break backward compatibility with existing users
3. Assume localStorage is empty on first load
4. Ignore sync failures silently
5. Create new profile tables (use existing user_app_state)
6. Change Supabase schema (it's correct already)
7. Add complex migration logic (keep it simple)

### ✅ DO:
1. Use existing `user_app_state` table
2. Save onboarding data immediately after completion
3. Check for authenticated session before saving to cloud
4. Maintain localStorage as cache
5. Handle offline scenarios gracefully
6. Test all user flows thoroughly

---

## 📝 NOTES

1. **No Schema Changes Needed:** The existing `user_app_state.state_json` JSONB field can store `onboarding_completed` metadata without schema changes.

2. **Backward Compatibility:** Existing users who have `studentName` + `gradingSystem` in localStorage should be considered as having completed onboarding.

3. **Guest Mode:** Guest users store everything locally. When they sign in later, their data should be uploaded to their account.

4. **Sign-In at Start:** Keeping sign-in at step 1 is fine IF we properly save to Supabase at the end.

5. **Duplicate Pages:** No duplicate/fake sign-in pages exist. The single auth system is correct.

---

## 📊 CURRENT STATE SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Pages | ✅ Correct | No duplicates found |
| Supabase Schema | ✅ Correct | Tables & RLS configured |
| Cloud Sync Service | ✅ Exists | Functions implemented |
| Onboarding Persistence | ❌ Broken | Only saves to localStorage |
| Cross-Device Restore | ❌ Broken | No cloud onboarding data |
| Guest Upgrade | ⚠️ Partial | Logic exists but incomplete |
| RLS Policies | ✅ Correct | Properly secured |

---

## 🎬 NEXT STEPS

1. Read and approve this audit document
2. Implement Fix #1 (critical onboarding save)
3. Implement Fix #2 (AppState type update)
4. Implement Fix #3 (detection logic)
5. Test all scenarios
6. Rebuild APK and test on device
7. Mark audit as complete

---

**End of Audit Document**
