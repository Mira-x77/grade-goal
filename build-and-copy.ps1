# ScoreTarget - Build and Copy APK to Desktop
# Run this script to build the APK and copy it to your desktop

Write-Host "🚀 ScoreTarget APK Builder" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the web app
Write-Host "📦 Step 1: Building web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
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

# Step 3: Build APK
Write-Host "🔨 Step 3: Building APK..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Set-Location android
./gradlew assembleDebug
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) {
    Write-Host "❌ APK build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Java/Gradle issue detected. Please build using Android Studio:" -ForegroundColor Yellow
    Write-Host "   1. Open Android Studio" -ForegroundColor White
    Write-Host "   2. Open project: android\" -ForegroundColor White
    Write-Host "   3. Build → Build APK(s)" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "✅ APK built successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Copy to Desktop
Write-Host "📋 Step 4: Copying to Desktop..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$desktopPath = "$env:USERPROFILE\Desktop\ScoreTarget-debug.apk"

if (Test-Path $apkPath) {
    Copy-Item $apkPath -Destination $desktopPath -Force
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host "✅ APK copied to Desktop!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 APK Details:" -ForegroundColor Cyan
    Write-Host "   Location: $desktopPath" -ForegroundColor White
    Write-Host "   Size: $apkSize MB" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Done! Install the APK on your device to test." -ForegroundColor Green
} else {
    Write-Host "❌ APK file not found at: $apkPath" -ForegroundColor Red
    exit 1
}
