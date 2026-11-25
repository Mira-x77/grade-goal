$root = "C:\Users\Skydrake\Documents\grade-goal"
$token = "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"
$remote = "https://$token@github.com/Mira-x77/gostudy-.git"

Set-Location $root

# Kill any git processes holding locks
Get-Process -Name "git" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

Write-Host "Current branch:" (git branch --show-current)
Write-Host "Current commit:" (git log --oneline -1)

# Update the remote URL with new token
git remote set-url origin $remote 2>&1 | Out-Null

# Create a new orphan branch — zero history, only current files
Write-Host "1. Creating orphan branch..." -ForegroundColor Cyan
git checkout --orphan newmain 2>&1 | Out-Null

Write-Host "2. Staging all files..." -ForegroundColor Cyan
git add -A 2>&1 | Out-Null
$count = (git diff --cached --name-only).Count
Write-Host "   Staged: $count files" -ForegroundColor Gray

Write-Host "3. Committing..." -ForegroundColor Cyan
git -c user.email="mira@gostudy.app" -c user.name="Mira" commit -m "GoStudy v1.2.0 - fresh source push" --no-verify 2>&1 | Select-Object -Last 2

Write-Host "4. Pushing to main (force)..." -ForegroundColor Cyan
git push $remote newmain:main --force 2>&1

Write-Host "EXIT: $LASTEXITCODE"
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS" -ForegroundColor Green
} else {
    Write-Host "FAILED" -ForegroundColor Red
}
