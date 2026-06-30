import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ROOT_DIR, extractBundle, resolveBundleInput } from '../scripts/extract-pokelike-bundle.ts';

const CURRENT_BUNDLE = path.join(ROOT_DIR, 'bundle.e9e84cb924.js');
const PREVIOUS_BUNDLE = path.join(ROOT_DIR, 'pokelike-bundle.08c8a0de1a.js');

function assertExtractedBundle(result) {
  assert.ok(result.meta.sha256.length >= 64);
  assert.equal(result.meta.warnings.length, 0);
  assert.ok(result.meta.counts.pokedex >= 600);
  assert.equal(result.meta.counts.moves, 18);
  assert.ok(result.meta.counts.items >= 30);
  assert.ok(result.meta.counts.passives >= 100);
  assert.ok(result.meta.counts.challenges >= 10);
  assert.ok(result.meta.counts.nodeTypes >= 10);
  assert.ok(result.data.nodeTypes.CATCH);
  assert.ok(result.data.challenges.some((challenge) => challenge.id === 'monotype'));
}

test('extracts the current local Pokelike bundle', (t) => {
  if (!existsSync(CURRENT_BUNDLE)) {
    t.skip('bundle.e9e84cb924.js is not available locally');
    return;
  }

  const result = extractBundle(CURRENT_BUNDLE);
  assertExtractedBundle(result);
});

test('extracts the previous Pokelike bundle when available', (t) => {
  if (!existsSync(PREVIOUS_BUNDLE)) {
    t.skip('pokelike-bundle.08c8a0de1a.js is not available locally');
    return;
  }

  const result = extractBundle(PREVIOUS_BUNDLE);
  assertExtractedBundle(result);
});

test('resolves an explicit HTML script reference without relying on the hash', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'easy-pokelike-'));
  const jsDir = path.join(tempRoot, 'js');
  mkdirSync(jsDir);
  writeFileSync(path.join(jsDir, 'bundle.anyhash123.js'), 'console.log("bundle");\n');
  const htmlPath = path.join(tempRoot, 'index.html');
  writeFileSync(htmlPath, '<!doctype html><script defer src="js/bundle.anyhash123.js"></script>');

  const resolved = resolveBundleInput([htmlPath], tempRoot);
  assert.equal(path.basename(resolved.bundlePath), 'bundle.anyhash123.js');
  assert.equal(resolved.resolution.mode, 'html');
});

test('autodetects the most recent local bundle candidate', () => {
  if (!existsSync(CURRENT_BUNDLE)) {
    return;
  }

  const resolved = resolveBundleInput([], ROOT_DIR);
  assert.match(path.basename(resolved.bundlePath), /bundle.*\.js$/);
  assert.equal(resolved.resolution.mode, 'autodetect');
});
