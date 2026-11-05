$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$pythonBin = Join-Path $projectRoot '.qwen-venv/Scripts/python.exe'
if (!(Test-Path $pythonBin)) { throw 'Run tools/qwen-local/install.ps1 first.' }
Set-Location $PSScriptRoot
Write-Host 'Open http://127.0.0.1:8000 in your browser. Keep this terminal running.'
& $pythonBin -m uvicorn server:app --host 127.0.0.1 --port 8000
