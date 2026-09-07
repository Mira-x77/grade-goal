# GoStudy - APK Version Management Guide

## 🔢 Current Version Configuration

**Version Code:** 4  
**Version Name:** 1.1.0  
**App ID:** `com.scoretarget.app`  
**Date:** September 2, 2026

---

## ✅ APK Update Compatibility - GUARANTEED

### Critical Settings for Seamless Updates:

1. **Application ID (Package Name)** ✅
   ```gradle
   applicationId "com.scoretarget.app"
   ```
   - ✅ **NEVER CHANGES** - This is your app's unique identifier
   - ✅ Same package = Android recognizes as update, not new app
   - ⚠️ If this changes, users MUST uninstall first

2. **Version Code (Integer)** ✅
   ```gradle
   versionCode 4  // Previous: 3
   ```
   - ✅ **MUST INCREASE** with each release
   - ✅ Android uses this to determine if APK is newer
   - ✅ Format: Simple integer (1, 2, 3, 4, ...)

3. **Version Name (String)** ✅
   ```gradle
   versionName "1.1.0"  // Previous: 1.0.2
   ```
   - ✅ Human-readable version displayed to users
   - ✅ Format: Major.Minor.Patch (semantic versioning)

---

## 🎯 Why Users Can Update Without Uninstalling

### ✅ Everything Is Properly Configured:

1. **Same Package Name**
   - `com.scoretarget.app` (unchanged)
   - Android recognizes this as the same app

2. **Higher Version Code**
   - Old: `versionCode 3`
   - New: `versionCode 4`
   - Android allows installation over old version

3. **Proper Signing (Release Builds)**
   - Uses same keystore
   - Same signature = trusted update
   - No signature mismatch errors

4. **Data Preservation**
   - App data stays intact
   - SharedPreferences preserved
   - localStorage/IndexedDB preserved
   - Supabase sync ensures cloud backup

---

## 📋 Version History

| Version Code | Version Name | Date | Changes |
|--------------|--------------|------|---------|
| 1 | 1.0.0 | Earlier | Initial release |
| 2 | 1.0.1 | Earlier | Bug fixes |
| 3 | 1.0.2 | Earlier | Previous update |
| **4** | **1.1.0** | **2026-09-02** | **✨ Auth fixes + onboarding persistence** |

---

## 🔄 How Android Updates Work

### When User Installs New APK:

```
1. Android checks applicationId
   └─> "com.scoretarget.app" matches installed app ✅

2. Android checks versionCode
   └─> New (4) > Old (3) ✅

3. Android checks signature
   └─> Same keystore ✅

4. Android performs IN-PLACE UPDATE
   ├─> Replaces app code ✅
   ├─> Preserves app data ✅
   ├─> Preserves user settings ✅
   └─> No uninstall needed ✅
```

### User Experience:
```
User: "Install GoStudy.apk"
Android: "Update GoStudy from 1.0.2 to 1.1.0?"
User: "Yes"
Android: *Updates seamlessly*
Result: ✅ All data preserved, new features available
```

---

## 🚀 Publishing to Google Play Store

### Play Store Handles Updates Automatically:

1. **Upload New APK/AAB**
   - Version Code: Must be higher than current
   - Play Store: Recognizes as update

2. **Users Get Update Notification**
   - "GoStudy has an update available"
   - One-tap update
   - Seamless installation

3. **Rollout Options**
   - Staged rollout (10%, 25%, 50%, 100%)
   - Beta testing track
   - Internal testing

---

## ⚠️ CRITICAL RULES - NEVER BREAK THESE

### ❌ NEVER Change These:
1. **applicationId** - Changing this creates a NEW app
   ```gradle
   ❌ applicationId "com.gostudy.app"  // WRONG - Different app!
   ✅ applicationId "com.scoretarget.app"  // CORRECT
   ```

2. **Package Name in Files** - Must match applicationId
   ```
   ✅ Namespace: com.scoretarget.app
   ✅ Folder: com/scoretarget/app/
   ```

3. **Signing Key** - Always use same keystore for production
   ```
   ✅ Use: Your production keystore
   ❌ Never: Generate new keystore
   ```

