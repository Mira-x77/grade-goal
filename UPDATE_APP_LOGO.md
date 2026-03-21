# Update App Logo - Step by Step Guide

## Current Logo Location
The app logo you provided is an orange book with a lightbulb icon. This needs to replace the current app icons.

## Required Files

### 1. Source Icon (1024x1024px)
Save your logo as: `resources/icon.png`
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Square shape (will be cropped to circle/rounded square by Android)

### 2. Source Splash Screen (2732x2732px) - Optional
Save as: `resources/splash.png`
- Size: 2732x2732 pixels
- Format: PNG
- Center your logo on a solid background

## Method 1: Using Capacitor Assets (Recommended)

### Step 1: Install Capacitor Assets Plugin
```bash
npm install @capacitor/assets --save-dev
```

### Step 2: Create Resources Folder
```bash
mkdir resources
```

### Step 3: Add Your Logo
1. Save your orange book logo as `resources/icon.png` (1024x1024px)
2. Optionally create `resources/splash.png` for splash screen

### Step 4: Generate All Icon Sizes
```bash
npx capacitor-assets generate --iconBackgroundColor '#FF9500' --iconBackgroundColorDark '#FF9500' --splashBackgroundColor '#FFFFFF' --splashBackgroundColorDark '#1E293B'
```

This will automatically generate:
- All Android mipmap sizes (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- All iOS icon sizes
- Splash screens for all orientations and sizes

### Step 5: Sync to Android
```bash
npx cap sync android
```

## Method 2: Manual Replacement (Quick but tedious)

If you don't want to use the plugin, manually replace these files:

### Android App Icons
Replace these files with your logo (scaled to each size):

```
android/app/src/main/res/mipmap-mdpi/ic_launcher.png (48x48)
android/app/src/main/res/mipmap-hdpi/ic_launcher.png (72x72)
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png (96x96)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png (144x144)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192)

android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png (48x48)
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png (72x72)
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png (96x96)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png (144x144)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png (192x192)

android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png (108x108)
android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png (162x162)
android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png (216x216)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png (324x324)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png (432x432)
```

### Web Icon
```
public/icon.png (512x512)
```

## Method 3: Using Online Icon Generator

### Step 1: Generate Icons Online
1. Go to https://icon.kitchen/ or https://easyappicon.com/
2. Upload your 1024x1024 logo
3. Select "Android" platform
4. Download the generated zip file

### Step 2: Extract and Replace
1. Extract the zip file
2. Copy all mipmap folders to `android/app/src/main/res/`
3. Replace existing files

## Quick Setup Script

Create a file `update-logo.sh`:

```bash
#!/bin/bash

echo "🎨 Updating App Logo..."

# Check if resources folder exists
if [ ! -d "resources" ]; then
    echo "Creating resources folder..."
    mkdir resources
fi

# Check if icon exists
if [ ! -f "resources/icon.png" ]; then
    echo "❌ Please add your logo as resources/icon.png (1024x1024px)"
    exit 1
fi

# Install capacitor assets if not installed
if ! npm list @capacitor/assets > /dev/null 2>&1; then
    echo "Installing @capacitor/assets..."
    npm install @capacitor/assets --save-dev
fi

# Generate assets
echo "Generating app icons..."
npx capacitor-assets generate --iconBackgroundColor '#FF9500' --iconBackgroundColorDark '#FF9500'

# Sync to platforms
echo "Syncing to Android..."
npx cap sync android

echo "✅ Logo updated successfully!"
echo "📱 Build your APK to see the new logo"
```

Make it executable:
```bash
chmod +x update-logo.sh
./update-logo.sh
```

## Logo Design Tips

### For Your Orange Book Logo:

1. **Size**: Export at 1024x1024px minimum
2. **Padding**: Add 10-15% padding around the logo (Android will crop it)
3. **Background**: 
   - Option A: Transparent background (Android will add adaptive background)
   - Option B: Solid orange background matching your brand
4. **Format**: PNG with transparency
5. **Colors**: Use your brand orange (#FF9500 or similar)

### Adaptive Icon (Android 8.0+)
Android uses adaptive icons with:
- **Foreground**: Your logo (with transparency)
- **Background**: Solid color or gradient

The system will:
- Crop to circle on some devices
- Crop to rounded square on others
- Crop to squircle on others

So make sure your logo looks good when cropped!

## Verification

### After Updating:
1. Build APK: `cd android && ./gradlew assembleDebug`
2. Install on device
3. Check home screen icon
4. Check app drawer icon
5. Check recent apps icon

### Expected Result:
- Home screen shows your orange book logo
- App drawer shows your orange book logo
- Splash screen shows your logo (if you created splash.png)

## Troubleshooting

### Logo looks stretched
- Make sure source image is exactly 1024x1024px
- Check that it's square, not rectangular

### Logo is cut off
- Add more padding around your logo
- The safe area is about 70% of the canvas

### Background color wrong
- Update `--iconBackgroundColor` in the generate command
- Or manually edit `android/app/src/main/res/values/ic_launcher_background.xml`

### Icons not updating
- Clean build: `cd android && ./gradlew clean`
- Uninstall old app from device
- Reinstall new APK

## Current vs New Logo

### Current (Default Capacitor)
- Generic Capacitor icon
- Blue/white colors

### New (Your Orange Book)
- Orange book with lightbulb
- Represents learning/education
- Matches ScoreTarget brand

---

**Next Steps:**
1. Save your logo as `resources/icon.png` (1024x1024px)
2. Run: `npx capacitor-assets generate`
3. Run: `npx cap sync android`
4. Build APK
5. Install and verify!
