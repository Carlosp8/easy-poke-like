import assert from 'node:assert/strict';
import test from 'node:test';

import {
  foldText,
  getAttackCoverageScore,
  getCenterNeedStatus,
  getDefensiveScoreAgainstAttack,
  getEarlyCatchAllowance,
  getItemBoostType,
  getProjectedAverageLevelAfterCatch,
  hasMatchingAttackForItem,
  isHealingItem,
  isLowValueHeldItem,
  isTypeBoostItemUsefulForTeam,
  normalizeItemName,
  scoreCatchDraftSignals,
  scoreHeldItemFit,
  scoreRouteLookahead,
  shouldPrioritizeEarlyTraining,
} from '../src/core/lib/strategy-utils.ts';

test('normalizes text and item names without locale-sensitive surprises', () => {
  assert.equal(foldText('  Desafios   Pokemon  '), 'desafios pokemon');
  assert.equal(normalizeItemName('  Never-Melt Ice!! '), 'never melt ice');
  assert.equal(normalizeItemName('MT_Normal', { 'mt normal': 'tm normal' }), 'tm normal');
  assert.equal(normalizeItemName('quick-claw', { 'quick claw': 'quick claw' }), 'quick claw');
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

test('classifies held item utility with normalized item names', () => {
  assert.equal(isLowValueHeldItem('Kings Rock'), true);
  assert.equal(isLowValueHeldItem('Leftovers'), false);
  assert.equal(isHealingItem('Leftovers'), true);
  assert.equal(isHealingItem('Charcoal'), false);
});

test('matches type boost items against attack coverage', () => {
  const charizard = {
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    attackTypes: ['Fire'],
  };
  const blastoise = {
    name: 'Blastoise',
    types: ['Water'],
    attackTypes: ['Water'],
  };

  assert.equal(getItemBoostType('Never-Melt Ice'), 'Ice');
  assert.equal(getItemBoostType('Hard Stone'), 'Rock');
  assert.equal(hasMatchingAttackForItem(charizard, 'Charcoal'), true);
  assert.equal(hasMatchingAttackForItem(blastoise, 'Charcoal'), false);
  assert.equal(isTypeBoostItemUsefulForTeam('Charcoal', [blastoise]), false);
  assert.equal(isTypeBoostItemUsefulForTeam('Charcoal', [blastoise, charizard]), true);
  assert.equal(isTypeBoostItemUsefulForTeam('Leftovers', [blastoise]), true);
});

test('decides center visits from team health and carry readiness', () => {
  const healthyTeam = [
    { name: 'Lapras', hp: 88, level: 30, types: ['Water', 'Ice'] },
    { name: 'Charizard', hp: 92, level: 28, types: ['Fire', 'Flying'] },
  ];
  const riskyTeam = [
    { name: 'Lapras', hp: 88, level: 30, types: ['Water', 'Ice'] },
    { name: 'Charizard', hp: 0, level: 28, isFainted: true, types: ['Fire', 'Flying'] },
  ];

  const healthyDecision = getCenterNeedStatus(healthyTeam, {
    primaryCarry: healthyTeam[0],
    prepStatus: { avgDeficit: 0, leadDeficit: 0 },
    hasOpponentProfile: true,
    carryBossScore: 280,
    carryPowerScore: 240,
  });
  const riskyDecision = getCenterNeedStatus(riskyTeam, {
    primaryCarry: riskyTeam[0],
    prepStatus: { avgDeficit: 0, leadDeficit: 0 },
  });

  assert.equal(healthyDecision.canSkipCenter, true);
  assert.equal(healthyDecision.healthyCarryCanSkip, true);
  assert.equal(riskyDecision.canSkipCenter, false);
  assert.equal(riskyDecision.hasFainted, true);
});

test('decides early training pressure from boss targets', () => {
  const coreTeam = [
    { name: 'Lapras', hp: 90, level: 10 },
    { name: 'Pikachu', hp: 90, level: 11 },
  ];
  const readyTeam = [
    { name: 'Lapras', hp: 90, level: 18 },
    { name: 'Pikachu', hp: 90, level: 16 },
  ];
  const targets = { avgLevel: 14, leadLevel: 15 };

  assert.equal(shouldPrioritizeEarlyTraining(coreTeam, targets), true);
  assert.equal(shouldPrioritizeEarlyTraining(readyTeam, targets), false);
});

test('decides early catch allowance and projected level impact', () => {
  const oneMonTeam = [{ name: 'Lapras', hp: 90, level: 12 }];
  const optionalTeam = [
    { name: 'Lapras', hp: 90, level: 12 },
    { name: 'Pikachu', hp: 90, level: 10 },
    { name: 'Oddish', hp: 90, level: 9 },
  ];
  const fullEnoughTeam = [...optionalTeam, { name: 'Geodude', hp: 90, level: 9 }];

  assert.equal(getEarlyCatchAllowance(oneMonTeam, 0, false), 'core');
  assert.equal(getEarlyCatchAllowance(optionalTeam, 20, false), 'optional');
  assert.equal(getEarlyCatchAllowance(fullEnoughTeam, 10, true), 'exceptional');
  assert.equal(getEarlyCatchAllowance(fullEnoughTeam, 10, false), 'skip');
  assert.equal(Number(getProjectedAverageLevelAfterCatch(optionalTeam, 12).toFixed(2)), 10.75);
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
