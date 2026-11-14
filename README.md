# Living Past

Living Past aims to give a Skyrim character a player chosen history that can be recognized by Skyrim and SkyrimNet. This repository currently contains a **Stage 0 feasibility prototype**, not a playable release.

## Current slice: S0-A UI

The prototype provides a Magelight panel that opens manually with **Insert**. It sends versioned JSON requests and checks the correlated echo against the original payload. `apply` is a dry run. No profile is saved and no actor, residence, or prompt is changed.

The page can load from its manifest alone. The Papyrus exchange additionally requires a compiled script attached to a player reference alias in a start-game-enabled test quest; that plugin is **not included** yet.

## Build and preview

Requires Node.js 20.19+ or 22.12+ (Node.js 24 is used locally).

```powershell
npm ci
npm run dev
npm run build
./scripts/package.ps1 -Plugin <path-to-LivingPastStage0.esp> -Pex <path-to-LP_S0_PlayerAlias.pex>
```

`npm run dev` opens the browser preview at the URL printed by Vite. The browser shows `Browser preview` and does not simulate game responses. `npm run build` stages the page and manifest under `build/Data/Magelight/LivingPast/` for an MO2 test mod. That staged folder is ignored by Git.

Copy `config.example.json` to ignored `config.local.json` if local paths are useful. The build does not require them. Do not commit personal game paths or MO2 profile names.

## Evidence and next gates

The build checks TypeScript and stages assets. A compiled PEX and a locally created test quest plugin are required for packaging; neither is included. Offline checks cannot prove Magelight rendering, input release, Papyrus transport, or save/load behavior. See [Stage 0 test plan](docs/STAGE_0.md) for creation steps and game tests.

The product brief is `Living_Past_Spec_v0.1.md` (14 November 2026), supplied separately by the product owner. Its example IDs, API paths, and NPC choices are proposals to verify during the spikes.
See the [English implementation scope](docs/PRODUCT_SCOPE.md) for the product boundaries carried into this repository.
