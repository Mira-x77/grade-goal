# Testing Premium Codes & Download Limits

## Current Status

### ✅ Subscription Codes Table
- **Location:** `subscription_codes` table
- **Key Columns:**
  - `code` - The redemption code (e.g., "TEST-PREMIUM")
  - `duration_months` - How long premium lasts (1, 3, 6, 12, etc.)
  - `is_used` - Whether code has been redeemed
  - `used_at` - When it was used
  - `used_by` - Device/user info

### ⚠️ Download Quota System
- **Issue Found:** Database function `get_download_quota_status` has schema errors
- **Error:** `column sc.used_by_device_id does not exist`
- **Impact:** Download quota checks may not work correctly

---

## Manual Test Steps

### Test 1: Premium Code Activation (1 Month)

**Admin Panel:**
1. Go to: http://127.0.0.1:3001/subscription-codes
2. Generate a 1-month code
3. Copy the code

**Main App:**
1. Go to: http://127.0.0.1:5176/
2. Click Premium/Settings
3. Find "Redeem Code" option
4. Enter the code
5. ✅ Should show: "Premium activated for 1 month"
6. ✅ Should show expiry date
7. ✅ Premium features unlocked

**Verify:**
- Try downloading papers/books (should be unlimited)
- Check if premium badge shows
- Check Settings → Shows premium expiry date

---

### Test 2: Free User Download Limit (5 Downloads)

**Setup:**
1. Clear app data OR use incognito/different device
2. Don't redeem any premium code

**Test:**
1. Go to Library → Papers
2. Download 1st paper → ✅ Should work
3. Download 2nd paper → ✅ Should work
4. Download 3rd paper → ✅ Should work
5. Download 4th paper → ✅ Should work
6. Download 5th paper → ✅ Should work (last free)
7. Try 6th paper → ❌ Should block with message:
   - "Download limit reached"
   - "Upgrade to premium for unlimited downloads"

**Check Progress:**
- After each download, check if counter updates
- Should show "X/5 downloads used"

---

### Test 3: Premium = Unlimited Downloads

**After redeeming premium code:**
1. Download 10+ papers/books
2. ✅ No limit message
3. ✅ Counter should show "Premium: Unlimited"

---

## Database Issues to Fix

### Issue 1: Download Quota Function
**Problem:** `get_download_quota_status` references non-existent column `sc.used_by_device_id`

**Location:** Supabase database function

**Fix Needed:** Update function to use correct column names from `subscription_codes` table

### Issue 2: Schema Mismatch
The app code expects:
- `subscription_codes.is_redeemed` 
- `subscription_codes.redeemed_at`

But table has:
- `subscription_codes.is_used`
- `subscription_codes.used_at`

---

## Quick Test in App

### Test Premium Code Works:
```javascript
// In browser console on app page:
const testCode = 'TEST-PREMIUM'; // Get from admin panel

// Try to redeem
// Go to Settings → Premium → Redeem Code → Enter code
// Should activate premium for duration_months
```

### Check Download Quota:
```javascript
// In browser console:
localStorage.getItem('scoretarget_downloads_used')
// Should show number of downloads used this month
```

---

## What Works vs What Doesn't

| Feature | Status | Notes |
|---------|--------|-------|
| Premium Code Gen | ✅ Works | Admin can generate codes |
| Premium Code Table | ✅ Works | Codes stored correctly |
| Code Redemption RPC | ✅ Exists | `use_subscription_code` function works |
| Premium Activation | ⚠️ Test | App should activate premium |
| Download Limit (5) | ⚠️ Test | Free users limited to 5/month |
| Unlimited (Premium) | ⚠️ Test | Premium users unlimited |
| Quota Status RPC | ❌ Broken | Database schema error |

---

## Recommended Actions

1. **Test manually** in app (use steps above)
2. **Fix database function** `get_download_quota_status` if quota doesn't work
3. **Verify** premium duration (1 month = 30 days)
4. **Test expiry** - after 30 days premium should expire

---

## Expected Behavior

### Free User:
- ✅ Can download 5 papers/books per month
- ✅ Month resets on 1st of each month
- ✅ Sees "X/5 downloads remaining"
- ❌ Blocked after 5 downloads with premium gate

### Premium User (After Code):
- ✅ Unlimited downloads
- ✅ No quota shown (or shows "Unlimited")
- ✅ Premium badge visible
- ✅ Access to all features
- ⏰ Expires after `duration_months`

---

## Test Results (Fill in after testing):

**Premium Code (1 month):**
- [ ] Code generation works
- [ ] Code redemption works
- [ ] Premium activates
- [ ] Shows expiry date
- [ ] Unlimited downloads work

**Free User (5 downloads):**
- [ ] Downloads 1-5 work
- [ ] Download 6 blocked
- [ ] Shows correct counter
- [ ] Premium gate appears

---

## Files to Check if Issues:

1. **Premium Code:**
   - `src/services/subscriptionService.ts` - Code redemption
   - `src/contexts/AppConfigContext.tsx` - Premium status

2. **Download Quota:**
   - `src/services/quotaService.ts` - Quota tracking
   - `src/services/downloadService.ts` - Download limits
   - `src/lib/download-quota-lifetime.ts` - Local quota

3. **Database:**
   - Supabase function: `use_subscription_code`
   - Supabase function: `get_download_quota_status`
   - Table: `subscription_codes`
