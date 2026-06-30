import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ROOT_DIR } from '../scripts/build-userscript.ts';

function readGeneratedJson(fileName) {
  return JSON.parse(
    readFileSync(path.join(ROOT_DIR, 'src', 'data', 'generated', fileName), 'utf8'),
  );
}

test('generated bundle metadata has the expected data contract', () => {
  const meta = readGeneratedJson('bundle-meta.json');

  assert.match(meta.sourceBundle, /bundle.*\.js$/);
  assert.match(meta.sha256, /^[a-f0-9]{64}$/);
  assert.equal(meta.warnings.length, 0);
  assert.ok(meta.counts.pokedex >= 600);
  assert.equal(meta.counts.moves, 18);
  assert.ok(meta.counts.items >= 30);
  assert.ok(meta.counts.passives >= 100);
  assert.ok(meta.counts.nodeTypes >= 10);
});

test('generated gameplay data exposes required sections', () => {
  const pokedex = readGeneratedJson('pokedex.json');
  const items = readGeneratedJson('items.json');
  const nodeTypes = readGeneratedJson('node-types.json');
  const challenges = readGeneratedJson('challenges.json');

  assert.equal(typeof pokedex, 'object');
  assert.equal(pokedex['1'].name, 'Bulbasaur');
  assert.ok(Array.isArray(items));
  assert.ok(items.some((item) => item.name));
  assert.ok(nodeTypes.CATCH);
  assert.ok(challenges.some((challenge) => challenge.id === 'monotype'));
});
