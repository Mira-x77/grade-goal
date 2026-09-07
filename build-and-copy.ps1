# GoStudy! — Build release APK and copy to Desktop (same package = in-place update)
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$versionName = "1.2.0"
$versionCode = 7
$applicationId = "com.gostudy.student"
$apkName = "GoStudy-${versionName}-v${versionCode}.apk"
$releaseApk = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"
$desktopPath = Join-Path $env:USERPROFILE "Desktop\$apkName"
$kiroApk = Join-Path $ProjectRoot ".kiro\$apkName"

Write-Host "[BUILD] GoStudy! Release APK Builder" -ForegroundColor Cyan
Write-Host "  Package: $applicationId" -ForegroundColor Gray
Write-Host "  Version: $versionName (code $versionCode)" -ForegroundColor Gray
Write-Host ""

if (-not $SkipBuild) {
    Write-Host "[1/4] Building web app..." -ForegroundColor Yellow
    $env:CAPACITOR = "true"
    Push-Location $ProjectRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Web build failed!" -ForegroundColor Red; exit 1 }
    Remove-Item Env:CAPACITOR -ErrorAction SilentlyContinue
    Pop-Location
    Write-Host "[OK] Web app built" -ForegroundColor Green
    Write-Host ""

    Write-Host "[2/4] Syncing Capacitor Android..." -ForegroundColor Yellow
    Push-Location $ProjectRoot
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Cap sync failed!" -ForegroundColor Red; exit 1 }
    Pop-Location
    Write-Host "[OK] Synced" -ForegroundColor Green
    Write-Host ""

    Write-Host "[3/4] Building signed release APK (Gradle)..." -ForegroundColor Yellow
    $env:ANDROID_HOME = Join-Path $ProjectRoot ".android-sdk"
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    Push-Location (Join-Path $ProjectRoot "android")
    .\gradlew.bat assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Gradle release build failed!" -ForegroundColor Red; exit 1 }
    Pop-Location
    Write-Host "[OK] Release APK built" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[SKIP] Using existing release APK" -ForegroundColor Gray
}

if (-not (Test-Path $releaseApk)) {
    Write-Host "[ERROR] Release APK not found: $releaseApk" -ForegroundColor Red
    exit 1
}

Write-Host "[4/4] Copying to Desktop..." -ForegroundColor Yellow
$kiroDir = Split-Path $kiroApk -Parent
if (-not (Test-Path $kiroDir)) { New-Item -ItemType Directory -Force -Path $kiroDir | Out-Null }
Copy-Item $releaseApk -Destination $kiroApk -Force
Copy-Item $releaseApk -Destination $desktopPath -Force

$mb = [math]::Round((Get-Item $releaseApk).Length / 1MB, 2)
Write-Host "[OK] Done!" -ForegroundColor Green
Write-Host "  Desktop: $desktopPath" -ForegroundColor White
Write-Host "  Backup:  $kiroApk" -ForegroundColor White
Write-Host "  Size:    $mb MB" -ForegroundColor White
Write-Host ""
Write-Host "Install over existing GoStudy app (same package $applicationId, versionCode $versionCode)." -ForegroundColor Cyan
