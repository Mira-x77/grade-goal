# Test Subscription System - Step by Step

## Prerequisites
- ✅ Admin panel running (http://localhost:5174)
- ✅ Mobile app running (http://localhost:5173)
- ⚠️ Database migration needs to be run (see below)

## Step 1: Run Database Migration

### Option A: Via Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Open file: `supabase/migrations/003_subscription_system.sql`
6. Copy ALL the contents
7. Paste into Supabase SQL Editor
8. Click **Run** (or press Ctrl+Enter)
9. Wait for "Success" message

### Verify Migration Worked
Run this query in SQL Editor:
```sql
-- Should return 2 rows
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('subscription_codes', 'subscription_analytics');

-- Should return 1 row with zeros
SELECT * FROM subscription_analytics WHERE id = 'main';
```

## Step 2: Test Admin Panel

### Access Subscription Page
1. Open browser: http://localhost:5174
2. Login with admin credentials
3. Look at left sidebar
4. Click **"Subscriptions"** (ticket icon 🎫)

### You Should See:
- Page title: "Subscription Codes"
- 4 stats cards showing zeros
- "Generate Codes" button (top right)
- Empty table with message: "No codes generated yet"

### Generate Test Code
1. Click **"Generate Codes"** button
2. Dialog opens
3. Select **Duration**: 3 months
4. Enter **Quantity**: 1
5. Click **"Generate Codes"**
6. Wait 2-3 seconds
7. Code appears! (e.g., A7K9-M2P4-X8Q1)
8. Click **Copy** button next to the code
9. Code copied to clipboard!
10. Click **"Done"**

### Verify Code in Table
- Table now shows 1 row
- Code column shows your generated code
- Duration shows "3 months"
- Status shows "Unused" badge (blue)
- Used By shows "-"
- Stats cards updated: Total Codes: 1, Unused: 1

✅ **Admin panel test passed!**

## Step 3: Test Mobile App

### Check Initial State
1. Open browser: http://localhost:5173
2. Navigate to **Library** tab
3. Look at top-left corner
4. You should see badge: **"Free: 0/5"**
5. Click the badge
6. Dialog shows:
   - Plan: Free
   - Downloads this month: 0/5
   - "Upgrade to Premium" button

### Test Free Downloads
1. Click any paper
2. Click **"Download"** button
3. Toast appears: "Download started. 4/5 downloads remaining"
4. Go back to Library
5. Badge now shows: **"Free: 1/5"**
6. Repeat 4 more times until badge shows **"Free: 5/5"**

### Test Download Limit
1. Try to download a 6th paper
2. **"Download Limit Reached"** dialog appears!
3. Shows message: "You've used all 5 free downloads this month"
4. Shows premium benefits
5. Two buttons: "Cancel" and "Enter Premium Code"

✅ **Download limit working!**

### Test Premium Activation
1. Click **"Enter Premium Code"**
2. Code input dialog appears
3. Paste the code you generated (Ctrl+V)
4. Code auto-formats with dashes
5. Click **"Activate Premium"**
6. Loading spinner appears
7. Success toast: "Premium activated! You now have unlimited downloads"
8. Dialog closes
9. Download proceeds automatically!

### Verify Premium Status
1. Go back to Library
2. Badge now shows: **"Premium: Unlimited"** with crown icon 👑
3. Click the badge
4. Dialog shows:
   - Plan: Premium
   - Downloads this month: Unlimited
   - Expires on: [date 3 months from now]
   - Days remaining: ~90 days

### Test Unlimited Downloads
1. Download any paper - works!
2. Download another - works!
3. Download 10 more - all work!
4. No limit, no dialogs

✅ **Premium activation working!**

## Step 4: Verify in Admin Panel

1. Go back to admin panel
2. Refresh the Subscription Codes page
3. Look at the code you generated
4. Status changed to **"Used"** badge (gray)
5. Used By shows device ID (e.g., "a1b2c3d4...")
6. Used At shows timestamp
7. Stats updated: Used Codes: 1, Active Premium: 1

✅ **Code tracking working!**

## Step 5: Test Additional Features

### Test Search
1. In admin panel, type code in search box
2. Table filters to show only matching codes

### Test Filters
1. Click "Used" button
2. Shows only used codes
3. Click "Unused" button
4. Shows only unused codes
5. Click "All" button
6. Shows all codes

### Test Bulk Generation
1. Click "Generate Codes"
2. Select Duration: 6 months
3. Enter Quantity: 5
4. Click "Generate Codes"
5. 5 codes appear
6. Click "Copy All"
7. All 5 codes copied to clipboard
8. Click "Done"
9. Table shows 6 total codes (1 used, 5 unused)

✅ **All features working!**

## Common Issues & Solutions

### Issue: "Subscriptions" menu not showing
**Solution:** 
- Refresh browser (Ctrl+R)
- Check if Layout.tsx was saved
- Clear browser cache

### Issue: Can't generate codes
**Solution:**
- Check if migration was run
- Verify Supabase connection
- Check browser console (F12) for errors

### Issue: "Invalid code" when activating
**Solution:**
- Verify code was copied correctly
- Check for extra spaces
- Try generating a new code

### Issue: Badge not showing in mobile app
**Solution:**
- Refresh page
- Check browser console for errors
- Verify subscription service initialized

### Issue: Download limit not enforced
**Solution:**
- Clear browser localStorage
- Refresh page
- Check console for errors

## Success Criteria

✅ All tests passed if:
- [x] Migration ran successfully
- [x] Admin can generate codes
- [x] Codes appear in table
- [x] Mobile app shows badge
- [x] Download limit enforced at 5
- [x] Limit dialog appears
- [x] Code activation works
- [x] Premium badge shows crown
- [x] Unlimited downloads work
- [x] Admin sees code as "Used"

## Next Steps

Once all tests pass:
1. ✅ System is production-ready
2. 📝 Set your pricing (e.g., $10 for 3 months)
3. 🎯 Generate codes for real customers
4. 💰 Start selling!

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check Supabase logs
3. Verify all files were created
4. Ensure migration ran successfully

Good luck! 🚀
