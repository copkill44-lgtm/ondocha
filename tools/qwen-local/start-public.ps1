$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$cache = Join-Path $projectRoot '.qwen-cache'
$cloudflared = Join-Path $cache 'cloudflared.exe'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
if (!(Test-Path -LiteralPath $cloudflared)) {
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared -UseBasicParsing
    $signature = Get-AuthenticodeSignature -LiteralPath $cloudflared
    if ($signature.Status -ne 'Valid') { throw 'Cloudflared signature validation failed.' }
}
$mutex = New-Object System.Threading.Mutex($false, 'Local\OndochaQwenPublic')
if (!$mutex.WaitOne(0)) { exit 0 }
try {
    $stdout = Join-Path $cache 'tunnel.stdout.log'
    $stderr = Join-Path $cache 'tunnel.stderr.log'
    while ($true) {
        $process = Start-Process -FilePath $cloudflared -ArgumentList 'tunnel --url http://127.0.0.1:8000 --http-host-header 127.0.0.1:8000 --no-autoupdate' -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        $url = $null
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Seconds 1
            if ($process.HasExited) { break }
            $log = Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
            if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0]; break }
        }
        if ($url) {
            [IO.File]::WriteAllText((Join-Path $cache 'public-url.txt'), $url)
            [IO.File]::WriteAllText((Join-Path $projectRoot 'scripts/qwen-endpoint.js'), ('// Public tunnel address only. No credentials.' + [Environment]::NewLine + 'window.ONDOCHA_QWEN_URL = "' + $url + '";' + [Environment]::NewLine))
        }
        while (!$process.HasExited) {
            & (Join-Path $PSScriptRoot 'start-background.ps1')
            Start-Sleep -Seconds 20
        }
        Start-Sleep -Seconds 10
    }
} finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
