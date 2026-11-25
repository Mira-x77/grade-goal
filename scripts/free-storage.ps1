# Free storage in the Go Study Supabase project.
#
# Usage:
#   .\scripts\free-storage.ps1                 # check status + projection only
#   .\scripts\free-storage.ps1 -Execute        # compress and upload
#
# Requires:
#   * the project to be out of the 402 restricted state
#   * python + pymupdf (pip install pymupdf)
#   * exam-library-admin/.env with the service role key
#
# Safe by default: without -Execute it downloads a sample, compresses it in
# memory and prints the projected saving. Nothing is overwritten.

param(
  [switch]$Execute,
  [int]$Limit = 250,
  [int]$Sample = 10,
  [string]$Prefix = "edusocial/"
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "compress_storage_pdfs.py"

# ---- load credentials -------------------------------------------------------
$envFile = Join-Path $PSScriptRoot "..\exam-library-admin\.env"
if (-not (Test-Path $envFile)) {
  Write-Host "exam-library-admin/.env not found - cannot authenticate." -ForegroundColor Red
  exit 1
}
$cfg = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
    $cfg[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$url = $cfg["VITE_SUPABASE_URL"]
$key = $cfg["VITE_SUPABASE_SERVICE_ROLE_KEY"]
if (-not $url -or -not $key) {
  Write-Host "VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY missing." -ForegroundColor Red
  exit 1
}

# ---- status check -----------------------------------------------------------
Write-Host "Checking project status..." -ForegroundColor Cyan
$restricted = $false
try {
  $null = Invoke-WebRequest "$url/auth/v1/health" -Headers @{
    apikey = $key; Authorization = "Bearer $key"
  } -UseBasicParsing -TimeoutSec 30
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 402) { $restricted = $true }
  else { Write-Host "Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow }
}

if ($restricted) {
  Write-Host ""
  Write-Host "Project is still restricted (402 Payment Required)." -ForegroundColor Red
  Write-Host "Lift it first by one of:" -ForegroundColor Yellow
  Write-Host "  1. Upgrade the organization to Pro  -> https://supabase.com/dashboard/org/_/billing?panel=subscriptionPlan"
  Write-Host "  2. Disable the spend cap (Pro only) -> https://supabase.com/dashboard/org/_/billing?panel=costControl"
  Write-Host "  3. Wait for the billing cycle reset, or ask support for a temporary lift"
  Write-Host ""
  Write-Host "You can still validate the compressor offline:"
  Write-Host "  python scripts\compress_storage_pdfs.py --local <some.pdf> --out tmp\compressed"
  exit 1
}

Write-Host "Project is reachable." -ForegroundColor Green

# ---- projection -------------------------------------------------------------
Write-Host ""
Write-Host "Step 1/2 - projection on $Sample sample files (nothing uploaded)" -ForegroundColor Cyan
python $script --remote --prefix $Prefix --sample $Sample
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Execute) {
  Write-Host ""
  Write-Host "Dry run complete. Re-run with -Execute to compress and upload:" -ForegroundColor Yellow
  Write-Host "  .\scripts\free-storage.ps1 -Execute"
  exit 0
}

# ---- real run ---------------------------------------------------------------
Write-Host ""
Write-Host "Step 2/2 - compressing up to $Limit largest PDFs and uploading" -ForegroundColor Cyan
python $script --remote --prefix $Prefix --limit $Limit --execute --resume --keep-originals
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# ---- report -----------------------------------------------------------------
$manifestPath = Join-Path $PSScriptRoot "output\pdf-compress-manifest.json"
if (Test-Path $manifestPath) {
  $m = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $before = [int64]0; $after = [int64]0; $count = 0
  foreach ($entry in $m.done.PSObject.Properties) {
    $before += [int64]$entry.Value.before
    $after  += [int64]$entry.Value.after
    $count++
  }
  if ($count -gt 0) {
    $mb = { param($b) [math]::Round($b / 1MB, 1) }
    Write-Host ""
    Write-Host "Compressed $count files: $(& $mb $before) MB -> $(& $mb $after) MB (saved $(& $mb ($before - $after)) MB)" -ForegroundColor Green
  }
}
Write-Host ""
Write-Host "Storage usage may take up to an hour to refresh in the dashboard." -ForegroundColor Yellow
Write-Host "Check: https://supabase.com/dashboard/org/_/usage"
