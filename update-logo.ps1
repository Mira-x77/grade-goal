# PowerShell script to update app logo

Write-Host "🎨 ScoreTarget Logo Update Script" -ForegroundColor Cyan
Write-Host ""

# Check if icon exists
if (-not (Test-Path "resources\icon.png")) {
    Write-Host "❌ Logo file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please save your logo as: resources\icon.png" -ForegroundColor Yellow
    Write-Host "Requirements:" -ForegroundColor Yellow
    Write-Host "  - Size: 1024x1024 pixels" -ForegroundColor Yellow
    Write-Host "  - Format: PNG" -ForegroundColor Yellow
    Write-Host "  - Square shape with padding" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Found logo file: resources\icon.png" -ForegroundColor Green

# Check if @capacitor/assets is installed
Write-Host ""
Write-Host "📦 Checking for @capacitor/assets..." -ForegroundColor Cyan

$hasAssets = npm list @capacitor/assets 2>&1 | Select-String "@capacitor/assets"

if (-not $hasAssets) {
    Write-Host "Installing @capacitor/assets..." -ForegroundColor Yellow
    npm install @capacitor/assets --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install @capacitor/assets" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ @capacitor/assets is ready" -ForegroundColor Green

# Generate assets
Write-Host ""
Write-Host "🎨 Generating app icons for all sizes..." -ForegroundColor Cyan
npx capacitor-assets generate --iconBackgroundColor '#FF9500' --iconBackgroundColorDark '#FF9500' --splashBackgroundColor '#FFFFFF' --splashBackgroundColorDark '#1E293B'

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate assets" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Icons generated successfully" -ForegroundColor Green

# Sync to Android
Write-Host ""
Write-Host "📱 Syncing to Android..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to sync to Android" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Synced to Android" -ForegroundColor Green

# Success message
Write-Host ""
Write-Host "🎉 Logo updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Build APK: cd android ; .\gradlew assembleDebug" -ForegroundColor White
Write-Host "  2. Install on device" -ForegroundColor White
Write-Host "  3. Check the new logo on home screen" -ForegroundColor White
Write-Host ""
