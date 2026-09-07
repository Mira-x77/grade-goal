# Check PDF Loading Logs

## 🔍 To See What's Failing:

1. **Open Chrome** on your computer
2. Go to: `chrome://inspect`
3. Find **"com.scoretarget.app"** in the list
4. Click **"inspect"**
5. Go to **"Console"** tab
6. Try to open a PDF in the app
7. **Look for these logs:**

### Expected Logs (Success):
```
📄 Opening paper: [Title]
📁 Local path: exam-papers/[filename].pdf
📝 Reading file: [filename].pdf
📖 Reading file: exam-papers/[filename].pdf
✅ File read successfully, data length: 234567 chars
✅ PDF loaded successfully
```

### Error Logs (Failure):
```
❌ Failed to read file [filename]: [ERROR MESSAGE HERE]
❌ Failed to open paper: [ERROR MESSAGE HERE]
```

## 📋 Common Errors & Solutions:

### Error: "File not found"
**Cause:** PDF wasn't saved during download
**Solution:** Re-download the PDF

### Error: "Unable to read file"
**Cause:** File path is wrong or file is corrupted
**Solution:** 
1. Delete the PDF from My Downloads
2. Download it again

### Error: "Data length: 0"
**Cause:** File is empty
**Solution:** Re-download the PDF

### Error: "Permission denied"
**Cause:** App doesn't have storage permission
**Solution:** 
1. Go to Android Settings
2. Apps → Grade Goal
3. Permissions → Storage → Allow

## 🐛 If You Can't See Chrome DevTools:

1. Make sure Chrome is open
2. Make sure the app is running on the emulator
3. Wait 10-20 seconds for the device to appear
4. Try refreshing the `chrome://inspect` page

## 📱 Alternative: Check Android Logcat

If Chrome DevTools doesn't work, you can check Android logs:

```bash
adb -s emulator-5556 logcat | findstr "PDF\|Download\|File\|Error"
```

This will show system-level errors.

## 🆘 What to Share:

When reporting the issue, please share:
1. The **exact error message** from console (copy/paste)
2. What you were trying to do (which PDF, which action)
3. Screenshot of the error if possible

The error message will tell me exactly what's wrong!
