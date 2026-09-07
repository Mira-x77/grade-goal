# 📱 iOS Build Guide for ScoreTarget App

## ✅ Setup Complete!

Your grade-goal app is now ready for iOS! The web assets have been synced to the iOS project.

---

## 🍎 Building for iOS

### Prerequisites

You need a **Mac computer** to build iOS apps. Windows cannot build iOS apps natively.

### Option 1: Build on Your Mac (Recommended)

1. **Transfer project to Mac**
   ```bash
   # Copy the entire grade-goal folder to your Mac
   ```

2. **Install Xcode** (if not already installed)
   - Download from Mac App Store (free)
   - Size: ~12 GB
   - Takes about 30-60 minutes to install

3. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

4. **Install CocoaPods** (iOS dependency manager)
   ```bash
   sudo gem install cocoapods
   ```

5. **Navigate to your project**
   ```bash
   cd /path/to/grade-goal
   ```

6. **Install npm dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

7. **Build the web app**
   ```bash
   npm run build
   ```

8. **Sync to iOS**
   ```bash
   npx cap sync ios
   ```

9. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

10. **Build and Run**
    - In Xcode, select a simulator or connected iPhone
    - Click the ▶️ Play button
    - App will launch on the device/simulator

---

### Option 2: Use Cloud Build Services (No Mac Required!)

#### A. Using Expo Application Services (EAS)

While your app uses Capacitor (not Expo), you can use **Expo EAS Build** for Capacitor apps:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS** (create `eas.json` in your project root)
   ```json
   {
     "build": {
       "production": {
         "ios": {
           "simulator": false
         }
       },
       "development": {
         "ios": {
           "simulator": true
         }
       }
     }
   }
   ```

4. **Build iOS App**
   ```bash
   # For simulator (no Apple Developer account needed)
   eas build --platform ios --profile development
   
   # For real device (requires Apple Developer account - $99/year)
   eas build --platform ios --profile production
   ```

5. **Download and Install**
   - EAS will build in the cloud
   - You'll get a download link for the `.app` or `.ipa` file

#### B. Using Ionic Appflow (Easier for Capacitor)

1. **Sign up at** https://ionic.io/appflow

2. **Install Appflow CLI**
   ```bash
   npm install -g @ionic/cli
   ```

3. **Link your app**
   ```bash
   ionic login
   ionic link
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Prepare for iOS build"
   git push ionic main
   ```

5. **Build in Appflow Dashboard**
   - Go to Appflow dashboard
   - Select your app
   - Click "Start Build"
   - Choose iOS
   - Download the `.ipa` file

#### C. Using Codemagic (Most Complete Solution)

1. **Sign up at** https://codemagic.io (free tier available)

2. **Connect your GitHub repo**
   - Add `github.com/Mira-x77/your-repo`

3. **Configure iOS build**
   - Codemagic auto-detects Capacitor
   - Configure signing (you'll need Apple Developer account for real devices)

4. **Build automatically**
   - Push code → Codemagic builds automatically
   - Download `.ipa` file from dashboard

---

## 📲 Installing on Your iPhone

### For Development/Testing (No App Store)

#### Method 1: Using TestFlight (Recommended)

1. **Get Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **Create App in App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Create new app

3. **Upload build via Xcode or EAS**
   - Xcode: Product → Archive → Distribute
   - EAS: Automatically uploads

4. **Add yourself as tester**
   - In App Store Connect → TestFlight
   - Add your email as internal tester

5. **Install TestFlight on iPhone**
   - Download from App Store
   - Open invite link
   - Install your app

#### Method 2: Direct Install (Development)

1. **Connect iPhone to Mac**
2. **Trust Mac on iPhone**
3. **In Xcode**: Select your iPhone as target
4. **Click Play button** - app installs directly

#### Method 3: Install via .ipa file (Sideloading)

1. **Build .ipa file**
2. **Use AltStore or Sideloadly** (free, no jailbreak)
   - Download AltStore: https://altstore.io
   - Install AltStore on iPhone
   - Drag .ipa file to AltStore
   - App installs (needs re-signing every 7 days)

---

## 🚀 Publishing to App Store

1. **Enroll in Apple Developer Program** ($99/year)

2. **Prepare app metadata**
   - App name, description, screenshots
   - Privacy policy URL
   - Support URL

3. **Create app in App Store Connect**

4. **Build and Archive in Xcode**
   ```
   Product → Archive
   ```

5. **Submit for Review**
   - Upload to App Store Connect
   - Fill in all required info
   - Submit for review

6. **Wait for approval** (usually 1-3 days)

7. **App goes live!** 🎉

---

## 🔄 Updating Your iOS App

When you make changes to your web app:

```bash
# 1. Build web app
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. If on Mac: open in Xcode
npx cap open ios

# 4. Build and run/archive
```

---

## 📝 Current Configuration

- **App ID**: `com.scoretarget.app`
- **App Name**: ScoreTarget
- **Web Dir**: `dist`
- **Platform**: iOS (simulator build ready)

---

## ⚠️ Important Notes

1. **Apple Developer Account**
   - Free: Can test on simulator + your own device (7-day limit)
   - $99/year: Can distribute via TestFlight + App Store

2. **Mac Requirement**
   - iOS apps MUST be built on Mac (Apple's rule)
   - Cloud build services can bypass this (EAS, Codemagic)

3. **Signing**
   - Development: Automatic signing in Xcode works fine
   - Production: Need proper certificates and provisioning profiles

4. **Testing**
   - Simulator: Free, no device needed
   - Real device: Better for testing real-world performance

---

## 🆘 Troubleshooting

### "No valid iOS distribution certificate"
→ Create one in Apple Developer Console

### "Provisioning profile doesn't match"
→ In Xcode: Signing & Capabilities → Automatically manage signing

### "Unable to install app"
→ Trust developer certificate: iPhone Settings → General → Device Management

### "Build failed in cloud service"
→ Check build logs, usually missing environment variables or certificates

---

## 🎯 Recommended Path for You

Since you're on Windows:

1. **Easiest**: Use **Ionic Appflow** or **Codemagic** (cloud build, no Mac needed)
2. **Free**: Use **EAS Build** with simulator profile (test in iOS simulator)
3. **Best**: Borrow a Mac for a day, build and submit to TestFlight

Once in TestFlight, anyone with an iPhone can install your app instantly!

---

Need help with any step? Let me know! 🚀
