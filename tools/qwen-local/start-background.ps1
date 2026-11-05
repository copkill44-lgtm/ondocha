$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 3
    if ($health.provider -eq 'qwen-local') { exit 0 }
} catch {}
$pythonBin = Join-Path $projectRoot '.qwen-venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonBin)) { throw 'Run install.ps1 first.' }
$logFolder = Join-Path $projectRoot '.qwen-cache'
New-Item -ItemType Directory -Path $logFolder -Force | Out-Null
$env:QWEN_PRELOAD = '1'
Start-Process -FilePath $pythonBin -ArgumentList '-m uvicorn server:app --host 127.0.0.1 --port 8000' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logFolder 'server.stdout.log') -RedirectStandardError (Join-Path $logFolder 'server.stderr.log')