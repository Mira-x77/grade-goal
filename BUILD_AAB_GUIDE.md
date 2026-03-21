# 📦 Building AAB (Android App Bundle) for Google Play Store

This guide will help you build a signed AAB file for publishing to Google Play Store.

---

## Prerequisites

- ✅ JDK 21 installed
- ✅ Android SDK configured
- ✅ App built and tested

---

## Step 1: Generate Signing Key (First Time Only)

### Create Keystore File

Run this command in your project root:

```powershell
keytool -genkey -v -keystore scoretarget-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias scoretarget
```

### You'll be prompted for:

1. **Keystore password**: Choose a strong password (SAVE THIS!)
2. **First and last name**: Your name or company name
3. **Organizational unit**: Your team/department (e.g., "Development")
4. **Organization**: Your company name (e.g., "ScoreTarget")
5. **City**: Your city
6. **State**: Your state/province
7. **Country code**: Two-letter code (e.g., "TG" for Togo)
8. **Confirm**: Type "yes"
9. **Key password**: Can be same as keystore password

### Important Notes:

⚠️ **SAVE YOUR PASSWORDS!** You'll need them for every release.
⚠️ **BACKUP YOUR KEYSTORE!** If you lose it, you can't update your app on Play Store.
⚠️ **NEVER commit keystore to Git!** Keep it secure.

The keystore file `scoretarget-release-key.jks` will be created in your project root.

---

## Step 2: Configure Signing

### Edit `android/key.properties`

Replace the placeholder passwords with your actual passwords:

```properties
storePassword=YOUR_ACTUAL_KEYSTORE_PASSWORD
keyPassword=YOUR_ACTUAL_KEY_PASSWORD
keyAlias=scoretarget
storeFile=../scoretarget-release-key.jks
```

**Example:**
```properties
storePassword=MySecurePass123!
keyPassword=MySecurePass123!
keyAlias=scoretarget
storeFile=../scoretarget-release-key.jks
```

⚠️ **Add to .gitignore:**
```
android/key.properties
scoretarget-release-key.jks
```

---

## Step 3: Update Version (Before Each Release)

Edit `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.scoretarget.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2        // Increment this for each release (1, 2, 3, ...)
    versionName "1.1"    // Update this (1.0, 1.1, 2.0, ...)
    // ...
}
```

**Version Rules:**
- `versionCode`: Integer that MUST increase with each release (1, 2, 3, 4...)
- `versionName`: Human-readable version (1.0, 1.1, 2.0, etc.)

---

## Step 4: Build the AAB

### Option A: Using PowerShell (Recommended)

```powershell
# Set environment variables
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:ANDROID_HOME = "C:\Users\mira\.bubblewrap\android_sdk"

# Build web app
npm run build

# Sync with Android
npx cap sync android

# Build AAB
cd android
./gradlew bundleRelease
cd ..
```

### Option B: Using Android Studio

1. Open Android Studio
2. Open project: `android` folder
3. **Build → Generate Signed Bundle / APK**
4. Select **Android App Bundle**
5. Choose your keystore file
6. Enter passwords
7. Select **release** build variant
8. Click **Finish**

---

## Step 5: Locate Your AAB

The AAB file will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Copy to Desktop:

```powershell
Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" -Destination "$env:USERPROFILE\Desktop\ScoreTarget-release.aab" -Force
```

---

## Step 6: Test Your AAB (Optional but Recommended)

### Install bundletool:

Download from: https://github.com/google/bundletool/releases

### Generate APKs from AAB:

```powershell
java -jar bundletool.jar build-apks --bundle=ScoreTarget-release.aab --output=ScoreTarget.apks --mode=universal
```

### Extract and install:

```powershell
unzip ScoreTarget.apks -d apks
adb install apks/universal.apk
```

---

## Step 7: Upload to Google Play Console

1. Go to: https://play.google.com/console
2. Select your app (or create new app)
3. **Production → Create new release**
4. Upload `app-release.aab`
5. Fill in release notes
6. Review and rollout

---

## Quick Build Script

Save this as `build-aab.ps1`:

```powershell
# ScoreTarget AAB Builder
Write-Host "🚀 Building ScoreTarget AAB..." -ForegroundColor Cyan

# Environment
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:ANDROID_HOME = "C:\Users\mira\.bubblewrap\android_sdk"

# Build
Write-Host "📦 Building web app..." -ForegroundColor Yellow
npm run build

Write-Host "🔄 Syncing with Android..." -ForegroundColor Yellow
npx cap sync android

Write-Host "🔨 Building AAB..." -ForegroundColor Yellow
cd android
./gradlew bundleRelease
cd ..

# Copy to desktop
Write-Host "📋 Copying to Desktop..." -ForegroundColor Yellow
Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" -Destination "$env:USERPROFILE\Desktop\ScoreTarget-release.aab" -Force

Write-Host "✅ Done! AAB is on your Desktop." -ForegroundColor Green
```

Run with: `.\build-aab.ps1`

---

## Troubleshooting

### Error: "Keystore not found"
- Check that `scoretarget-release-key.jks` is in project root
- Verify path in `android/key.properties`

### Error: "Incorrect password"
- Double-check passwords in `android/key.properties`
- Make sure no extra spaces

### Error: "versionCode must be greater"
- Increment `versionCode` in `android/app/build.gradle`

### Error: "JAVA_HOME not set"
- Set JAVA_HOME to JDK 21 path
- Verify with: `$env:JAVA_HOME`

---

## File Sizes

- **APK (Debug)**: ~6 MB
- **AAB (Release)**: ~4-5 MB (smaller than APK)
- **Play Store Download**: ~3-4 MB (optimized per device)

---

## Important Notes

✅ **AAB is required** for new apps on Google Play (since August 2021)
✅ **AAB is smaller** than APK and optimized per device
✅ **Always increment versionCode** before building new release
✅ **Test thoroughly** before uploading to Play Store
✅ **Keep keystore safe** - you can't update app without it

---

## Next Steps After Building

1. ✅ Test the AAB thoroughly
2. ✅ Prepare store listing (screenshots, description, icon)
3. ✅ Set up pricing and distribution
4. ✅ Upload AAB to Play Console
5. ✅ Submit for review

Good luck with your Play Store launch! 🚀
