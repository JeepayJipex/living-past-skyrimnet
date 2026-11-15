# Stage 0 feasibility plan

Stage 0 is a set of technical spikes, not a release. The first implementation slice is S0-A. Do not use a successful offline build as evidence of in-game acceptance.

## S0-A — Magelight UI and JSON transport

**Implemented for review:** Vite/TypeScript page, hidden Magelight manifest panel, manual Insert binding, UI event stream, Papyrus alias source, and a browser preview. The source does not mutate game or save state.

**Automated checks:** `npm test` checks protocol correlation, mismatched payloads, duplicates, malformed replies, timeout and out-of-order delivery. `npm run build` checks TypeScript and builds the UI. `pwsh -NoProfile -File tests/package-validation.ps1` checks the archive validator with test fixtures. These checks do not compile Papyrus or validate ESP/PEX contents.

### Create the local test artifacts

Install the Creation Kit and Skyrim, SKSE and Magelight script sources. In Creation Kit load `Skyrim.esm` only, create a quest `LP_S0_TestQuest`, enable **Start Game Enabled**, and leave quest stages, dialogue and objectives empty. Add a Reference Alias named `Player`, set **Specific Reference** to `PlayerRef`, and attach `LP_S0_PlayerAlias`. Save the new plugin as `LivingPastStage0.esp`. Do not modify existing records. Inspect the plugin in xEdit before using it; it should contain only the new quest and its alias, with Skyrim.esm as master.

Compile using the compiler and flags supplied with the Creation Kit. Include the directories containing vanilla scripts, SKSE scripts (including `StringUtil.psc`), Magelight's `Magelight.psc`, and this project's `Source/Scripts`. Example from PowerShell, with variables set to local paths:

```powershell
& $compiler 'LP_S0_PlayerAlias.psc' "-f=$flags" "-i=$projectSources;$vanillaSources;$skseSources;$magelightSources" "-o=$outputScripts"
```

Check the compiler exit status and ensure `LP_S0_PlayerAlias.pex` exists. Run `npm ci`, then `./scripts/package.ps1 -Plugin <path-to-LivingPastStage0.esp> -Pex <path-to-LP_S0_PlayerAlias.pex>`. Install `dist/LivingPast-Stage0A.zip` through MO2. Paths and generated artifacts stay local. The quest and PEX have not been generated or verified in this repository.

### Manual validation (not yet executed)

1. Install the archive created above and compatible Magelight, SKSE and Address Library versions in a disposable MO2 profile. Record exact versions and enable the test plugin.
2. Launch and load a disposable save, including an alternate start if available. Confirm that no window opens automatically.
3. Press Insert, edit both fields and press both test buttons. Confirm each displayed request ID receives a matching `Verified` response; Apply is a dry run.
4. Close with the button, reopen and close with Insert, then reopen and close with Escape. After each close check movement, keyboard, mouse and camera controls. If the bridge is unavailable, check that the Close button is disabled and use Insert or Escape.
5. Save and reload, then restart Skyrim completely and repeat the open, exchange and close checks. Check that gameplay state did not change.
6. Inspect Magelight and Papyrus logs for errors without recording biography text. Test alongside another UI mod, and attempt opening during a game menu, console, loading screen and controlled scene. Record refused opens, focus behavior and hotkey collisions.

**Evidence to retain:** exact dependency versions; MO2 test profile label in a private note; log excerpts with biography text removed; screenshots or video of opening, exchange, closing, and returned controls; pass/fail for each step. Do not place personal paths or profile names in tracked files.

**Exit condition:** the panel opens only on demand, JSON travels in both directions, and closing does not leave input captured. Any failed capability stays unclaimed.

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