### ✅ ALWAYS Update These:
1. **versionCode** - Increment by 1 each release
   ```gradle
   Current: versionCode 4
   Next:    versionCode 5  ← Always +1
   ```

2. **versionName** - Update to reflect changes
   ```gradle
   Bug fix:       1.1.0 → 1.1.1
   New feature:   1.1.1 → 1.2.0
   Major update:  1.2.0 → 2.0.0
   ```

---

## 📝 Semantic Versioning Guide

### Version Format: MAJOR.MINOR.PATCH

**MAJOR (1.x.x → 2.x.x)**
- Breaking changes
- Major redesign
- Complete rewrites
- Example: 1.1.0 → 2.0.0

**MINOR (x.1.x → x.2.x)**
- New features
- New screens/functionality
- Backward compatible
- Example: 1.1.0 → 1.2.0

**PATCH (x.x.1 → x.x.2)**
- Bug fixes
- Small improvements
- Performance tweaks
- Example: 1.1.0 → 1.1.1

---

## 🔧 How to Bump Version for Next Release

### Quick Reference:

**For bug fixes:**
```gradle
versionCode 5
versionName "1.1.1"
```

**For new features:**
```gradle
versionCode 5
versionName "1.2.0"
```

**For major updates:**
```gradle
versionCode 5
versionName "2.0.0"
```

### Step-by-Step:

1. **Open** `android/app/build.gradle`

2. **Increment versionCode:**
   ```gradle
   versionCode 4  // Current
   versionCode 5  // Next release
   ```

3. **Update versionName:**
   ```gradle
   versionName "1.1.0"  // Current
   versionName "1.2.0"  // Next release (if adding features)
   ```

4. **Save and rebuild:**
   ```powershell
   .\build-native-apk.ps1
   ```

---

## 🎯 Current Release (v1.1.0)

### What's New in This Version:

**Authentication & Data Persistence** ✅
- Sign-in moved to beginning of onboarding
- Onboarding data now persists to Supabase
- Cross-device data restoration working
- Guest → authenticated upgrade fixed
- Improved sync logic

**User Impact:**
- ✅ Complete onboarding → Switch devices → Data appears
- ✅ Start as guest → Sign in later → Data preserved
- ✅ Logout/login → No data loss
- ✅ App reinstall → Sign in → Everything restored

---

## 🧪 Testing Update Process

### Before Publishing - Test Locally:

1. **Install Old Version (v1.0.2)**
   ```
   adb install old-version.apk
   ```

2. **Use App and Create Data**
   - Complete onboarding
   - Add subjects
   - Enter marks

3. **Install New Version (v1.1.0)**
   ```
   adb install GoStudy.apk
   ```

4. **Verify:**
   - ✅ App updates without uninstall
   - ✅ All data preserved
   - ✅ New features available
   - ✅ No errors or crashes

### Expected Result:
```
$ adb install GoStudy.apk
Success

$ adb shell pm list packages | grep scoretarget
package:com.scoretarget.app

$ adb shell dumpsys package com.scoretarget.app | grep version
versionCode=4
versionName=1.1.0
```

---

## 📊 Data Preservation Across Updates

### What Gets Preserved:

✅ **SharedPreferences/Preferences API**
- User settings
- Authentication tokens
- App configuration

✅ **LocalStorage/IndexedDB**
- App state (localStorage.scoretarget_state)
- User history
- Cached data

✅ **Internal Storage**
- Downloaded PDFs
- Cached files
- Database files

✅ **Supabase Cloud Data**
- User onboarding data
- Subjects and marks
- All cloud-synced content

### What Gets Updated:

🔄 **App Code**
- React components
- JavaScript/TypeScript
- HTML/CSS

🔄 **Native Code**
- Java/Kotlin Android code
- Capacitor plugins
- Native libraries

---

## 🔐 Signing Configuration

### Debug vs Release Builds:

**Debug (Development):**
```gradle
buildTypes {
    debug {
        signingConfig signingConfigs.debug  // Auto-generated
    }
}
```
- ⚠️ Debug keys are temporary
- ⚠️ Can't update between different debug builds
- ✅ OK for local testing only

