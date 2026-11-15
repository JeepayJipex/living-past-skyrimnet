# Stage 0-B validation

Stage 0-A was reported validated in game with Skyrim 1.7.104.0, SkyrimNet 1.1.1 and Magelight 1.8.0. Stage 0-B remains unverified in game.

## Local artifacts

Use the existing `LivingPastStage0.esp` with the start-game-enabled `LP_S0_TestQuest` and its Player reference alias attached to `LP_S0_PlayerAlias`. No new properties or aliases are required. If recreating it, use Skyrim.esm as master, assign PlayerRef as the alias specific reference and attach the script. Inspect the plugin in xEdit.

Compile with `scripts/compile.ps1`, supplying the Creation Kit compiler and flags, an output directory, and source import directories for vanilla, SKSE, Magelight and PapyrusUtil (including both StorageUtil.psc and PapyrusUtil.psc). Then run `scripts/package.ps1` with `-Plugin`, `-Pex`, `-ContentValidator` and `-BaseTree`. The base tree is the `skyrimnet.base` directory containing its manifest. The archive is `dist/LivingPast-Stage0B.zip` and has no Data wrapper. The validator checks archive structure and cannot verify ESP or PEX contents.

Magelight uses the `LivingPast/spike` view. To preserve an existing local key binding across updates, put it in the user's Magelight.json `hotkeys` object, for example `"LivingPast/spike": "F4"`. Preserve other settings. Magelight reads its user settings from the SKSE user-data directory, with its runtime directory as fallback. Restart the game after changing settings.

## Manual checklist

Use a disposable save and record dependency versions. Preserve the original save and its matching SKSE co-save before applying.

1. Open with the configured hotkey. Confirm the editor is empty before Apply. Edit a draft, close and reopen, and confirm it was not saved.
2. Apply a description, confirm the stored readback, and reopen the editor. Test accented characters, quotes, backslashes and `|`. Test 160 UTF-8 bytes and reject 161. Record actual round-trip behavior and transport limits. Storage readback alone does not establish projection.
3. Inspect the actual rendered prompt for Ysolda and confirm it contains the fact once. Trigger SkyrimNet dialogue and verify recognition without stating the fact in the player's line.
4. Inspect another NPC's prompt with Ysolda nearby and when she is a secondary subject. Inspect non-dialogue and secondary profile modes. Confirm no disclosure to another NPC. If any disclosure occurs, disable the layer until corrected.
5. Save, reload and reopen. Exit Skyrim completely, restart, reload and repeat the editor and prompt checks. Load the pre-Apply save with its matching co-save and confirm the relationship is absent. Apply the same value repeatedly and verify only one fact appears.
6. Exercise missing PapyrusUtil, Magelight and SkyrimNet dependencies, invalid actor resolution and failed bridge replies. Verify safe failure and no misleading success message. Close with the button, configured hotkey and Escape and verify movement, mouse, keyboard and camera controls after each.
7. Confirm a configured F4 override survives an updated package and a game restart. Record results and logs without publishing private relationship text.

## Projection boundary

The external submodule checks `render_mode == "full"` and requires both `npc.UUID` and `actorUUID` to resolve to Ysolda's placed reference. It does not write events or native memories. The installed base templates use full profiles in several contexts, including nearby profiles during warmup. No reliable dialogue-only marker has been established. Dynamic `full` output may be used in Ysolda's own contexts, and actual context propagation, stable-split behavior, privacy and caching require the runtime checks above.

The bridge uses a fixed 31-byte ASCII header followed by up to 160 UTF-8 bytes. JavaScript checks the exact readback. The host and Papyrus transport limits and byte preservation remain unverified until tested in game.
