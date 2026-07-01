# Core Layout

`easy-pokelike.user.js` is generated from the files listed in `manifest.json`.
It is a local/release artifact, not the source of truth.

The core still runs as one Tampermonkey IIFE, so every part shares the same scope.
The build script creates that IIFE wrapper; individual parts must remain parseable
JavaScript on their own. The split is organizational, not a module boundary.

`types.d.ts` defines the shared domain vocabulary used while migrating the core
toward stronger TypeScript coverage.

For the broader development workflow, refactor rules and testing strategy, see
[`../../docs/development.md`](../../docs/development.md).

## Parts

- `00-runtime-hooks.js`: browser safety guards.
- `01-config-data.js`: config, type chart and static strategy data.
- `02-controls-state.js`: mutable state, persisted controls and panel UI.
- `03-detection-strategy.js`: DOM parsing, screen detection and strategy helpers.
- `04-scoring-routing.js`: matchup scoring, ordering and route evaluation.
- `05-screen-handlers.js`: handlers for map, battle, catch, item and meta screens.
- `06-initialization.js`: banner, reporting timers and loop startup.
- `types.d.ts`: domain contracts for controls, Pokemon units and map nodes.
- `lib/`: pure utilities extracted as the first migration target for stronger
  tests and future module boundaries. The build transpiles these modules into a
  local userscript helper before concatenating the legacy parts.

## Editing Rules

- Keep declarations before first use; `manifest.json` order matters.
- Add a new part only when it owns a clear responsibility.
- Prefer generated data from `src/data/generated/` over hardcoding fresh bundle data.
- Run `npm run check` after changing scripts, tests, types or core behavior.
- Run `npm run build` after changing any core part when you need the userscript artifact.
- Use the names in `types.d.ts` when adding JSDoc or converting a part to TS.
