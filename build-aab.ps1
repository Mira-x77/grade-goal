# ScoreTarget AAB Builder
# This script builds a signed Android App Bundle for Google Play Store

Write-Host ""
Write-Host "🚀 ScoreTarget AAB Builder" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if keystore exists
if (-not (Test-Path "scoretarget-release-key.jks")) {
    Write-Host "❌ Keystore not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please generate a keystore first:" -ForegroundColor Yellow
    Write-Host "keytool -genkey -v -keystore scoretarget-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias scoretarget" -ForegroundColor White
    Write-Host ""
    Write-Host "See BUILD_AAB_GUIDE.md for detailed instructions." -ForegroundColor Yellow
    exit 1
}

# Check if key.properties exists
if (-not (Test-Path "android\key.properties")) {
    Write-Host "❌ android/key.properties not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create android/key.properties with your keystore passwords." -ForegroundColor Yellow
    Write-Host "See BUILD_AAB_GUIDE.md for detailed instructions." -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:ANDROID_HOME = "C:\Users\mira\.bubblewrap\android_sdk"

# Step 1: Build web app
Write-Host "📦 Step 1: Building web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Web app built successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Sync with Capacitor
Write-Host "🔄 Step 2: Syncing with Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Synced successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Build AAB
Write-Host "🔨 Step 3: Building signed AAB..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Set-Location android
./gradlew bundleRelease
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) {
    Write-Host "❌ AAB build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Check passwords in android/key.properties" -ForegroundColor White
    Write-Host "  - Verify keystore file exists" -ForegroundColor White
    Write-Host "  - Make sure versionCode is incremented" -ForegroundColor White
    exit 1
}
Write-Host "✅ AAB built successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Copy to Desktop
Write-Host "📋 Step 4: Copying to Desktop..." -ForegroundColor Yellow
$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
$desktopPath = "$env:USERPROFILE\Desktop\ScoreTarget-release.aab"

if (Test-Path $aabPath) {
    Copy-Item $aabPath -Destination $desktopPath -Force
    $aabSize = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
    Write-Host "✅ AAB copied to Desktop!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 AAB Details:" -ForegroundColor Cyan
    Write-Host "   Location: $desktopPath" -ForegroundColor White
    Write-Host "   Size: $aabSize MB" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Done! Upload this AAB to Google Play Console." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://play.google.com/console" -ForegroundColor White
    Write-Host "  2. Select your app" -ForegroundColor White
    Write-Host "  3. Production → Create new release" -ForegroundColor White
    Write-Host "  4. Upload ScoreTarget-release.aab" -ForegroundColor White
    Write-Host "  5. Fill in release notes and publish" -ForegroundColor White
} else {
    Write-Host "❌ AAB file not found at: $aabPath" -ForegroundColor Red
    exit 1
}
