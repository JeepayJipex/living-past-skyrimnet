param(
    [Parameter(Mandatory = $true)][string]$Plugin,
    [Parameter(Mandatory = $true)][string]$Pex,
    [Parameter(Mandatory = $true)][string]$ContentValidator,
    [string]$BaseTree
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Plugin -PathType Leaf) -or [IO.Path]::GetFileName($Plugin) -ne 'LivingPastStage0.esp') { throw 'Supply the locally created LivingPastStage0.esp.' }
if (-not (Test-Path -LiteralPath $Pex -PathType Leaf) -or [IO.Path]::GetFileName($Pex) -ne 'LP_S0_PlayerAlias.pex') { throw 'Supply the compiled LP_S0_PlayerAlias.pex.' }
$validatorArguments = @((Join-Path $PSScriptRoot "../content/jeepayjipex.living-past"))
if ($PSBoundParameters.ContainsKey('BaseTree')) {
    $validatorArguments += @('--base-tree', $BaseTree)
}
& $ContentValidator @validatorArguments
if ($LASTEXITCODE -ne 0) { throw "SkyrimNet content validation failed." }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'UI build failed.' }
$stage = Join-Path $PSScriptRoot ('../build/package-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'Scripts') | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../build/Data/Magelight') -Destination $stage -Recurse
Copy-Item -LiteralPath $Pex -Destination (Join-Path $stage 'Scripts/LP_S0_PlayerAlias.pex') -Force
Copy-Item -LiteralPath $Plugin -Destination (Join-Path $stage 'LivingPastStage0.esp') -Force
New-Item -ItemType Directory -Force -Path (Join-Path $stage "SKSE/Plugins/SkyrimNet/external") | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "../content/jeepayjipex.living-past") -Destination (Join-Path $stage "SKSE/Plugins/SkyrimNet/external") -Recurse
$output = Join-Path $PSScriptRoot '../dist/LivingPast-Stage0B.zip'
New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
Compress-Archive -Path (Join-Path $stage 'Magelight'), (Join-Path $stage 'Scripts'), (Join-Path $stage 'LivingPastStage0.esp'), (Join-Path $stage 'SKSE') -DestinationPath $output -Force
& (Join-Path $PSScriptRoot 'validate-package.ps1') -Archive $output
Write-Output "Created $output."
