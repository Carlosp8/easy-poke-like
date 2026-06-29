# Core Layout

`easy-pokelike.user.js` is generated from the files listed in `manifest.json`.

The core still runs as one Tampermonkey IIFE, so every part shares the same scope.
The split is organizational, not a module boundary.

`types.d.ts` defines the shared domain vocabulary used while migrating the core
toward stronger TypeScript coverage.

## Parts

- `00-runtime-hooks.js`: IIFE start and browser safety guards.
- `01-config-data.js`: config, type chart and static strategy data.
- `02-controls-state.js`: mutable state, persisted controls and panel UI.
- `03-detection-strategy.js`: DOM parsing, screen detection and strategy helpers.
- `04-scoring-routing.js`: matchup scoring, ordering and route evaluation.
- `05-screen-handlers.js`: handlers for map, battle, catch, item and meta screens.
- `06-initialization.js`: banner, reporting timers and IIFE close.
- `types.d.ts`: domain contracts for controls, Pokemon units and map nodes.

## Editing Rules

- Keep declarations before first use; `manifest.json` order matters.
- Add a new part only when it owns a clear responsibility.
- Prefer generated data from `src/data/generated/` over hardcoding fresh bundle data.
- Run `npm run build` after changing any core part.
- Use the names in `types.d.ts` when adding JSDoc or converting a part to TS.
