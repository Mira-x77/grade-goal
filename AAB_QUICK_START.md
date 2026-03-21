# 🚀 AAB Quick Start - 3 Simple Steps

## Step 1: Generate Keystore (One Time Only)

Run this command:
```powershell
keytool -genkey -v -keystore scoretarget-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias scoretarget
```

**Enter when prompted:**
- Password: (choose a strong password - SAVE IT!)
- Name: Your name
- Organization: ScoreTarget
- City/State/Country: Your location
- Confirm: yes

**⚠️ IMPORTANT:** Save your password! You'll need it for every release.

---

## Step 2: Configure Passwords

Edit `android/key.properties` and replace with your actual passwords:

```properties
storePassword=YOUR_PASSWORD_HERE
keyPassword=YOUR_PASSWORD_HERE
keyAlias=scoretarget
storeFile=../scoretarget-release-key.jks
```

---

## Step 3: Build AAB

Run the build script:
```powershell
.\build-aab.ps1
```

That's it! The AAB will be on your Desktop ready for Google Play Store.

---

## What You Get

✅ **ScoreTarget-release.aab** on your Desktop (~4-5 MB)
✅ Signed and ready for Google Play Store
✅ Optimized for all Android devices

---

## Upload to Play Store

1. Go to https://play.google.com/console
2. Select your app (or create new)
3. **Production → Create new release**
4. Upload `ScoreTarget-release.aab`
5. Add release notes
6. Review and publish

---

## For Future Updates

Before each new release:

1. **Update version** in `android/app/build.gradle`:
   ```gradle
   versionCode 2        // Increment: 1 → 2 → 3 → 4...
   versionName "1.1"    // Update: 1.0 → 1.1 → 2.0...
   ```

2. **Build new AAB**:
   ```powershell
   .\build-aab.ps1
   ```

3. **Upload to Play Store**

---

## Need Help?

See `BUILD_AAB_GUIDE.md` for detailed instructions and troubleshooting.
