# Catalog exporter

`LivingPastExport.pas` is an SSEEdit script. It reads the winning ACHR and NPC_ records in the loaded order and writes `LivingPast-catalog.json` beside the script. It never changes records. Version 1 is described by `catalog.schema.json`. Reference and base identities contain the originating plugin filename and the six-digit plugin-local FormID. This representation applies to full and light plugins; the runtime load-order prefix is excluded. The export reports a count for every rejected reference category. Ambiguous counts are per placed reference, not per NPC base.

The exporter includes named, unique NPC bases with exactly one eligible persistent placed reference. It excludes deleted, disabled, conditional, nonpersistent, templated, unnamed and nonunique records. Runtime validation must still resolve the reference and compare its actor base. The location field is reserved for available cell metadata and may be empty. The generated file is written in UTF-8 and the exporter refuses to replace an existing file.

## Nolvus manual export

Close Skyrim and SSEEdit first. With the desired profile selected in the existing Nolvus MO2 instance, run the following in PowerShell from the repository root. This creates a private script directory under the ignored `build` directory and starts the registered `xEdit` executable through MO2's virtual filesystem. The active profile's plugin list supplies the load order. The command does not change the MO2 plugin list. Use a new directory for each run.

```powershell
$exportDir = Join-Path (Get-Location) ("build/catalog-export-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $exportDir | Out-Null
Copy-Item tools/catalog/LivingPastExport.pas $exportDir
$script = Join-Path $exportDir 'LivingPastExport.pas'
& 'D:/Nolvus/Instances/Nolvus Awakening/MO2/ModOrganizer.exe' 'xEdit' '-autoload' '-autoexit' '-DontCache' "-script:$script"
node tools/catalog/check.mjs (Join-Path $exportDir 'LivingPast-catalog.json')
```

SSEEdit may show an initial warning or error dialog. If no catalog is created, inspect its messages and log. The output and statistics must be checked against SSEEdit and an actual game before using them to select NPCs. The script-mode invocation, UTF-8 output, official and light plugin identities, and full Nolvus export have not yet been verified in SSEEdit on this machine.
