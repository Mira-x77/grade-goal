$shell = New-Object -ComObject Shell.Application
$myComputer = $shell.NameSpace(0x11)

Write-Host "=== ITEMS IN THIS PC ==="
$s31 = $null
foreach ($item in $myComputer.Items()) {
    Write-Host "Item: $($item.Name)"
    if ($item.Name -like "*S31*") {
        $s31 = $item
    }
}

if ($s31) {
    Write-Host "`nFOUND S31 DEVICE: $($s31.Name)"
    $s31Folder = $s31.GetFolder
    if ($s31Folder) {
        Write-Host "Sub-folders inside S31:"
        foreach ($sub in $s31Folder.Items()) {
            Write-Host "  - $($sub.Name) (Type: $($sub.Type))"
        }
    } else {
        Write-Host "Could not get folder object for S31. Make sure phone is unlocked and file transfer (MTP) mode is enabled."
    }
} else {
    Write-Host "S31 device not found under This PC."
}
