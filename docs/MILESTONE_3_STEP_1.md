# Milestone 3 Step 1 validation

This package is an experimental Ysolda-only probe. It uses new StorageUtil keys and replaces the Stage 0-B prompt layer in the package. The previous Stage 0-B value remains stored but is not projected by this probe. Install it as an MO2 replacement on a disposable profile. Preserve matching `.ess` and `.skse` files before testing.

## Build and install

From the repository root in PowerShell, set these variables to the local Creation Kit, Papyrus import, SkyrimNet DevKit, base content and Stage 0 ESP locations. The ESP must contain the existing player-alias quest.

```powershell
$compiler = 'C:/path/to/Papyrus Compiler/PapyrusCompiler.exe'
$flags = 'C:/path/to/TESV_Papyrus_Flags.flg'
$imports = @('C:/path/to/SKSE', 'C:/path/to/Magelight', 'C:/path/to/PapyrusUtil', 'C:/path/to/vanilla/scripts')
$plugin = 'C:/path/to/LivingPastStage0.esp'
$validator = 'C:/path/to/1.1.1/tools/content-validate.exe'
$baseTree = 'C:/path/to/skyrimnet.base'
npm ci
npm test
pwsh -NoProfile -File tests/package-validation.ps1
./scripts/compile.ps1 -Compiler $compiler -Flags $flags -ImportDirectories $imports -OutputDirectory './build/probe/Scripts'
./scripts/package.ps1 -Plugin $plugin -Pex './build/probe/Scripts/LP_S0_PlayerAlias.pex' -ContentValidator $validator -BaseTree $baseTree
./scripts/validate-package.ps1 -Archive './dist/LivingPast-M3-Step1-Probe.zip'
```

Install the ZIP in MO2 and choose Replace for the existing Living Past mod. Disable other Stage 0-B copies. In MO2's Data tab inspect the winning origins for `LivingPastStage0.esp`, `Scripts/LP_S0_PlayerAlias.pex`, the Magelight view, and `SKSE/Plugins/SkyrimNet/external/jeepayjipex.living-past/manifest.json` and `prompts/submodules/system_head/0651_living_past_probe.prompt`. Search the virtual Data tree for `0651_living_past_relationship.prompt` and ensure no enabled mod supplies the old file. Replacing a different MO2 mod folder can leave an older enabled copy winning independently.

## Native biography

In SkyrimNet 1.1.1 open Characters, select the player and inspect the Static, Save-Specific and Dynamic tabs. Use distinct harmless markers to identify the effective layer. Save-Specific begins from Static where no save copy exists. The dashboard selects Dynamic when present, then Save-Specific, then Static. Confirm actual rendering because editor selection does not establish the engine's behavior. Edit the effective biography while preserving existing text, save, reopen and verify. With a disposable save, run Dynamic Update, inspect the resulting Dynamic tab and verify which existing facts remain. SkyrimNet owns these files. This probe does not write them.

Copy multiline text containing accented characters from the Living Past view to Characters and back using the game keyboard shortcuts. Record whether the Magelight view survives switching, and whether punctuation and Unicode remain exact.

## Transport and activation

1. Confirm SkyrimNet 1.1.1, Magelight 1.8.0, SKSE and PapyrusUtil versions, enable the installed Living Past external bundle in SkyrimNet Plugins, and check SkyrimNet.log for load errors.
2. Open Living Past with its configured hotkey. Paste a 2,048-byte narrative containing several lines, accented characters, emoji, quotes, a backslash and vertical bars. Use unique start and end markers. The byte counter shows the UTF-8 length. Activate and reopen to verify the exact readback. Try 2,049 bytes and verify rejection.
3. Activate a different narrative, then interrupt transfer and close or reload before completion. Reopen and verify the last successful activation. Close immediately after sending activation and reopen to inspect the authoritative active value. Activation may have completed before dismissal. If activation times out, reopen to reconcile the active value. Save and reload, exit and restart Skyrim, load the pre-activation save and its matching co-save, then switch to a different playthrough. Inspect the active value and the first rendered request after every load.

## Persistence diagnostic

Use a fresh disposable save and the updated probe package. The diagnostic runs automatically when the view opens. **Refresh diagnostic** repeats the same read-only check. Record the full diagnostic line and the separate active-probe readback message at each stage. Avoid recording the narrative itself in shared logs.

