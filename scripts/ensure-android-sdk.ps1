# Minimal Android SDK (command-line tools only — no Android Studio)
param(
    [string]$SdkRoot = (Join-Path (Split-Path $PSScriptRoot -Parent) ".android-sdk")
)

$ErrorActionPreference = "Stop"
$cmdlineZip = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$cmdlineDir = Join-Path $SdkRoot "cmdline-tools\latest"
$sdkmanager = Join-Path $cmdlineDir "bin\sdkmanager.bat"

function Test-SdkReady {
    $hasPlatform = Test-Path (Join-Path $SdkRoot "platforms\android-36")
    $hasBuildTools = @(Get-ChildItem (Join-Path $SdkRoot "build-tools") -Directory -ErrorAction SilentlyContinue).Count -gt 0
    return $hasPlatform -and $hasBuildTools
}

if (Test-SdkReady) {
    Write-Host "[SDK] Ready at $SdkRoot"
    exit 0
}

Write-Host "[SDK] Installing minimal Android SDK to $SdkRoot ..."
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

if (-not (Test-Path $sdkmanager)) {
    $zipPath = Join-Path $env:TEMP "cmdline-tools-win.zip"
    Write-Host "[SDK] Downloading command-line tools..."
    Invoke-WebRequest -Uri $cmdlineZip -OutFile $zipPath -UseBasicParsing
    $extractDir = Join-Path $env:TEMP "cmdline-tools-extract"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineDir -Parent) | Out-Null
    if (Test-Path $cmdlineDir) { Remove-Item -Recurse -Force $cmdlineDir }
    $inner = Get-ChildItem $extractDir -Directory | Select-Object -First 1
    Move-Item -Path $inner.FullName -Destination $cmdlineDir -Force
}

$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
Write-Host "[SDK] Installing platform-tools, platform 36, build-tools 36.0.0 ..."
$packages = @("platform-tools", "platforms;android-36", "build-tools;35.0.0")
foreach ($pkg in $packages) {
    "yes" | & $sdkmanager --sdk_root=$SdkRoot $pkg 2>&1
}

if (-not (Test-SdkReady)) {
    Write-Error "[SDK] Install incomplete. Check network and retry."
}
Write-Host "[SDK] Install complete."