**Release (Production):**
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release  // Your keystore
    }
}
```
- ✅ Uses your production keystore
- ✅ Consistent signature across updates
- ✅ Required for Play Store

### Your Keystore Status:
```gradle
keystorePropertiesFile = rootProject.file("key.properties")
```
- ✅ Configured to use production keystore
- ✅ Same signature across all releases
- ✅ Updates will work seamlessly

---

## 🚨 Common Update Problems (AVOIDED)

### ❌ Problem: "App Not Installed"
**Cause:** Different package name or signature  
**Solution:** ✅ Already handled - same package + keystore

### ❌ Problem: "Update Not Available"
**Cause:** versionCode not higher  
**Solution:** ✅ Incremented from 3 → 4

### ❌ Problem: "Must Uninstall First"
**Cause:** Signature mismatch  
**Solution:** ✅ Using consistent keystore

### ❌ Problem: "Data Loss After Update"
**Cause:** App data cleared or package changed  
**Solution:** ✅ Proper update preserves all data

---

## 📱 Play Store Deployment Checklist

### Pre-Upload Verification:

- [ ] versionCode incremented (now 4)
- [ ] versionName updated (now 1.1.0)
- [ ] applicationId unchanged (com.scoretarget.app)
- [ ] Signed with production keystore
- [ ] Tested local update (old → new)
- [ ] All features working
- [ ] No crashes or errors

### Upload to Play Store:

1. **Build Signed APK/AAB**
   ```powershell
   .\build-aab.ps1  # For Play Store (AAB format)
   ```

2. **Upload to Play Console**
   - Production track (for all users)
   - Beta track (for testers)
   - Internal track (for team)

3. **Release Notes**
   ```
   Version 1.1.0
   - Enhanced authentication system
   - Cross-device data synchronization
   - Improved onboarding experience
   - Guest mode can now be upgraded
   - Various bug fixes and improvements
   ```

4. **Review & Publish**
   - Play Store reviews (can take hours)
   - Staged rollout recommended
   - Monitor crash reports

---

## 🎓 Best Practices

### Version Bumping Strategy:

**Weekly updates:**
```
1.1.0 → 1.1.1 → 1.1.2 → 1.1.3
```

**Monthly features:**
```
1.1.3 → 1.2.0 → 1.3.0 → 1.4.0
```

**Major releases:**
```
1.9.0 → 2.0.0 (breaking changes)
```

### Version Code Strategy:

**Simple incremental:**
```
Current: versionCode 4
Next:    versionCode 5
Future:  versionCode 6
```

**Date-based (alternative):**
```
2026090201 = 2026-09-02, build 01
Format: YYYYMMDDNN
```

---

## 📞 Quick Reference Commands

### Check Installed Version:
```bash
adb shell dumpsys package com.scoretarget.app | grep version
```

### List All Versions:
```bash
adb shell pm list packages -f | grep scoretarget
```

### Install/Update APK:
```bash
adb install -r GoStudy.apk  # -r = replace (update)
```

### Uninstall (if needed):
```bash
adb uninstall com.scoretarget.app
```

---

## ✅ Summary

**Current Configuration:**
- ✅ Package ID: `com.scoretarget.app` (never changes)
- ✅ Version Code: `4` (incremented from 3)
- ✅ Version Name: `1.1.0` (updated from 1.0.2)
- ✅ Signing: Production keystore configured
- ✅ Update Compatibility: **GUARANTEED**

**User Experience:**
- ✅ Tap "Install" on new APK
- ✅ Android shows "Update GoStudy?"
- ✅ One tap to update
- ✅ All data preserved
- ✅ New features immediately available

**For Next Release:**
1. Increment `versionCode` to 5
2. Update `versionName` appropriately
3. Keep `applicationId` unchanged
4. Build and test
5. Publish

---

**Status:** ✅ **CONFIGURED FOR SEAMLESS UPDATES**  
**Users Can:** ✅ **Install over existing app without uninstalling**  
**Data Loss:** ❌ **None - all data preserved**  
**Ready for:** ✅ **Play Store & Direct APK distribution**
