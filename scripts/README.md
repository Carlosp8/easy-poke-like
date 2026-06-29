# Scripts

The project scripts are TypeScript files executed directly by Node 22 with
`--experimental-strip-types`.

## `build-userscript.ts`

Reads:

- `src/userscript.meta.js`
- `src/core/manifest.json`
- every core part listed in the manifest

Then it writes `easy-pokelike.user.js` and leaves syntax validation to
`node --check`.

## `extract-pokelike-bundle.ts`

Accepts a bundle path, an HTML file that references a bundle, or no argument.
With no argument it autodetects the newest local bundle candidate.

The extractor:

- finds the obfuscated string table and decoder by structure, not by hash;
- rotates and decodes strings without running the game app;
- neutralizes browser-startup IIFEs during extraction;
- evaluates only enough of the bundle to export data constants;
- writes normalized JSON into `src/data/generated/`.

If the bundle obfuscator changes in a real way, the extractor should fail with
a diagnostic instead of writing partial data silently.
