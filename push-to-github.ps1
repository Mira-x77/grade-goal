Set-Location "C:\Users\Skydrake\Documents\grade-goal"

# Disable credential manager so token in URL is used directly
$env:GIT_TERMINAL_PROMPT = "0"
git config --local credential.helper ""

Write-Host "Pushing to main..." -ForegroundColor Cyan
git push "https://1Lbrx4Lx3hEreTuYXZUsH11XTZfnGS3njG@github.com/Mira-x77/gostudy-.git" HEAD:main --force 2>&1

# Restore credential manager
git config --local --unset credential.helper

Write-Host "EXIT: $LASTEXITCODE" -ForegroundColor Green
