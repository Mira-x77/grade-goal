# APK Build Process for GoStudy App

## Overview
This document outlines the complete process for building an Android APK from the React/Vite web app using Capacitor.

## Prerequisites
- Node.js and npm installed
- Java JDK 21 installed
- Android SDK installed (or use Bubblewrap's SDK at ~/.bubblewrap/android_sdk)
- Capacitor CLI installed globally

## Current Project Configuration

### Capacitor Config (`capacitor.config.json`)
```json
{
  "appId": "com.scoretarget.app",
  "appName": "ScoreTarget",
  "webDir": "dist",
  "plugins": {
    "App": {
      "launchUrl": "gostudy.app"
    }
  }
}
```

### Package.json Build Script
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

## Step-by-Step Build Process

### 1. Build the Web App
```bash
npm run build
```
**What it does:**
- Compiles React/TypeScript code using Vite
- Creates optimized production build in `dist/` folder
- Bundles all assets, CSS, and JavaScript
- Build time: ~35 seconds

**Output:** `dist/` folder with compiled web assets

### 2. Sync Web Assets to Android
```bash
npx cap sync android
```
**What it does:**
- Copies `dist/` folder contents to `android/app/src/main/assets/public`
- Updates Capacitor configuration in Android project
- Syncs all 12 Capacitor plugins
- Updates Android plugins and dependencies

**Output:** Updated Android project with latest web assets

### 3. Build the APK
```bash
cd android
./gradlew assembleDebug
```
**What it does:**
- Compiles Android native code
- Packages web assets into APK
- Creates debug-signed APK for testing
- Build time: ~4-5 minutes

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Move APK to Desktop (Optional)
```bash
Copy-Item "android/app/build/outputs/apk/debug/app-debug.apk" "C:/Users/mira/Desktop/gostudy.apk"
```

## Included Capacitor Plugins
The app includes 12 Capacitor plugins:
- @capacitor-community/device@8.0.0
- @capacitor-community/file-opener@8.0.0
- @capacitor/app@8.0.1
- @capacitor/browser@8.0.3
- @capacitor/filesystem@8.1.2
- @capacitor/haptics@8.0.2
- @capacitor/local-notifications@8.0.2
- @capacitor/preferences@8.0.1
- @capacitor/screen-orientation@8.0.1
- @capacitor/share@8.0.1
- @capacitor/splash-screen@8.0.1
- @capacitor/status-bar@8.0.1

## Build Warnings & Notes

### Known Warnings (Non-blocking)
1. **Duplicate keys in i18n.ts** - Multiple duplicate translation keys found but don't prevent build
2. **Large chunk size** - Main bundle is 1.6MB (consider code splitting for optimization)
3. **Dynamic imports** - Some Capacitor modules are both statically and dynamically imported

### Build Output Size
- **CSS:** 98.82 kB (gzipped: 16.45 kB)
- **JavaScript:** 1,601.67 kB (gzipped: 453.64 kB)
- **Total APK:** ~4-5MB (estimated)

## Troubleshooting

### Common Issues
1. **Gradle build fails:** Ensure JAVA_HOME and ANDROID_HOME are set correctly
2. **Capacitor sync fails:** Check that `dist/` folder exists and contains built assets
3. **APK won't install:** Ensure device allows installation from unknown sources

### Environment Variables (if needed)
```bash
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
$env:ANDROID_HOME = "C:\Users\<username>\.bubblewrap\android_sdk"
```

## Release Build (Production)
For production APK:
```bash
./gradlew assembleRelease
```
**Note:** Requires signing configuration for Play Store distribution

## Key Features of Built APK
- **Fully Offline:** All web assets bundled in APK
- **Native Integration:** Full access to device features via Capacitor plugins
- **Performance:** Optimized build with tree-shaking and minification
- **Cross-Platform:** Same codebase for web and mobile

## File Structure After Build
```
android/
├── app/
│   ├── src/main/assets/public/  # Web assets (HTML, CSS, JS)
│   └── build/outputs/apk/debug/
│       └── app-debug.apk        # Final APK
└── ...
```

## Last Successful Build
- **Date:** [Current Date]
- **Build Time:** ~5 minutes total
- **APK Location:** `C:/Users/mira/Desktop/gostudy.apk`
- **Status:** ✅ Success

---

*This process has been tested and verified to work with the current project configuration.*