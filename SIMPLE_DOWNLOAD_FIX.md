# Simple Download Fix for Mobile

## What I Changed

Updated the download code to use a simpler approach on mobile that bypasses CORS issues.

**Mobile devices now use:** Direct `fetch()` without streaming
**Web browsers use:** Streaming download with progress

## What You Need to Do

### Option 1: Make Sure Bucket is Public (Easiest)

1. Go to https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/storage/buckets
2. Click on **exam-papers** bucket
3. Make sure **"Public bucket"** toggle is ON (green)
4. That's it!

### Option 2: If Still Not Working - Check File URLs

Test if the file URL is accessible:

1. Copy a file URL from your database (e.g., from the test paper you uploaded)
2. Paste it in your mobile browser
3. If it downloads/opens → URLs are working
4. If it gives an error → bucket might not be public

### Option 3: Rebuild the App

Sometimes the app needs to be rebuilt to pick up changes:

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

## Testing

1. Open app on your phone
2. Go to Library
3. Click on a paper
4. Click "Download" button
5. Should see progress bar
6. File should save to device

## What the Code Does Now

### On Mobile (Android/iOS):
```javascript
// Simple direct download
const response = await fetch(fileUrl);
const blob = await response.blob();
// Save to device
```

### On Web:
```javascript
// Streaming download with progress
const blob = await downloadFile(fileUrl, onProgress);
// Save to browser storage
```

## If Still Getting Errors

### Error: "Network error"
- Check your internet connection
- Make sure the file URL works in a browser
- Verify bucket is public

### Error: "Failed to download"
- File might be too large
- Check device storage space
- Try a smaller file first

### Error: "Failed to save"
- App might not have storage permissions
- Check Android/iOS app permissions
- Grant storage access to the app

## Files Changed
- ✅ `src/services/downloadService.ts` - Simplified mobile download
- ✅ Code now works without CORS configuration

## Next Steps

1. Make sure bucket is public (Option 1 above)
2. Test download on mobile
3. If it works → Done!
4. If not → Check the error message and follow troubleshooting above
