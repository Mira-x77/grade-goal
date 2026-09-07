# Repack existing debug APK with freshly synced web assets (no full Gradle/SDK rebuild)
param(
    [string]$ProjectRoot = (Split-Path $PSScriptRoot -Parent),
    [string]$WorkDir = "$env:TEMP\scoretarget-apk-repack"
)

$ErrorActionPreference = "Stop"
$apkIn = Join-Path $ProjectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$assetsSrc = Join-Path $ProjectRoot "android\app\src\main\assets"
$apkOut = Join-Path $ProjectRoot ".kiro\ScoreTarget-android8-debug.apk"

if (-not (Test-Path $apkIn)) {
    Write-Error "Base APK not found: $apkIn. Run a full Gradle build once when disk space allows."
}
if (-not (Test-Path $assetsSrc)) {
    Write-Error "Synced assets missing. Run: npm run build (with CAPACITOR=true) && npx cap sync android"
}

Write-Host "[repack] Using work dir: $WorkDir"
if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

$extractDir = Join-Path $WorkDir "apk"
$zipCopy = Join-Path $WorkDir "base.zip"
Copy-Item $apkIn $zipCopy -Force
Expand-Archive -LiteralPath $zipCopy -DestinationPath $extractDir -Force

# Replace Capacitor web assets
$destAssets = Join-Path $extractDir "assets"
if (Test-Path $destAssets) { Remove-Item -Recurse -Force $destAssets }
Copy-Item -Recurse -Force $assetsSrc $destAssets

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $WorkDir "repacked.zip"

# Remove old signatures (required after content change)
$metaInf = Join-Path $extractDir "META-INF"
if (Test-Path $metaInf) { Remove-Item -Recurse -Force $metaInf }

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
[System.IO.Compression.ZipFile]::CreateFromDirectory($extractDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$unsignedApk = Join-Path $WorkDir "unsigned.apk"
Copy-Item -Force $zipPath $unsignedApk

# Sign with debug keystore (stored in project scripts/, not TEMP)
$keystore = Join-Path $ProjectRoot "scripts\debug.keystore"
$jdk = Get-ChildItem "C:\Program Files\Microsoft\jdk*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { Write-Error "JDK not found for jarsigner" }
$keytool = Join-Path $jdk.FullName "bin\keytool.exe"
$jarsigner = Join-Path $jdk.FullName "bin\jarsigner.exe"
if (-not (Test-Path $keystore)) {
    $dname = "CN=Android Debug,O=Android,C=US"
    cmd /c "`"$keytool`" -genkeypair -keystore `"$keystore`" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname `"$dname`"" | Out-Null
}
cmd /c "`"$jarsigner`" -sigalg SHA256withRSA -digestalg SHA-256 -keystore `"$keystore`" -storepass android -keypass android -signedjar `"$apkOut`" `"$unsignedApk`" androiddebugkey" | Out-Null
if (-not (Test-Path $apkOut)) {
    Write-Error "[repack] jarsigner failed to produce $apkOut"
}

$kiroDir = Join-Path $ProjectRoot ".kiro"
if (-not (Test-Path $kiroDir)) { New-Item -ItemType Directory -Force -Path $kiroDir | Out-Null }

$mb = [math]::Round((Get-Item $apkOut).Length / 1MB, 2)
Write-Host "[repack] Signed APK: $apkOut ($mb MB)"