1. Open the probe before activation and record the diagnostic and active readback.
2. Activate a 2,048-byte narrative, refresh the diagnostic, and record both results.
3. Make a new manual save and note its filename and matching `.skse` co-save. Quit Skyrim completely.
4. Restart Skyrim through MO2, load that exact save with its matching co-save, and open the probe. Before performing any activation or other writes, record the diagnostic and active readback again.

`ref`, `base`, and `match` report actor reference resolution, base resolution, and their match. `marker` reports whether the integer key exists and `active` is its value. `s1` and `s2` report string-key presence and byte length. `read=ok` means the selected key exists and was read by Papyrus. `read=missing` means the marker selects a missing key. `read=no-active` means the marker is absent or zero. `read=invalid-marker` means the marker is outside the supported slots. `storage=unavailable` indicates that actor validation or PapyrusUtil availability failed, so marker and slot data were not queried. Compare the separate active-probe readback byte count or error with the selected slot length to identify a client readback failure. A length is measured using Papyrus `StringUtil`; byte fidelity remains an in-game validation target.

## Multiline restart regression

A local co-save from the reproduction contained both marker lines under the raw slot key, with a literal LF between them. Both the editor and the Ysolda request lost the second line after loading that save. The public PapyrusUtil implementation stores string values in a text stream and escapes spaces. The probe now also encodes whitespace and the escape character before StorageUtil writes. It decodes the selected slot for the editor and prompt. The diagnostic reports whether each slot uses the new encoding and the length after decoding.

1. Install the current probe using MO2 Replace. Start with a disposable save and open **Exact text for line-ending tests**. Paste the JSON string below into **Draft as a JSON string** and choose **Load exact draft**. This preserves exact input even if the clipboard host normalizes line endings.

       "LPTEST_FIRST_LINE\r\nLPTEST_SECOND_LINE\nÉté 😀 C:\\path\\n %0A %25\t\n"

2. Activate, confirm immediate readback, and record the exact JSON and diagnostic. Create a new manual save and note the matching SKSE co-save. Quit Skyrim completely.
3. Restart through MO2 and load that exact save. Before any new writes, compare the **Draft as a JSON string** value with the original. In the next Ysolda request, inspect the actual request payload for both markers, Unicode, backslashes, and the original line endings. Compare the decoded JSON value if the viewer shows escaped characters. The existing prompt projection converts square brackets to parentheses to protect prompt structure.
4. Repeat with the LF-only two-line fixture and a narrative padded to exactly 2,048 UTF-8 bytes. Load the pre-activation save pair to check rollback. The reproduction requires no conversation-history reset. Legacy slots are read as stored and upgraded only by explicit activation. A legacy value already truncated at load needs the original narrative to recover the lost lines.

The automated round-trip test applies the shipped codec rules to a simulated text-stream restore. The full restart and exact SkyrimNet request rendering require the in-game observations above.

## Inspect the actual dialogue request

Open SkyrimNet dashboard **System → Logs → API Requests**, select the new dialogue request by timestamp and actor, and open its **Request payload**. Search the complete request for both unique markers and count occurrences. Speak to Ysolda without mentioning the marker and verify her direct response request contains it once. Speak to Carlotta while Ysolda is nearby, before either NPC voices the private fact, and verify the marker is absent. Check the player hidden from Ysolda, Ysolda as a secondary subject, thoughts, warmup and dynamic-bio generation. Inspect the effective player biography markers in the same request. A dialogue response or profile preview alone does not establish recipient isolation.

If the marker reaches an unintended request, remove or disable this experimental external layer. Record the prompt stack and actual request context. The tagged base `dialogue_response` supplies `task_at_end` to `system_head`; other installed prompt stacks may behave differently.

## Evidence boundaries

Offline checks can verify chunking and compilation. They cannot prove Magelight event delivery, Papyrus byte preservation, StorageUtil rollback, prompt cache invalidation, recipient isolation or model behavior. Test the 2 KiB path first and record the failing stage and logs if it fails. The active marker and slots are save-bound only if the installed PapyrusUtil and matching SKSE co-save restore them correctly. The native player biography is managed separately by SkyrimNet and may have different rollback behavior.

The current harness tests one actor and makes no claim about multiple relationships. Manual test results determine whether the selected `system_head` variables provide a safe boundary for the next step.
