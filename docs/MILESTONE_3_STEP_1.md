# Milestone 3 Step 1 validation

This package is an experimental Ysolda-only probe. It uses new StorageUtil keys and replaces the Stage 0-B prompt layer in the package. The previous Stage 0-B value remains stored but is not projected by this probe. Install it as an MO2 replacement on a disposable profile. Preserve matching `.ess` and `.skse` files before testing.

## Native biography

In SkyrimNet 1.1.1 open Characters, select the player and inspect the Static, Save-Specific and Dynamic tabs. Use distinct harmless markers to identify the effective layer. Save-Specific begins from Static where no save copy exists. The dashboard selects Dynamic when present, then Save-Specific, then Static. Confirm actual rendering because editor selection does not establish the engine's behavior. Edit the effective biography while preserving existing text, save, reopen and verify. With a disposable save, run Dynamic Update, inspect the resulting Dynamic tab and verify which existing facts remain. SkyrimNet owns these files. This probe does not write them.

Copy multiline text containing accented characters from the Living Past view to Characters and back using the game keyboard shortcuts. Record whether the Magelight view survives switching, and whether punctuation and Unicode remain exact.

## Transport and activation

1. Confirm SkyrimNet 1.1.1, Magelight 1.8.0, SKSE and PapyrusUtil versions, enable the installed Living Past external bundle in SkyrimNet Plugins, and check SkyrimNet.log for load errors.
2. Open Living Past with its configured hotkey. Paste a 2,048-byte narrative containing several lines, accented characters, emoji, quotes, a backslash and vertical bars. Use unique start and end markers. The byte counter shows the UTF-8 length. Activate and reopen to verify the exact readback. Try 2,049 bytes and verify rejection.
3. Activate a different narrative, then interrupt transfer and close or reload before completion. Reopen and verify the last successful activation. If activation times out, reopen to reconcile the active value. Save and reload, exit and restart Skyrim, load the pre-activation save and its matching co-save, then switch to a different playthrough. Inspect the active value and the first rendered request after every load.

## Inspect the actual dialogue request

Open SkyrimNet dashboard **System → Logs → API Requests**, select the new dialogue request by timestamp and actor, and open its **Request payload**. Search the complete request for both unique markers and count occurrences. Speak to Ysolda without mentioning the marker and verify her direct response request contains it once. Speak to Carlotta while Ysolda is nearby, before either NPC voices the private fact, and verify the marker is absent. Check the player hidden from Ysolda, Ysolda as a secondary subject, thoughts, warmup and dynamic-bio generation. Inspect the effective player biography markers in the same request. A dialogue response or profile preview alone does not establish recipient isolation.

If the marker reaches an unintended request, remove or disable this experimental external layer. Record the prompt stack and actual request context. The tagged base `dialogue_response` supplies `task_at_end` to `system_head`; other installed prompt stacks may behave differently.

## Evidence boundaries

Offline checks can verify chunking and compilation. They cannot prove Magelight event delivery, Papyrus byte preservation, StorageUtil rollback, prompt cache invalidation, recipient isolation or model behavior. Test the 2 KiB path first and record the failing stage and logs if it fails. The active marker and slots are save-bound only if the installed PapyrusUtil and matching SKSE co-save restore them correctly. The native player biography is managed separately by SkyrimNet and may have different rollback behavior.

The current harness tests one actor and makes no claim about multiple relationships. Manual test results determine whether the selected `system_head` variables provide a safe boundary for the next step.
