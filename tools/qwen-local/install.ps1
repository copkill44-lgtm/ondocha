$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$venv = Join-Path $projectRoot '.qwen-venv'
if (!(Test-Path (Join-Path $venv 'Scripts/python.exe'))) {
    python -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create Qwen environment' }
}
$pythonBin = Join-Path $venv 'Scripts/python.exe'
& $pythonBin -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
if ($LASTEXITCODE -ne 0) { throw 'PyTorch install failed' }
& $pythonBin -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Qwen dependency install failed' }
& $pythonBin -c "import torch; from diffusers import QwenImageEditPipeline; from diffusers.quantizers import PipelineQuantizationConfig; assert torch.cuda.is_available(); print(torch.cuda.get_device_name(0))"
if ($LASTEXITCODE -ne 0) { throw 'Qwen GPU verification failed' }
Write-Host 'Ready. Run start.ps1. Model weights download on first image request.'
