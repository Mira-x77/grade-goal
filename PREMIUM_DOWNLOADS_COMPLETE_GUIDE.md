# 🎟️ Premium Codes & Download Limits - Complete Guide

## What You Asked For

1. **Premium code gives unlimited access for 1 month** ✅
2. **Free users get 5 downloads per month** ✅

---

## Step 1: Fix Database Functions

The download quota system has schema errors. Run these SQL fixes:

### In Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. **Copy and paste** `FIX_DOWNLOAD_QUOTA.sql` → Run
5. **Copy and paste** `FIX_INCREMENT_DOWNLOAD.sql` → Run

These fix the database functions to:
- Check premium status correctly
- Track download counts
- Enforce 5-download limit for free users
- Allow unlimited for premium users

---

## Step 2: Test with Script

After fixing database, run test script:

```bash
node test-full-premium-downloads.js
```

**What it tests:**
- ✅ Fetches available codes
- ✅ Tests free user (5 download limit)
- ✅ Activates premium code
- ✅ Tests premium user (unlimited)

---

## Step 3: Manual Test in App

### A. Generate Premium Code (Admin)

1. Open admin: **http://127.0.0.1:3001/subscription-codes**
2. Click "Generate Codes"
3. Duration: **1 month**
4. Quantity: **1**
5. Generate & **copy the code**

### B. Test Free User (5 Downloads)

1. Open app: **http://127.0.0.1:5176/**
2. Clear browser data (to simulate new user)
3. Go to **Library → Papers**
4. Download papers one by one
5. Watch the counter: **"X/5 downloads remaining"**

**Expected:**
- ✅ Downloads 1-5 work
- ✅ Counter shows correctly
- ❌ Download #6 blocked with message:
  - "Download limit reached"
  - "Upgrade to premium for unlimited downloads"
- ✅ Premium gate appears

### C. Redeem Premium Code

1. Click **"Upgrade to Premium"** or **Settings → Premium**
2. Click **"Redeem Code"**
3. Enter the code from Step A
4. Click **"Activate"**

**Expected:**
- ✅ Success message: "Premium activated!"
- ✅ Shows expiry date (30 days from now)
- ✅ Premium badge visible
- ✅ Counter changes to "Premium: Unlimited"

### D. Test Unlimited Downloads

1. Download 10+ papers/books
2. No limit message should appear
3. All downloads work

---

## How It Works

### Free User Flow:
```
User tries to download
  ↓
Check: downloads_used < 5?
  ↓ YES
Download works, increment counter (1/5, 2/5, etc.)
  ↓ NO (at 5)
Block download, show premium gate
```

### Premium User Flow:
```
User redeems code
  ↓
Check: code valid & unused?
  ↓ YES
Mark code as used
Save expiry date (now + duration_months)
  ↓
User tries to download
  ↓
Check: has active premium?
  ↓ YES
Download works (no limit check)
```

### Premium Expiry:
```
After 30 days (1 month):
  ↓
Premium expires automatically
  ↓
User becomes free tier
  ↓
5 downloads per month limit applies again
```

---

## Database Schema

### `subscription_codes` Table:
```sql
- code (TEXT) - e.g., "GOSTUDY-ABC123"
- duration_months (INT) - 1, 3, 6, 12, etc.
- is_used (BOOLEAN) - false until redeemed
- used_at (TIMESTAMP) - when code was used
- used_by (JSONB) - {device_id, user_id}
```

### `download_tracking` Table:
```sql
- device_id (TEXT) - unique device identifier
- downloaded_at (TIMESTAMP) - when download happened
- paper_id / book_id (UUID) - what was downloaded
- grading_system (TEXT) - apc, french, nigerian_university
```

### Database Functions:

**`get_download_quota_status(device_id)`**
- Returns current quota status
- Checks if device has premium
- Counts downloads this month
- Returns: downloads_used, quota_limit, has_premium, can_download

**`use_subscription_code(code, device_id, ...)`**
- Validates code
- Marks as used
- Calculates expiry date
- Returns: success, message, expires_at, duration_months

**`increment_download_with_quota(device_id, ...)`**
- Checks quota/premium status
- Blocks if limit reached (free user)
- Tracks download in database
- Returns: updated quota status

---

## Troubleshooting

### ❌ "Download limit reached" but user has premium

**Problem:** Premium not detected
**Fix:** 
1. Check code is activated (admin panel shows `is_used = true`)
2. Check expiry date (must be in future)
3. Restart app to refresh premium status

### ❌ Free user can download more than 5

**Problem:** Quota function not working
**Fix:**
1. Run `FIX_DOWNLOAD_QUOTA.sql` in Supabase
2. Run `FIX_INCREMENT_DOWNLOAD.sql` in Supabase
3. Clear app data and test again

### ❌ Code says "Invalid" or "Already used"

**Problem:** Code redeemed or expired
**Fix:**
1. Generate new code in admin panel
2. Check code is exactly as shown (case-sensitive)

### ❌ Counter shows wrong number

**Problem:** Cache issue
**Fix:**
1. Clear browser localStorage
2. Refresh app
3. Check database: `SELECT * FROM download_tracking WHERE device_id = 'xxx'`

---

## Testing Checklist

- [ ] Database functions fixed (SQL scripts run)
- [ ] Test script runs successfully
- [ ] Admin can generate codes
- [ ] Free user blocked at 6th download
- [ ] Premium code activates
- [ ] Premium user has unlimited downloads
- [ ] Counter shows correctly (X/5 or Unlimited)
- [ ] Premium gate appears when limit reached
- [ ] Premium expires after duration_months

---

## Key Files

**Frontend:**
- `src/services/subscriptionService.ts` - Code redemption
- `src/services/quotaService.ts` - Quota tracking
- `src/services/downloadService.ts` - Download logic
- `src/contexts/AppConfigContext.tsx` - Premium status

**Admin:**
- `exam-library-admin/src/pages/SubscriptionCodes.tsx` - Generate codes

**Database:**
- `FIX_DOWNLOAD_QUOTA.sql` - Fix quota function
- `FIX_INCREMENT_DOWNLOAD.sql` - Fix increment function

**Tests:**
- `test-full-premium-downloads.js` - Automated test
- `TEST_PREMIUM_AND_DOWNLOADS.md` - Manual test guide

---

## Expected Results

| User Type | Downloads/Month | Code Needed | Duration | After Expiry |
|-----------|----------------|-------------|----------|--------------|
| Free | 5 | No | Forever | N/A |
| Premium (1mo) | Unlimited | Yes | 30 days | Back to free |
| Premium (3mo) | Unlimited | Yes | 90 days | Back to free |
| Premium (6mo) | Unlimited | Yes | 180 days | Back to free |
| Premium (12mo) | Unlimited | Yes | 365 days | Back to free |

---

## Next Steps

1. ✅ Run SQL fixes in Supabase
2. ✅ Run test script
3. ✅ Test manually in app
4. ✅ Generate codes for distribution
5. ✅ Monitor download tracking

All ready to test!
