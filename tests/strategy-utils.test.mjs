import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideCatchDraftAction,
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
  scoreBossRouteNode,
  scoreBuffRouteNode,
  scoreCatchDraftSignals,
  scoreCatchRouteNode,
  scoreCenterRouteNode,
  scoreHeldItemFit,
  scoreItemRouteNode,
  scoreLegendaryRouteNode,
  scoreRouteLookahead,
  scoreTrainerRouteNode,
  scoreUnknownRouteNode,
  shouldPrioritizeEarlyTraining,
} from '../src/core/lib/strategy-utils.ts';
import { catchDecisionCases } from './fixtures/strategy/catch-decisions.mjs';
import {
  bossRouteCases,
  buffRouteCases,
  catchRouteCases,
  centerRouteCases,
  itemRouteCases,
  legendaryRouteCases,
  trainerRouteCases,
  unknownRouteCases,
} from './fixtures/strategy/route-decisions.mjs';

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

test('decides catch draft action from reusable fixtures', () => {
  assert.deepEqual(decideCatchDraftAction(catchDecisionCases.acceptsExceptionalOpenSlot), {
    action: 'catch',
    reason: 'accepted',
    details: {},
  });
  assert.equal(
    decideCatchDraftAction(catchDecisionCases.skipsEarlyLowValueNonShiny).reason,
    'early-non-shiny-low-value',
  );
  assert.equal(
    decideCatchDraftAction(catchDecisionCases.skipsSettledLowValue).reason,
    'settled-run-low-value',
  );
  assert.equal(
    decideCatchDraftAction(catchDecisionCases.skipsSinnohCarryTraining).reason,
    'sinnoh-carry-training',
  );

  const lowReplacement = decideCatchDraftAction(catchDecisionCases.skipsLowLevelReplacement);
  assert.equal(lowReplacement.reason, 'replacement-too-low-level');
  assert.equal(lowReplacement.details.minUsefulSwapLevel, 20);

  assert.equal(
    decideCatchDraftAction(catchDecisionCases.keepsLowLevelPremiumReplacement).action,
    'catch',
  );
});

test('scores center route nodes from team health and boss pressure', () => {
  const revive = scoreCenterRouteNode(centerRouteCases.revivesFaintedTeam);
  const healthy = scoreCenterRouteNode(centerRouteCases.avoidsHealthyCenter);
  const bossPressure = scoreCenterRouteNode(centerRouteCases.discountsHealthyBossPressure);

  assert.equal(revive.score, 5000);
  assert.equal(revive.reason, 'revive-fainted');
  assert.equal(healthy.score, -1450);
  assert.equal(healthy.reason, 'healthy-team');
  assert.equal(bossPressure.score, -815);
  assert.equal(bossPressure.reason, 'boss-pressure-but-healthy');
});

test('scores catch and grass route nodes from draft pressure', () => {
  const coreCatch = scoreCatchRouteNode(catchRouteCases.buildsCoreTeam);
  const trainingCatch = scoreCatchRouteNode(catchRouteCases.penalizesTrainingPressure);
  const sinnohCatch = scoreCatchRouteNode(catchRouteCases.sinnohTrainingDeprioritizesCatch);
  const shinyGrass = scoreCatchRouteNode(catchRouteCases.shinyGrassScoutWithCaptureCap);

  assert.equal(coreCatch.score, 700);
  assert.match(coreCatch.reason, /core-team/);
  assert.equal(trainingCatch.score, -1250);
  assert.match(trainingCatch.reason, /leveling-priority/);
  assert.equal(sinnohCatch.score, -1030);
  assert.match(sinnohCatch.reason, /sinnoh-training/);
  assert.equal(shinyGrass.score, 655);
  assert.match(shinyGrass.reason, /shiny-scout/);
});

test('scores item route nodes from carry needs and Sinnoh training', () => {
  const carryHealing = scoreItemRouteNode(itemRouteCases.prefersCarryHealingItem);
  const bossPressure = scoreItemRouteNode(itemRouteCases.penalizesGenericItemUnderBossPressure);
  const sinnohTm = scoreItemRouteNode(itemRouteCases.prioritizesSinnohTmItem);

  assert.equal(carryHealing.score, 720);
  assert.match(carryHealing.reason, /carry-healing/);
  assert.equal(bossPressure.score, -80);
  assert.match(bossPressure.reason, /boss-pressure/);
  assert.equal(sinnohTm.score, 6060);
  assert.match(sinnohTm.reason, /sinnoh-tm/);
});

test('scores trainer route nodes from matchup, boss pressure and low HP', () => {
  const sinnohFight = scoreTrainerRouteNode(trainerRouteCases.rewardsSinnohLevelingFight);
  const lowHpFight = scoreTrainerRouteNode(trainerRouteCases.discountsLowHpLeadWithoutItem);

  assert.equal(sinnohFight.score, 6260);
  assert.match(sinnohFight.reason, /sinnoh-training/);
  assert.equal(lowHpFight.score, 330);
  assert.match(lowHpFight.reason, /lead-needs-item/);
});

test('scores boss route nodes from prep readiness', () => {
  const readyBoss = scoreBossRouteNode(bossRouteCases.rewardsReadyBoss);
  const underpreparedBoss = scoreBossRouteNode(bossRouteCases.penalizesUnderpreparedBoss);

  assert.equal(readyBoss.score, 1060);
  assert.match(readyBoss.reason, /ready/);
  assert.equal(underpreparedBoss.score, -3050);
  assert.match(underpreparedBoss.reason, /underprepared/);
});

test('scores buff route nodes from leveling pressure and Sinnoh offense needs', () => {
  const sinnohBuff = scoreBuffRouteNode(buffRouteCases.rewardsSinnohOffenseBuff);
  const baseline = scoreBuffRouteNode(buffRouteCases.baselineBuff);

  assert.equal(sinnohBuff.score, 2804);
  assert.match(sinnohBuff.reason, /sinnoh-offense/);
  assert.equal(baseline.score, 500);
  assert.equal(baseline.reason, 'baseline-buff');
});

test('scores legendary route nodes from prep, health and carry state', () => {
  const readyLegendary = scoreLegendaryRouteNode(legendaryRouteCases.readyMainCarry);
  const riskyLegendary = scoreLegendaryRouteNode(legendaryRouteCases.riskyUnderleveledTeam);

  assert.equal(readyLegendary.score, 7940);
  assert.match(readyLegendary.reason, /ready/);
  assert.equal(riskyLegendary.score, 390);
  assert.match(riskyLegendary.reason, /underlevel/);
});

test('scores unknown route nodes for shiny scouting pressure', () => {
  const normalUnknown = scoreUnknownRouteNode(unknownRouteCases.normalUnknown);
  const mustTrain = scoreUnknownRouteNode(unknownRouteCases.shinyMustTrain);
  const scoutCap = scoreUnknownRouteNode(unknownRouteCases.shinyScoutAtCaptureCap);

  assert.equal(normalUnknown.score, 1);
  assert.equal(normalUnknown.reason, 'unknown-baseline');
  assert.equal(mustTrain.score, -660);
  assert.match(mustTrain.reason, /shiny-must-train/);
  assert.equal(scoutCap.score, 958);
  assert.match(scoutCap.reason, /capture-cap-scout/);
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
