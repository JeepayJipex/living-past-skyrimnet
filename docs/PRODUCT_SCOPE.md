# Product scope for implementation

This is an English implementation summary of the product brief, version 0.1 (14 November 2026). The brief remains the source for detailed product decisions. Technical examples in it require feasibility checks before they become implementation contracts.

## Purpose

Living Past lets a player choose a character history at any point in a Skyrim save. After explicit confirmation, the mod should project a structured profile into limited Skyrim mechanics and recipient filtered SkyrimNet context. The Whiterun catalog is the proposed MVP; the player may be anywhere when opening the editor.

## Core invariants

- Installation and loading alone have no gameplay effect and no active Living Past prompt data.
- Closing the editor never confirms a draft. Preview and application are separate operations.
- Active profile data belongs to the current save. Reopening, double confirmation, and reloading must not duplicate effects.
- A relationship secret is visible only to explicitly authorized NPCs.
- Narrative only choices are labeled; a partial failure is visible and recoverable.
- Existing relations, ownership, quests, factions, crime state, economy, and AI packages are not silently overwritten.

## MVP boundaries after Stage 0

The planned first vertical slice is one selected, eligible Whiterun NPC recognizing one relationship immediately after application and again after reload. The full MVP can expand to a five screen editor, up to three safe NPC relationships, structured biography, and narrative occupation and reputation. A residence option is included only if a specific bed permission passes S0-C.

Alternate starts, teleportation, universal NPC coverage, native SkyrimNet memories, salaries, job schedules, marriage, and broad ownership changes are outside this MVP.

## Implementation order

1. S0-A: manual Magelight UI and bidirectional JSON transport.
2. S0-B: save bound relationship fact and recipient filtered SkyrimNet context.
3. S0-C: safe relationship rank and specific lodging checks on a disposable save.
4. One complete social vertical slice, then the wider Whiterun MVP.

The profile schema, actor whitelist, bed preset, plugin records, and native DLL requirement remain open decisions until the relevant spike has evidence.
