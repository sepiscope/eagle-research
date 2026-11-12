# Local preview server for EagleResearch: no installs needed (uses Windows PowerShell).
# Serves this folder at http://localhost:3000 so BC email sign-in can be tested privately.
# Only this computer can reach it. Press Ctrl+C in this window to stop.

param([int]$Port = 3000, [switch]$NoBrowser)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
            '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.md'='text/plain; charset=utf-8' }
# Never serve the private contact data or the personal outreach list, even locally
$blocked = @('private', 'outreach', 'publish')

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch { Write-Host "Couldn't start on port $Port (is it already running?). $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
Write-Host "=========================================================="
Write-Host " EagleResearch is running at  http://localhost:$Port/"
Write-Host " Only this computer can see it. Press Ctrl+C to stop."
Write-Host "=========================================================="
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
      $first = ($rel -split '[\\/]')[0].ToLower()
      if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or $blocked -contains $first) {
        $res.StatusCode = 403; $bytes = [Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      } elseif (Test-Path $full -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-store')
        $bytes = [IO.File]::ReadAllBytes($full)
      } else {
        $res.StatusCode = 404; $bytes = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      }
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch { $res.StatusCode = 500 } finally { $res.Close() }
  }
} finally { $listener.Stop() }
