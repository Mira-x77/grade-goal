# Check ADB devices
Write-Host "=== CHECKING ADB DEVICES ==="
try {
    adb devices
} catch {
    Write-Host "ADB not directly in path or error running adb"
}

# Check Connected Drives & Volumes
Write-Host "`n=== CHECKING VOLUMES AND DRIVES ==="
Get-Volume | Format-Table DriveLetter, FileSystemLabel, Size, SizeRemaining, DriveType

# Check Portable Devices (MTP)
Write-Host "`n=== CHECKING PORTABLE / PNP DEVICES ==="
Get-PnpDevice -PresentOnly | Where-Object { $_.FriendlyName -match 'S31|Samsung|Android|MTP|USB|Portable|Phone|Card' } | Select-Object FriendlyName, Status, Class, InstanceId | Format-Table -AutoSize
