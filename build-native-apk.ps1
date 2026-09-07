# GoStudy - Native Gradle APK Builder
Write-Host "[BUILD] GoStudy Native APK Builder (Gradle + JDK 21)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure JDK 21 environment
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor White
Write-Host ""

# Step 1: Build web app
Write-Host "[1/4] Building web app..." -ForegroundColor Yellow
$env:CAPACITOR = "true"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Web build failed!" -ForegroundColor Red
    exit 1
}
Remove-Item Env:CAPACITOR -ErrorAction SilentlyContinue
Write-Host "[OK] Web app built!" -ForegroundColor Green
Write-Host ""

# Step 2: Sync with Capacitor Android
Write-Host "[2/4] Syncing Capacitor Android assets..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Synced successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Compile APK using Gradle assembleDebug
Write-Host "[3/4] Compiling native APK with Gradle (assembleDebug)..." -ForegroundColor Yellow
Set-Location android
.\gradlew assembleDebug
$gradleResult = $LASTEXITCODE
Set-Location ..

if ($gradleResult -ne 0) {
    Write-Host "[ERROR] Gradle assembleDebug failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Gradle build successful!" -ForegroundColor Green
Write-Host ""

# Step 4: Copy debug APK to Desktop
Write-Host "[4/4] Copying APK to Desktop..." -ForegroundColor Yellow
$apkSource = "android\app\build\outputs\apk\debug\app-debug.apk"
$apkDesktop = "$env:USERPROFILE\Desktop\GoStudy.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource -Destination $apkDesktop -Force
    $apkSize = [math]::Round((Get-Item $apkSource).Length / 1MB, 2)
    Write-Host "🎉 SUCCESS! GoStudy APK created and copied to Desktop." -ForegroundColor Green
    Write-Host "  Desktop: $apkDesktop" -ForegroundColor White
    Write-Host "  Size: $apkSize MB" -ForegroundColor White
} else {
    Write-Host "[ERROR] APK file not found at: $apkSource" -ForegroundColor Red
    exit 1
}
