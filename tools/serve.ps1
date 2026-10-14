param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$types = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.jpg'='image/jpeg';'.png'='image/png';'.webp'='image/webp';'.avif'='image/avif';'.svg'='image/svg+xml';'.cube'='text/plain; charset=utf-8';'.json'='application/json; charset=utf-8';'.md'='text/plain; charset=utf-8'}
try {
  $listener.Start()
  Write-Host "LUT LAB: http://localhost:$Port/"
  Write-Host 'Open this address in your browser. Press Ctrl+C to stop.'
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response
    try {
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      if (-not $relative) { $relative = 'index.html' }
      $target = [IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
      if (-not $target.StartsWith($siteRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $response.StatusCode = 403 }
      elseif (-not [IO.File]::Exists($target)) { $response.StatusCode = 404 }
      else {
        $ext = [IO.Path]::GetExtension($target).ToLowerInvariant()
        $response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $response.Headers.Add('Cache-Control','no-store')
        $bytes = [IO.File]::ReadAllBytes($target)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch { $response.StatusCode = 500 }
    finally { $response.Close() }
  }
} finally { $listener.Stop(); $listener.Close() }
