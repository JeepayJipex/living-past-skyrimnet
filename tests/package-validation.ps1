$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$testDir = Join-Path ([IO.Path]::GetTempPath()) ('livingpast-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testDir | Out-Null
$archive = Join-Path $testDir 'fixture.zip'
$validator = Join-Path $PSScriptRoot '../scripts/validate-package.ps1'
function Make-Fixture([bool]$includePex, [bool]$includeJs, [string]$omitContent = '') {
    $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $entries = @{
            'LivingPastStage0.esp' = 'fixture only'
            'SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/manifest.json' = '{}'
            'SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/prompts/submodules/system_head/0651_living_past_probe.prompt' = 'fixture'
            'Magelight/LivingPast/manifest.json' = '{}'
            'Magelight/LivingPast/views/spike/index.html' = '<script src="./assets/app.js"></script><link href="./assets/app.css">'
            'Magelight/LivingPast/views/spike/assets/app.css' = 'fixture'
        }
        if ($includeJs) { $entries['Magelight/LivingPast/views/spike/assets/app.js'] = 'fixture' }
        if ($includePex) { $entries['Scripts/LP_S0_PlayerAlias.pex'] = 'fixture only' }
        if ($omitContent) { $entries.Remove($omitContent) }
        foreach ($name in $entries.Keys) {
            $entry = $zip.CreateEntry($name)
            $writer = [IO.StreamWriter]::new($entry.Open())
            try { $writer.Write($entries[$name]) } finally { $writer.Dispose() }
        }
    } finally { $zip.Dispose() }
}
try {
    Make-Fixture $true $true
    & $validator -Archive $archive
    Remove-Item -LiteralPath $archive
    Make-Fixture $false $true
    $rejected = $false
    try { & $validator -Archive $archive } catch { $rejected = $true }
    if (-not $rejected) { throw 'A package without a PEX was accepted.' }
    Remove-Item -LiteralPath $archive
    Make-Fixture $true $false
    $rejected = $false
    try { & $validator -Archive $archive } catch { $rejected = $true }
    if (-not $rejected) { throw 'A package without a referenced asset was accepted.' }
    foreach ($missing in @(
        'SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/manifest.json',
        'SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/prompts/submodules/system_head/0651_living_past_probe.prompt'
    )) {
        Remove-Item -LiteralPath $archive
        Make-Fixture $true $true $missing
        $rejected = $false
        try { & $validator -Archive $archive } catch { $rejected = $true }
        if (-not $rejected) { throw "A package without $missing was accepted." }
    }
    Remove-Item -LiteralPath $archive
    Make-Fixture $true $true
    $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Update)
    try {
        $entry = $zip.CreateEntry('SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/prompts/submodules/character_bio/0651_living_past_relationship.prompt')
        $writer = [IO.StreamWriter]::new($entry.Open())
        try { $writer.Write('obsolete') } finally { $writer.Dispose() }
    } finally { $zip.Dispose() }
    $rejected = $false
    try { & $validator -Archive $archive } catch { $rejected = $true }
    if (-not $rejected) { throw 'A package containing the obsolete Stage 0-B prompt was accepted.' }
    Write-Output 'Package validator accepted the complete fixture and rejected missing PEX, asset and SkyrimNet content fixtures.'
} finally {
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
    Remove-Item -LiteralPath $testDir
}
