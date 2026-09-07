# Build, install, and launch on Pixel emulator
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$sdk\platform-tools\adb.exe"
$emulator = "$sdk\emulator\emulator.exe"

Write-Host "[1/5] Building APK..." -ForegroundColor Cyan
& "$root\build-and-copy.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[2/5] Starting Pixel emulator if needed..." -ForegroundColor Cyan
$devices = & $adb devices 2>&1 | Out-String
if ($devices -notmatch "emulator-\d+\s+device") {
    Start-Process -FilePath $emulator -ArgumentList "-avd", "Pixel_Emulator" -WindowStyle Minimized
    Write-Host "Waiting for emulator boot..."
    & $adb wait-for-device
    $n = 0
    while (($boot = & $adb shell getprop sys.boot_completed 2>&1) -ne "1") {
        Start-Sleep -Seconds 2
        $n++
        if ($n -gt 90) { Write-Host "Emulator boot timeout"; exit 1 }
    }
}
& $adb devices

$apk = "$root\android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "[3/5] Installing APK..." -ForegroundColor Cyan
& $adb uninstall com.scoretarget.app 2>$null
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[4/5] Launching app..." -ForegroundColor Cyan
& $adb shell am start -n com.scoretarget.app/.MainActivity

Write-Host "[5/5] Recent logcat (Capacitor / chromium / errors):" -ForegroundColor Cyan
Start-Sleep -Seconds 3
& $adb logcat -d -t 80 | Select-String -Pattern "capacitor|chromium|Console|AndroidRuntime|scoretarget|FATAL" -CaseSensitive:$false

Write-Host "Done. Use chrome://inspect to debug WebView." -ForegroundColor Green
