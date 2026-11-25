# Re-export a PPTX to PDF with the installed PowerPoint. Used because the
# repository has no LibreOffice; run with:
#   powershell -File scripts/desktop/pptx-to-pdf.ps1 -In <pptx> -Out <pdf>
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out
)

$inPath = (Resolve-Path $In).Path
$outPath = [System.IO.Path]::GetFullPath($Out)

$pp = New-Object -ComObject PowerPoint.Application
try {
  # WithWindow = $false keeps the conversion headless.
  $pres = $pp.Presentations.Open($inPath, $true, $false, $false)
  try {
    # 32 = ppSaveAsPDF
    $pres.SaveAs($outPath, 32)
  } finally {
    $pres.Close()
  }
  Write-Output "PDF_OK $outPath $([math]::Round((Get-Item $outPath).Length / 1KB)) KB"
} finally {
  $pp.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
}
