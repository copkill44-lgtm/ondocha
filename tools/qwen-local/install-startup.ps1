$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'start-public.ps1'
$startup = [Environment]::GetFolderPath('Startup')
$linkPath = Join-Path $startup 'Ondocha AI.lnk'
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($linkPath)
$link.TargetPath = Join-Path $PSHOME 'powershell.exe'
$link.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $scriptPath + '"'
$link.WorkingDirectory = $PSScriptRoot
$link.WindowStyle = 7
$link.Save()
Start-Process -FilePath $link.TargetPath -ArgumentList $link.Arguments -WindowStyle Hidden
Write-Output 'Ondocha AI startup installed. Background server and public tunnel are starting.'
