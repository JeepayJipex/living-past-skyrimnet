# Stage 0 feasibility plan

Stage 0 is a set of technical spikes, not a release. The first implementation slice is S0-A. Do not use a successful offline build as evidence of in-game acceptance.

## S0-A — Magelight UI and JSON transport

**Implemented for review:** Vite/TypeScript page, hidden Magelight manifest panel, manual Insert binding, UI event stream, Papyrus alias source, and a browser preview. The source does not mutate game or save state.

**Game setup still required:**

### Create the local test artifacts

Install the Creation Kit and Skyrim, SKSE and Magelight script sources. In Creation Kit load `Skyrim.esm` only, create a quest `LP_S0_TestQuest`, enable **Start Game Enabled**, and leave quest stages, dialogue and objectives empty. Add a Reference Alias named `Player`, set **Specific Reference** to `PlayerRef`, and attach `LP_S0_PlayerAlias`. Save the new plugin as `LivingPastStage0.esp`. Do not modify existing records. Inspect the plugin in xEdit before using it; it should contain only the new quest and its alias, with Skyrim.esm as master.

Compile using the compiler and flags supplied with the Creation Kit. Include the directories containing vanilla scripts, SKSE scripts (including `StringUtil.psc`), Magelight's `Magelight.psc`, and this project's `Source/Scripts`. Example from PowerShell, with variables set to local paths:

```powershell
& $compiler 'LP_S0_PlayerAlias.psc' "-f=$flags" "-i=$projectSources;$vanillaSources;$skseSources;$magelightSources" "-o=$outputScripts"
```

Check the compiler exit status and ensure `LP_S0_PlayerAlias.pex` exists. Run `npm ci`, then `./scripts/package.ps1 -Plugin <path-to-LivingPastStage0.esp> -Pex <path-to-LP_S0_PlayerAlias.pex>`. Install `dist/LivingPast-Stage0A.zip` through MO2. Paths and generated artifacts stay local. The quest and PEX have not been generated or verified in this repository.

### Manual validation (not yet executed)

1. Install a compatible Magelight UI build and its required SKSE/Address Library dependencies in an isolated MO2 test profile. Record exact versions.
2. Build the UI with `npm ci` and `npm run build`. Install the contents of `build/Data/` as an MO2 test mod so the game sees `Data/Magelight/LivingPast/manifest.json`.
3. Launch a disposable save. Verify that no panel appears automatically. Press Insert to open it, edit both fields, press both test buttons, then close with the button, Insert, and Escape in separate runs. Check that movement and keyboard input return to Skyrim each time.
4. For bridge testing, compile `Source/Scripts/LP_S0_PlayerAlias.psc` with Magelight's `Magelight.psc` and the Skyrim/SKSE script sources. Attach it to a player-filled ReferenceAlias in a start-game-enabled test quest in a disposable plugin. Install the compiled PEX and plugin in the test profile.
5. Repeat step 3. The UI must show `Papyrus bridge connected`, and each event must show a matching request ID and `Verified` after editing the fields. Check `Magelight.log` and the Papyrus log for errors. Test after a full game restart and save reload.
6. Test while a game menu, console, loading screen, and controlled scene are active. Record whether the host refuses opening and whether focus returns normally. Record any hotkey collision and rebind through Magelight's configuration if needed.

**Evidence to retain:** exact dependency versions; MO2 test profile label in a private note; log excerpts with biography text removed; screenshots or video of opening, exchange, closing, and returned controls; pass/fail for each step. Do not place personal paths or profile names in tracked files.

**Exit condition:** the panel opens only on demand, JSON travels in both directions, and closing does not leave input captured. Any failed capability stays unclaimed.

Record mouse, keyboard, movement and camera control after closing by button, Insert, and Escape. Check a disposable save before and after the test for unexpected gameplay changes. Test alongside another UI mod. If the bridge is unavailable, the Close button must remain disabled; use Insert or Escape. Verify no window opens automatically on game launch or alternate start initialization. Record every result and exact dependency versions.

## S0-B — SkyrimNet projection

After S0-A, use one test relationship on a disposable save. Prove save/load persistence and a recipient filtered prompt for the selected NPC. Check all supported `render_mode` values, an unrelated NPC, reconnection, and a pre-application save branch. The reference profile must live in the save, not only in Magelight page storage or an external SkyrimNet database. No native memories are assumed.

## S0-C — engine behavior

On a disposable save and a documented plugin load order, test one eligible actor's relationship rank and one specific bed permission independently. Record the prior rank, changes after reload, trespass behavior, use of the bed, and nearby object ownership. If a bed is not proven safe, leave residences disabled for the MVP.

## Decision record

| Topic | Current decision | Revisit after |
| --- | --- | --- |
| UI framework | Plain TypeScript for the transport spike | In-game runtime and focus test |
| Magelight host | Manifest and Papyrus interfaces documented for current host; 1.8.0 minimum proposed | Exact installed version and S0-A test |
| Persistence format | Undecided | S0-B save branch test |
| NPC whitelist and residence | Undecided | S0-B and S0-C evidence |
| Living Past native DLL | No need demonstrated | Later capability gap |

## Source documentation

- [Magelight manifest layout and hotkey rules](https://github.com/Severause/MagelightUI/blob/main/docs/MANIFEST.md)
- [Magelight Papyrus functions and events](https://github.com/Severause/MagelightUI/blob/main/docs/PAPYRUS.md)
- [Magelight page bridge](https://github.com/Severause/MagelightUI/blob/main/docs/SDK.md)
