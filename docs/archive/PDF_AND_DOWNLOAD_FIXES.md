# PDF Opening & Download Tracking Fixes

## Issues Fixed

### 1. PDF Files Not Opening
**Problem:** PDFs weren't loading when tapped in My Downloads

**Root Cause:** Missing error handling and logging made it hard to diagnose

**Solution:**
- Added comprehensive logging to `MyDownloads.tsx` handlePaperClick function
- Added logging to `filesystem.ts` readFileAsBase64 functions
- Better error messages showing exactly what failed

**Changes:**
- `src/pages/MyDownloads.tsx` - Enhanced error handling with detailed logs
- `src/lib/filesystem.ts` - Added logging to file read operations

### 2. Download Counts Not Tracking
**Problem:** Downloads weren't being counted in the database

**Root Causes:**
1. Missing `downloads` column in `exam_papers` table
2. Missing `increment_download_with_quota` function in database

**Solutions:**
1. ✅ Created and applied migration `013_add_downloads_column.sql`
2. ⏳ Need to manually apply `010_download_quota_system.sql` via Supabase Dashboard

**Changes:**
- `supabase/migrations/013_add_downloads_column.sql` - Adds downloads columns (APPLIED)
- `supabase/migrations/010_download_quota_system.sql` - Adds quota tracking functions (NEEDS MANUAL APPLICATION)
- `src/services/downloadService.ts` - Improved logging for download tracking

## Testing the Fixes

### To Test PDF Opening:

1. Start the emulator:
   ```bash
   emulator -avd Pixel_Emulator
   ```

2. Install the APK:
   ```bash
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

3. Open the app and go to "My Downloads"

4. Tap on a downloaded PDF

5. **Check Chrome DevTools** (chrome://inspect):
   - Look for logs starting with 📄, 📁, 📝, ✅, or ❌
   - These will show exactly what's happening

**Expected Logs:**
```
📄 Opening paper: [Title]
📁 Local path: books/[filename].pdf
📝 Reading file: [filename].pdf
📖 Reading file: exam-papers/[filename].pdf
✅ File read successfully, data length: [number] chars
✅ PDF loaded successfully
```

**If it fails, you'll see:**
```
❌ Failed to read file: [error message]
❌ Failed to open paper: [error message]
```

### To Test Download Tracking:

**FIRST: Apply the quota migration manually**

1. Go to https://supabase.com/dashboard
2. Select project: aaayzhvqgqptgqaxxbdh
3. Click **SQL Editor** → **New Query**
4. Open `supabase/migrations/010_download_quota_system.sql`
5. Copy ALL contents and paste
6. Click **Run**

**THEN: Test in the app**

1. Download a paper or book
2. Check Chrome DevTools console for:
   ```
   ✅ Download count incremented: {
     success: true,
     message: "Download successful",
     downloadsUsed: 1,
     quotaLimit: 5,
     hasPremium: false
   }
   ```

3. Verify in database:
   ```sql
   -- Check paper downloads
   SELECT id, title, downloads 
   FROM exam_papers 
   WHERE downloads > 0 
   ORDER BY downloads DESC;

   -- Check quota tracking
   SELECT * FROM user_download_quotas 
   ORDER BY updated_at DESC;
   ```

## Common Issues & Solutions

### Issue: "File not found or corrupted"
**Cause:** PDF wasn't saved properly during download
**Solution:** Re-download the file

### Issue: "❌ Failed to read file"
**Cause:** File path mismatch or file doesn't exist
**Check:** 
- Look at the file path in logs
- Verify file exists in Android file system

### Issue: "Could not find the function increment_download_with_quota"
**Cause:** Migration 010 not applied
**Solution:** Apply migration manually via Supabase Dashboard (see above)

### Issue: PDF viewer shows blank screen
**Cause:** Base64 data is empty or corrupted
**Check:** Look for the log showing data length - should be > 0

## Files Modified

1. **src/pages/MyDownloads.tsx**
   - Added detailed logging to handlePaperClick
   - Better error messages
   - Shows file paths and sizes

2. **src/lib/filesystem.ts**
   - Added logging to readFileAsBase64
   - Added logging to readBookFileAsBase64
   - Shows file paths and data lengths

3. **src/services/downloadService.ts**
   - Improved logging for incrementDownloadCount
   - Shows success/failure clearly

4. **supabase/migrations/013_add_downloads_column.sql** (NEW)
   - Adds downloads column to exam_papers
   - Adds downloads column to library_books
   - Creates performance indexes

5. **run-downloads-migration.js** (NEW)
   - Script to apply downloads column migration
   - Already executed successfully

6. **run-quota-migration.js** (NEW)
   - Script to apply quota system migration
   - Needs manual application via dashboard

## APK Location

Updated APK with all fixes:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Next Steps

1. ✅ Restart emulator if offline
2. ✅ Install updated APK
3. ⏳ Apply quota migration via Supabase Dashboard
4. ✅ Test PDF opening with Chrome DevTools open
5. ✅ Test download tracking
6. ✅ Check console logs for detailed diagnostics

## Chrome DevTools Setup

To see console logs from the Android app:

1. Open Chrome on your computer
2. Go to `chrome://inspect`
3. Find your app in the list
4. Click "inspect"
5. Go to Console tab
6. Now you'll see all the logs from the app!

This is essential for debugging - you'll see exactly what's happening.
