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

The view now opens with the relationship index. Choose **Load saved narrative** to populate the editor on demand. **Refresh diagnostic** reads StorageUtil only when requested. In the persistence procedures below, use both buttons after reopening to record the slot diagnostic and active narrative readback.

1. Confirm SkyrimNet 1.1.1, Magelight 1.8.0, SKSE and PapyrusUtil versions, enable the installed Living Past external bundle in SkyrimNet Plugins, and check SkyrimNet.log for load errors.
2. Open Living Past with its configured hotkey. Paste a 2,048-byte narrative containing several lines, accented characters, emoji, quotes, a backslash and vertical bars. Use unique start and end markers. The byte counter shows the UTF-8 length. Activate and reopen to verify the exact readback. Try 2,049 bytes and verify rejection.
3. Activate a different narrative, then interrupt transfer and close or reload before completion. Reopen and verify the last successful activation. Close immediately after sending activation and reopen to inspect the authoritative active value. Activation may have completed before dismissal. If activation times out, reopen to reconcile the active value. Save and reload, exit and restart Skyrim, load the pre-activation save and its matching co-save, then switch to a different playthrough. Inspect the active value and the first rendered request after every load.

## Persistence diagnostic

Use a fresh disposable save and the updated probe package. Click **Refresh diagnostic** to run the read-only check. Record the full diagnostic line and the separate active-probe readback message at each stage. Avoid recording the narrative itself in shared logs.

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

## Loading benchmark

The game report for the previous build was up to 5 seconds from opening the view to narrative display. That path ran the diagnostic before opening the session, then decoded the same slot for every chunk. The updated **Sequential baseline** reproduces the per-chunk requests and repeated decoding while keeping diagnostics out of the comparison. Index timing starts when the visible view opens. Narrative timing starts on **Load saved narrative** and records transfer time and time through writing the field. Storage time uses Papyrus wall-clock intervals around slot lookup and decoding. Each slot read can include multiple StorageUtil calls. A round trip is a page request with its complete response, and a batch can return several individual replies.

| Selection mode | Exact 2 KiB fixture in a local simulated bridge | Narrative round trips | Slot reads and decodes |
| --- | ---: | ---: | ---: |
| Sequential baseline | 281 ms | 18 | 18 |
| Bounded batch | 16 ms | 1 | 1 |
| Single large reply | 16 ms | 1 | 1 |

These example timings came from a Windows Node run with an 8 ms timer per request. They measure the client and scheduling model. They supply no evidence about the host's payload limit, Papyrus scheduling, or in-game latency. Reproduce the comparison with the command below. The fixture splits across 17 chunks, and the baseline uses a final EOF request. Staged verification uses a transient per-read snapshot instead of decoding on each chunk.

    node --test tests/probe-loading.test.mjs

### In-game checklist

1. Install the rebuilt ZIP through MO2 and verify the winning Magelight files and PEX. Record the Skyrim, SKSE, PapyrusUtil and Magelight versions. Use the same save and an exact 2,048-byte narrative with Unicode, line breaks, and distinct start and end markers for all three modes.
2. Time a first open after game restart and ten subsequent opens. Record the index and session timings before clicking Load. An index open should report one request and leave the narrative empty. Compare with the 500 ms index target.
3. Run ten selections per mode on the same narrative and alternate modes. Record editor time, transfer time, StorageUtil and decode time, requests, replies, and timeouts. Report the median and worst sample and check the 1-second selection target. Compare the exact JSON field to the fixture after each successful load.
4. Run **Bidirectional payload benchmark** at 160, 512, 1,024, 2,048 and 4,096 bytes. That number excludes the frame header. Record exact echo, timeout, rejection, or mismatch. Close and reopen between failures. A failed frame test may be caused by either direction or by Papyrus string handling. The 4 KiB probe limit bounds the experiment and does not establish the host's limit.
5. Close during a read, reopen, then repeat after correcting the narrative and after loading an older save. Verify that late replies cannot populate a new session and that the text comes from the selected save. Inspect Ysolda's payload after loading both saves. Run the checklist independently on 1.5.97 and the supported 1.6.x builds available for testing.

Use a compact relationship index at open and load one narrative by relationship ID at selection. The bounded batch is the working candidate because it keeps the documented probe envelope and removes the per-chunk request dependency. Prefer a single large reply only if exact echo, full narrative readback, and failure behavior pass across the supported stacks. In the eventual wizard, cache only narratives explicitly loaded in the current save/view session. Clear the cache on close, visibility loss, game load or revert, and correction. Correlation IDs must bind responses to the current session and selected relationship. The probe rereads on each selection to keep timings comparable and retains the existing save-scoped storage format.

Magelight 1.8.0 documents 1.5.97 and 1.6.x host support with the corresponding SKSE64 and Address Library editions. Use a PapyrusUtil build that matches each runtime. The tagged Papyrus bridge uses a string argument. Its API does not establish a safe end-to-end payload size or burst delivery timing. Consider a minimal native bridge only if the instrumented Papyrus alternatives miss the targets after separating storage/decode from transport time. A native bridge would introduce runtime-specific binary compatibility and packaging. [Magelight requirements](https://github.com/Severause/MagelightUI/blob/v1.8.0/README.md#requirements) · [Tagged Papyrus bridge implementation](https://github.com/Severause/MagelightUI/blob/v1.8.0/src/MagelightPapyrus.cpp)

## Inspect the actual dialogue request

Open SkyrimNet dashboard **System → Logs → API Requests**, select the new dialogue request by timestamp and actor, and open its **Request payload**. Search the complete request for both unique markers and count occurrences. Speak to Ysolda without mentioning the marker and verify her direct response request contains it once. Speak to Carlotta while Ysolda is nearby, before either NPC voices the private fact, and verify the marker is absent. Check the player hidden from Ysolda, Ysolda as a secondary subject, thoughts, warmup and dynamic-bio generation. Inspect the effective player biography markers in the same request. A dialogue response or profile preview alone does not establish recipient isolation.

If the marker reaches an unintended request, remove or disable this experimental external layer. Record the prompt stack and actual request context. The tagged base `dialogue_response` supplies `task_at_end` to `system_head`; other installed prompt stacks may behave differently.

## Evidence boundaries

Offline checks can verify chunking and compilation. They cannot prove Magelight event delivery, Papyrus byte preservation, StorageUtil rollback, prompt cache invalidation, recipient isolation or model behavior. Test the 2 KiB path first and record the failing stage and logs if it fails. The active marker and slots are save-bound only if the installed PapyrusUtil and matching SKSE co-save restore them correctly. The native player biography is managed separately by SkyrimNet and may have different rollback behavior.

The current harness tests one actor and makes no claim about multiple relationships. Manual test results determine whether the selected `system_head` variables provide a safe boundary for the next step.
