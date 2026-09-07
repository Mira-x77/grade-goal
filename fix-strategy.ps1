$lines = Get-Content "src/pages/Home.tsx"
Write-Host ("Total lines: " + $lines.Count)
Write-Host ("Line 491: " + $lines[490])
Write-Host ("Line 601: " + $lines[600])
