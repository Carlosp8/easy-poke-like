import assert from 'node:assert/strict';
import test from 'node:test';

import {
  foldText,
  getAttackCoverageScore,
  getDefensiveScoreAgainstAttack,
  normalizeItemName,
  scoreCatchDraftSignals,
  scoreHeldItemFit,
  scoreRouteLookahead,
} from '../src/core/lib/strategy-utils.ts';

test('normalizes text and item names without locale-sensitive surprises', () => {
  assert.equal(foldText('Desafíos Pokémon'), 'desafios pokemon');
  assert.equal(normalizeItemName('  Never-Melt Ice!! '), 'never melt ice');
});

test('scores offensive and defensive type matchups with the core weights', () => {
  assert.equal(getAttackCoverageScore(['Electric', 'Normal'], ['Water', 'Flying']), 10);
  assert.equal(getAttackCoverageScore('Normal', 'Ghost'), -12);
  assert.equal(getDefensiveScoreAgainstAttack(['Ghost'], 'Normal'), 8);
});

test('scores catch draft signals for shiny, legendary, duplicate and boss-counter cases', () => {
  const scored = scoreCatchDraftSignals({
    name: 'Zapdos',
    types: ['Electric', 'Flying'],
    attackTypes: ['Electric'],
    isShiny: true,
    isLegendary: true,
    bossTypes: ['Water'],
    duplicatePairScore: 25,
    baseScore: 10,
  });

  assert.equal(scored.id, 'zapdos');
  assert.equal(scored.score, 285);
  assert.match(scored.reason, /new-shiny/);
  assert.match(scored.reason, /legendary/);
  assert.match(scored.reason, /duplicate-plan/);
  assert.match(scored.reason, /boss-counter/);
});

test('scores held item fit for useful, neutral and low-value items', () => {
  const charizard = {
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    attackTypes: ['Fire'],
  };

  assert.equal(scoreHeldItemFit(charizard, 'Charcoal').score, 45);
  assert.equal(scoreHeldItemFit(charizard, 'Leftovers').score, 35);
  assert.equal(scoreHeldItemFit(charizard, 'Lagging Tail').score, -50);
});

test('scores route lookahead with decayed future value', () => {
  const scored = scoreRouteLookahead(
    {
      id: 'start',
      type: 'battle',
      score: 10,
      next: [
        { id: 'safe-center', type: 'pokecenter', score: 8 },
        { id: 'rare-item', type: 'item', score: 30 },
      ],
    },
    1,
    0.5,
  );

  assert.equal(scored.score, 25);
  assert.equal(scored.details.bestNextId, 'rare-item');
});
