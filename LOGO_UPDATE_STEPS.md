# 🎨 Update App Logo - Quick Guide

## Step 1: Save Your Logo

Save the orange book logo image as:
```
resources/icon.png
```

**Requirements:**
- Size: 1024x1024 pixels (or larger, will be scaled down)
- Format: PNG
- Square shape
- Add some padding around the logo (10-15%)

## Step 2: Run the Update Script

```powershell
.\update-logo.ps1
```

This will:
1. Install @capacitor/assets (if needed)
2. Generate all icon sizes for Android
3. Sync to Android project

## Step 3: Build APK

```bash
npm run build
npx cap sync android
cd android
.\gradlew assembleDebug
```

## Alternative: Manual Method

If the script doesn't work, you can use an online tool:

### Option A: Icon Kitchen (Recommended)
1. Go to https://icon.kitchen/
2. Upload your logo (resources/icon.png)
3. Select "Android" platform
4. Choose "Adaptive Icon"
5. Set background color to #FF9500 (orange)
6. Download the generated files
7. Extract and copy to `android/app/src/main/res/`

### Option B: Easy App Icon
1. Go to https://easyappicon.com/
2. Upload your 1024x1024 logo
3. Select Android
4. Download and extract
5. Copy mipmap folders to `android/app/src/main/res/`

## Verify the Logo

After building and installing:
1. Check home screen icon
2. Check app drawer
3. Check recent apps screen
4. All should show your orange book logo

## Troubleshooting

### Logo not updating?
- Uninstall old app first
- Clean build: `cd android && .\gradlew clean`
- Rebuild and reinstall

### Logo looks cut off?
- Add more padding in your source image
- The safe area is about 70% of the canvas

### Wrong colors?
- Edit background color in the script
- Or manually edit: `android/app/src/main/res/values/ic_launcher_background.xml`

---

**Ready to update?**
1. Save logo as `resources/icon.png`
2. Run `.\update-logo.ps1`
3. Build APK
4. Done! 🎉
