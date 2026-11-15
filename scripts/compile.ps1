param(
    [Parameter(Mandatory)][string]$Compiler,
    [Parameter(Mandatory)][string]$Flags,
    [Parameter(Mandatory)][string[]]$ImportDirectories,
    [Parameter(Mandatory)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$source = (Resolve-Path (Join-Path $PSScriptRoot '../Source/Scripts/LP_S0_PlayerAlias.psc')).Path
$imports = @((Split-Path $source)) + $ImportDirectories
& $Compiler $source "-f=$Flags" "-i=$($imports -join ';')" "-o=$OutputDirectory"
if ($LASTEXITCODE -ne 0) { throw 'Papyrus compilation failed.' }
