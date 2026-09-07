# Quick Start - Testing the Fixed App

## ✅ Status: App is Running!

The app is installed and running on emulator-5556.

## 🚀 Quick Steps

### 1. Open Chrome DevTools (REQUIRED!)
```
1. Open Chrome
2. Go to: chrome://inspect
3. Find "com.scoretarget.app"
4. Click "inspect"
5. Go to "Console" tab
```

### 2. Test PDF Opening
```
1. App → Library → Download a paper
2. App → My Downloads → Tap the paper
3. Check console for logs (📄, 📁, 📝, ✅)
```

### 3. Apply Database Migration (ONE TIME)
```
1. Go to: https://supabase.com/dashboard
2. Project: aaayzhvqgqptgqaxxbdh
3. SQL Editor → New Query
4. Copy: supabase/migrations/010_download_quota_system.sql
5. Paste and Run
```

### 4. Test Download Tracking
```
1. App → Library → Download a new paper
2. Check console for: ✅ Download count incremented
3. Verify in Supabase SQL Editor:
   SELECT * FROM exam_papers WHERE downloads > 0;
```

## 📊 What You'll See

**Console Logs:**
- 📄 = Opening file
- 📁 = File path
- 📝 = Reading file
- ✅ = Success
- ❌ = Error

**Success Example:**
```
📄 Opening paper: Math 2024
📁 Local path: exam-papers/math-2024.pdf
📝 Reading file: math-2024.pdf
✅ File read successfully, data length: 234567 chars
✅ PDF loaded successfully
```

## 🎯 Expected Results

After testing:
- ✅ PDFs open and display
- ✅ Downloads are counted
- ✅ Delete works
- ✅ Console shows detailed logs

## 🐛 If Something Fails

1. Check Chrome DevTools console
2. Look for ❌ error messages
3. Share the error message

## 📱 Emulator Info

- Device: emulator-5556
- App: com.scoretarget.app
- APK: android/app/build/outputs/apk/debug/app-debug.apk

## 🔄 Restart App

If needed:
```bash
adb -s emulator-5556 shell am force-stop com.scoretarget.app
adb -s emulator-5556 shell am start -n com.scoretarget.app/.MainActivity
```

## 📚 Full Details

See `TESTING_GUIDE.md` for complete testing instructions.
