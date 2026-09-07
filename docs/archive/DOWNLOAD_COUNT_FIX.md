# Download Count Fix

## Problem
The app was failing to count downloads properly. Downloads were completing successfully, but the download count wasn't being incremented in the database.

## Root Cause
The `exam_papers` table was missing the `downloads` column. The code was trying to increment a column that didn't exist, causing the `increment_download_with_quota` function to fail silently.

## Solution

### 1. Added Missing Database Column
Created migration `013_add_downloads_column.sql` to:
- Add `downloads INTEGER NOT NULL DEFAULT 0` column to `exam_papers` table
- Add `downloads INTEGER NOT NULL DEFAULT 0` column to `library_books` table (if missing)
- Create indexes for performance

### 2. Improved Error Logging
Updated `downloadService.ts` to:
- Log successful download count increments with ✅
- Log failures with ❌ and full error details
- This helps identify issues quickly during testing

## Files Changed

1. **supabase/migrations/013_add_downloads_column.sql** (NEW)
   - Adds downloads column to both tables
   - Creates performance indexes

2. **src/services/downloadService.ts**
   - Improved logging for download count tracking
   - Better error visibility

## Testing Instructions

1. **Apply the migration** to your Supabase database:
   ```sql
   -- Run this in Supabase SQL Editor
   -- Or apply the migration file: 013_add_downloads_column.sql
   ```

2. **Test on the emulator**:
   - Open the app
   - Download a paper or book
   - Check the browser console (Chrome DevTools connected to emulator)
   - You should see: `✅ Download count incremented: {success: true, ...}`

3. **Verify in database**:
   ```sql
   -- Check if downloads are being counted
   SELECT id, title, downloads 
   FROM exam_papers 
   WHERE downloads > 0 
   ORDER BY downloads DESC;

   SELECT id, title, downloads 
   FROM library_books 
   WHERE downloads > 0 
   ORDER BY downloads DESC;
   ```

4. **Check quota tracking**:
   ```sql
   -- View download quotas
   SELECT * FROM user_download_quotas 
   ORDER BY updated_at DESC;
   ```

## How Download Counting Works

1. User initiates download
2. `downloadService.checkDownloadQuota()` checks if user can download
3. File is downloaded and saved
4. `downloadService.incrementDownloadCount(paperId/bookId)` is called
5. This calls the database function `increment_download_with_quota()`
6. The function:
   - Increments `exam_papers.downloads` or `library_books.downloads`
   - Increments `user_download_quotas.downloads_used`
   - Returns updated quota status

## Console Logs to Watch For

**Success:**
```
✅ Download count incremented: {
  success: true,
  message: "Download successful",
  downloadsUsed: 1,
  quotaLimit: 5,
  hasPremium: false
}
```

**Failure:**
```
❌ Failed to track download count: Error: column "downloads" does not exist
```

## Next Steps

1. Apply the migration to your Supabase database
2. Test downloads on the emulator
3. Monitor console logs for any errors
4. Verify counts in the database

## APK Location
The updated APK is at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Already installed on the emulator and ready for testing!
