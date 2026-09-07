# 📱 Build iOS App on Mac

## ⚠️ Important
iOS apps **cannot** be built on Windows. You need a Mac to build the iOS app.

## 🚀 Quick Steps on Mac

### 1. Transfer Project Files
Copy the entire `grade-goal` folder to your Mac

### 2. Open Terminal and Navigate
```bash
cd /path/to/grade-goal
```

### 3. Install Dependencies (if needed)
```bash
npm install --legacy-peer-deps
```

### 4. Open iOS Project in Xcode
```bash
npx cap open ios
```

### 5. Build and Run
In Xcode:
- Select a **simulator** (e.g., iPhone 15 Pro) or your connected iPhone
- Click the ▶️ **Play** button
- App will launch!

## 📲 To Install on Your iPhone

### Option A: Direct Install (Easy)
1. Connect iPhone to Mac with USB cable
2. Trust Mac on iPhone when prompted
3. In Xcode, select your iPhone from device dropdown
4. Click Play button ▶️
5. If "untrusted developer" error: iPhone Settings → General → VPN & Device Management → Trust Developer

### Option B: Create .ipa File for Distribution
1. In Xcode: Product → Archive
2. Wait for build to complete
3. Click "Distribute App"
4. Choose "Ad Hoc" or "Development"
5. Follow wizard to export .ipa file
6. Use Apple Configurator or AltStore to install on iPhone

## 🌐 Alternative: Use Cloud Build (No Mac!)

### Using Codemagic (Recommended)
1. Go to https://codemagic.io
2. Sign up (free tier available)
3. Connect your GitHub repo
4. Configure iOS build
5. Download .ipa file
6. Install via AltStore or TestFlight

### Using Ionic Appflow
1. Sign up at https://ionic.io/appflow
2. Link your project
3. Build iOS in cloud
4. Download .ipa

## ✅ Project is Ready
- Web assets already synced to iOS
- All plugins configured
- Just needs Xcode to build!

## 📁 Files Location
- iOS project: `grade-goal/ios/`
- Built web app: `grade-goal/dist/`
- Config: `grade-goal/capacitor.config.json`

---

**Your Android APK is already on Desktop: `ScoreTarget-GoStudy.apk`** ✅
