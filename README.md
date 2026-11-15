# Living Past

Stage 0-B provides a test editor for one prior relationship with Ysolda. Apply writes one actor-bound PapyrusUtil StorageUtil value. The editor reads it back, and the SkyrimNet external layer attempts to include it in Ysolda's dynamic character profile. Save the game after applying.

Requires SkyrimNet 1.1.1, Magelight 1.8.0, SKSE and PapyrusUtil. The ESP and compiled PEX are local artifacts and are not committed. See [Stage 0 validation](docs/STAGE_0.md) for compilation, packaging and in-game checks. Offline validation does not establish in-game persistence or recipient isolation.

Run `npm ci`, `npm test`, `npm run build`, and `pwsh -NoProfile -File tests/package-validation.ps1` for portable checks. User paths and settings belong in ignored local configuration.
