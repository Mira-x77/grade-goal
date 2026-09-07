# Android 8 Debugging Guide

## Fixes Applied

### 1. WebView Configuration Improvements
Updated `MainActivity.java` to explicitly enable:
- **JavaScript** - Required for React app
- **DOM Storage** - Required for modern web apps (localStorage, sessionStorage)
- **Database** - For IndexedDB support
- **File Access** - For Capacitor filesystem plugin
- **Mixed Content** - Allows HTTPS/HTTP mixing on Android 5.0+
- **Console Logging** - Added WebChromeClient to capture JavaScript console errors

### 2. Build Target Optimizations
Updated `vite.config.ts` to compile for older WebView versions:
- **ES2015 target** - Better compatibility with Android 8 WebView (Chrome 61)
- **Chrome 61 CSS target** - Ensures CSS features are compatible

### 3. Key Changes Made:
```
├── vite.config.ts - Added es2015/chrome61 build targets
├── android/app/.../MainActivity.java - Enhanced WebView settings
└── Rebuilt with compatibility fixes
```

## Testing the Fixed APK

### Install and Test:
```bash
# New APK location
ScoreTarget-debug-fixed.apk
```

## If Still Seeing Blank Screen

### Step 1: Check Console Logs via Chrome DevTools

1. **Enable USB Debugging** on your Android device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device to computer** via USB

3. **Open Chrome DevTools**:
   - Open Chrome browser on your computer
   - Navigate to: `chrome://inspect`
   - Your device should appear
   - Click "inspect" under the ScoreTarget app

4. **Look for JavaScript errors** in the console:
   - Red errors indicate what's breaking
   - Common issues:
     - Network errors (Supabase connection)
     - Service Worker errors
     - JavaScript syntax errors

### Step 2: View Android Logs (Logcat)

```bash
# From your computer with device connected
adb logcat | grep -i "WebView\|MainActivity\|Capacitor"
```

Look for:
- `MainActivity: WebView configured successfully` - WebView initialized
- Any ERROR lines related to WebView, Capacitor, or your app
- JavaScript console messages (prefixed with "WebView Console:")

### Step 3: Common Android 8 Issues

#### Issue: White/Blank Screen, No Errors
**Possible Causes:**
- Service Worker not loading correctly
- Base path issues in index.html
- Cached old version

**Solutions:**
1. Clear app data: Settings → Apps → ScoreTarget → Storage → Clear Data
2. Uninstall and reinstall the APK
3. Check if files are loading: Look in DevTools Network tab

#### Issue: "Cannot connect to server"
**Possible Causes:**
- Internet permission not granted
- CORS issues with Supabase
- Network security config

**Solutions:**
1. Check AndroidManifest.xml has `<uses-permission android:name="android.permission.INTERNET" />`
2. Verify device has internet connection
3. Test Supabase URL in Chrome browser on device

#### Issue: JavaScript Errors about "Cannot read property..."
**Possible Causes:**
- Browser API not available on Android 8
- ES6+ features not transpiled

**Solutions:**
1. Check which API is failing in console
2. May need additional polyfills

### Step 4: Test Minimal WebView

To verify WebView itself works, you can test with a simple HTML page:

```bash
# Add to android/app/src/main/assets/public/test.html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>WebView Works!</h1>
  <script>
    console.log('JavaScript works!');
    alert('If you see this, WebView is working');
  </script>
</body>
</html>
```

Then navigate to the test page by modifying the app or accessing directly.

## Additional Debugging Commands

### Check WebView Version on Device:
```bash
adb shell pm list packages | grep webview
adb shell dumpsys package com.android.webview | grep version
```

### Check App Installation:
```bash
adb shell pm list packages | grep scoretarget
```

### Clear App Data Remotely:
```bash
adb shell pm clear com.scoretarget.app
```

### Reinstall APK:
```bash
adb install -r ScoreTarget-debug-fixed.apk
```

## What Changed vs Previous Build

### WebSettings Enabled:
- ✅ JavaScript explicitly enabled
- ✅ DOM Storage enabled (localStorage/sessionStorage)
- ✅ Database enabled (IndexedDB)
- ✅ File access enabled
- ✅ Mixed content allowed
- ✅ Console logging to Android logcat

### Build Configuration:
- ✅ ES2015 target (was: default/esnext)
- ✅ Chrome 61 CSS compatibility

### Console Logging:
All JavaScript console.log/error/warn now visible in:
1. Chrome DevTools (chrome://inspect)
2. Android Logcat (adb logcat)

## Next Steps

1. **Install the fixed APK**: `ScoreTarget-debug-fixed.apk`
2. **Open Chrome DevTools**: `chrome://inspect` on your computer
3. **Launch the app** on your device
4. **Check console** for any error messages
5. **Report back** with specific error messages if still blank

## Known Working Configuration

- ✅ Minimum SDK: 24 (Android 7.0)
- ✅ Target SDK: 36 (Android 14)
- ✅ Android 8 (API 26): Supported
- ✅ WebView: Chrome 61+ compatible
- ✅ Capacitor: 8.x with 12 plugins

## If All Else Fails

Consider these alternatives:
1. **Test on Android 9+** - Verify issue is Android 8 specific
2. **Build with older Vite** - Some bundlers have better legacy support
3. **Disable Service Worker** - May be causing issues on Android 8
4. **Use Crosswalk WebView** - Alternative WebView with better compatibility

---

**Remember**: The app now logs everything to console. Use Chrome DevTools to see exactly what's happening!
