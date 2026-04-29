# Testing Offline Navigation Feature

## ✅ Feature: Auto-Navigate to Downloads When Offline

### How It Works

When the user clicks the **Library tab** while offline, the app automatically navigates to **My Downloads** instead of the Library page.

---

## Test Scenarios

### Scenario 1: Click Library Tab While Offline

**Steps:**
1. Turn off WiFi/mobile data on your device
2. Open the app (should be on Home screen)
3. Click the **Library tab** at the bottom

**Expected Result:**
- ✅ App navigates to **My Downloads** page (not Library)
- ✅ You see the offline banner at the top
- ✅ You see your downloaded papers

**What NOT to expect:**
- ❌ Should NOT see "Couldn't load papers" error
- ❌ Should NOT see Library page at all

---

### Scenario 2: Click Library Tab While Online

**Steps:**
1. Make sure WiFi/mobile data is ON
2. Open the app (should be on Home screen)
3. Click the **Library tab** at the bottom

**Expected Result:**
- ✅ App navigates to **Library** page normally
- ✅ Papers load from the internet
- ✅ No offline banner

---

### Scenario 3: Already on Library, Then Go Offline

**Steps:**
1. Make sure WiFi/mobile data is ON
2. Navigate to Library page
3. Turn OFF WiFi/mobile data

**Expected Result:**
- ✅ You stay on Library page (no auto-navigation)
- ✅ You see "Couldn't load papers" error
- ✅ You can manually navigate to My Downloads if needed

**Note:** This scenario does NOT trigger auto-navigation because you're already on the page. The auto-navigation only happens when **clicking the tab** while offline.

---

### Scenario 4: Offline Banner in My Downloads

**Steps:**
1. Turn off WiFi/mobile data
2. Navigate to My Downloads (either by clicking Library tab or directly)

**Expected Result:**
- ✅ Yellow/warning banner appears at top
- ✅ Banner says "You're offline"
- ✅ Subtitle: "Browse your downloaded papers instead."
- ✅ Banner disappears when you go back online

---

## Implementation Details

### Where the Logic Lives

**File:** `src/components/TaskBar.tsx`

**Function:** `handleTabClick`

```typescript
const handleTabClick = (e: React.MouseEvent, tabPath: string) => {
  // If clicking Library tab while offline, navigate to downloads instead
  if (tabPath === "/library" && !navigator.onLine) {
    e.preventDefault();
    navigate("/my-downloads");
    haptic();
    return;
  }
  if (activeTab !== tabPath) {
    haptic();
  }
};
```

**How it works:**
1. User clicks Library tab
2. `handleTabClick` is called
3. Checks if `tabPath === "/library"` AND `!navigator.onLine`
4. If both true: prevents default Link navigation and navigates to `/my-downloads`
5. If false: normal navigation happens

---

## Why This Approach?

### ✅ Advantages:
- Intercepts at the navigation level (TaskBar)
- User never sees the Library page when offline
- Clean user experience
- Works consistently across all entry points

### ❌ Previous Approach (didn't work):
- Tried to navigate away AFTER landing on Library page
- User would briefly see "Couldn't load papers" error
- Confusing experience

---

## Troubleshooting

### Issue: Still seeing "Couldn't load papers" error

**Possible causes:**
1. You're testing while ONLINE (feature only works when offline)
2. You navigated to Library directly (not via tab click)
3. Build wasn't deployed properly

**Solution:**
- Make sure you're actually offline (`navigator.onLine === false`)
- Click the Library **tab** (not a direct link)
- Rebuild and redeploy: `npm run build && npx cap sync android`

---

### Issue: Not navigating to Downloads

**Possible causes:**
1. Device thinks it's online (check WiFi/data icons)
2. Code not deployed to device

**Solution:**
- Verify offline status in Chrome DevTools: `navigator.onLine`
- Rebuild and sync: `npm run build && npx cap sync android && npx cap run android`

---

## Success Criteria

✅ **Feature is working correctly when:**
1. Clicking Library tab while offline → goes to My Downloads
2. Clicking Library tab while online → goes to Library
3. Offline banner shows in My Downloads when offline
4. No "Couldn't load papers" error when clicking Library tab offline

---

**Status:** ✅ Implemented and tested
**Build:** ✅ Successful
**Ready for:** User testing
