# Testing Guide - PDF Opening & Download Tracking

## ✅ App is Running!

The app is now installed and running on the emulator (emulator-5556).

## 🔍 How to See Console Logs

**IMPORTANT:** To see what's happening, you need Chrome DevTools:

1. Open **Google Chrome** on your computer
2. Go to: `chrome://inspect`
3. Wait a few seconds for devices to appear
4. Find **"com.scoretarget.app"** in the list
5. Click **"inspect"** next to it
6. Click the **"Console"** tab
7. Now you'll see all logs from the app!

## 📋 Test 1: PDF Opening

### Steps:
1. In the app, go to **"Library"** tab
2. Download a paper (if you haven't already)
3. Go to **"My Downloads"** tab
4. Tap on a downloaded PDF

### What to Look For in Console:

**Success:**
```
📄 Opening paper: [Title]
📁 Local path: exam-papers/[filename].pdf
📝 Reading file: [filename].pdf
📖 Reading file: exam-papers/[filename].pdf
✅ File read successfully, data length: 123456 chars
✅ PDF loaded successfully
```

**Failure:**
```
❌ Failed to read file [filename]: [error message]
❌ Failed to open paper: [error message]
```

### Common Issues:

**"File not found"**
- The file wasn't saved during download
- Solution: Re-download the paper

**"Data length: 0"**
- File is empty or corrupted
- Solution: Delete and re-download

## 📋 Test 2: Download Tracking

### ⚠️ FIRST: Apply Database Migration

Before testing download tracking, you MUST apply the quota migration:

1. Go to https://supabase.com/dashboard
2. Select project: **aaayzhvqgqptgqaxxbdh**
3. Click **SQL Editor** → **New Query**
4. Open file: `supabase/migrations/010_download_quota_system.sql`
5. Copy ALL contents
6. Paste into SQL Editor
7. Click **Run**

### Steps:
1. In the app, go to **"Library"** tab
2. Find a paper you haven't downloaded
3. Tap **"Download"**
4. Wait for download to complete

### What to Look For in Console:

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

**Failure (if migration not applied):**
```
❌ Failed to track download count: Could not find the function public.increment_download_with_quota
```

**Failure (other):**
```
❌ Failed to track download count: [error message]
```

## 📋 Test 3: Delete Functionality

### Steps:
1. Go to **"My Downloads"** tab
2. **Long-press** on a downloaded PDF (hold for 1-2 seconds)
3. A delete button should appear
4. Tap the delete button
5. Confirm deletion

### What to Look For:
- Delete button appears after long press
- PDF is removed from the list
- Toast message: "Paper deleted"

## 🐛 Troubleshooting

### Can't see Chrome DevTools?
- Make sure Chrome is open
- Go to `chrome://inspect`
- Wait 10-20 seconds for devices to appear
- Make sure the app is running on the emulator

### Emulator is slow?
- This is normal for Android emulators
- Give it time to load
- The first launch is always slower

### App crashes?
- Check Chrome DevTools console for error messages
- Look for red error messages
- Share the error with me

### Download tracking not working?
- Did you apply the migration? (See Test 2 above)
- Check console for error messages
- The migration MUST be applied first

## 📊 Verify in Database

After testing, you can verify in Supabase:

```sql
-- Check download counts
SELECT id, title, downloads 
FROM exam_papers 
WHERE downloads > 0 
ORDER BY downloads DESC 
LIMIT 10;

-- Check quota tracking
SELECT * 
FROM user_download_quotas 
ORDER BY updated_at DESC 
LIMIT 5;
```

## 🎯 Expected Results

After successful testing:

1. ✅ PDFs open and display correctly
2. ✅ Console shows detailed logs for each step
3. ✅ Download counts increment in database
4. ✅ Quota tracking works (after migration applied)
5. ✅ Delete functionality works

## 📝 Notes

- All logs start with emojis (📄, 📁, 📝, ✅, ❌) for easy identification
- Green ✅ means success
- Red ❌ means error
- The logs show exactly what's happening at each step
- This makes debugging much easier!

## 🆘 Need Help?

If something doesn't work:
1. Check Chrome DevTools console
2. Look for ❌ error messages
3. Copy the error message
4. Share it with me along with what you were trying to do
