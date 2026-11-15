param([Parameter(Mandatory = $true)][string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive).Path)
try {
    $names = @($zip.Entries | Where-Object { $_.Name -ne '' } | ForEach-Object { $_.FullName.Replace('\', '/') })
    if (($names | Sort-Object -Unique).Count -ne $names.Count) { throw 'Duplicate archive entries.' }
    foreach ($name in $names) {
        if ($name.StartsWith('/') -or $name -match '(^|/)\.\.(/|$)' -or $name -match '^[A-Za-z]:') { throw "Unsafe archive path: $name" }
        if ($name -notmatch '^(LivingPastStage0\.esp|Scripts/LP_S0_PlayerAlias\.pex|Magelight/LivingPast/manifest\.json|Magelight/LivingPast/views/spike/(index\.html|assets/[^/]+))$') { throw "Unexpected archive entry: $name" }
    }
    $required = @('LivingPastStage0.esp', 'Scripts/LP_S0_PlayerAlias.pex', 'Magelight/LivingPast/manifest.json', 'Magelight/LivingPast/views/spike/index.html')
    foreach ($name in $required) { if ($name -cnotin $names) { throw "Missing archive entry: $name" } }
    $htmlEntry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -ceq 'Magelight/LivingPast/views/spike/index.html' }
    $reader = [IO.StreamReader]::new($htmlEntry.Open())
    try { $html = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $assets = @([regex]::Matches($html, '(?:src|href)="\./(assets/[^"?#]+)"') | ForEach-Object { $_.Groups[1].Value })
    if (-not ($assets | Where-Object { $_ -match '\.js$' }) -or -not ($assets | Where-Object { $_ -match '\.css$' })) { throw 'Built HTML must reference JavaScript and CSS assets.' }
    foreach ($asset in $assets) { if ("Magelight/LivingPast/views/spike/$asset" -cnotin $names) { throw "Missing referenced asset: $asset" } }
    Write-Output 'Archive structure validated. ESP and PEX contents are not validated.'
} finally { $zip.Dispose() }
