import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideCatchDraftAction,
  foldText,
  getAttackCoverageScore,
  getCenterNeedStatus,
  getDefensiveMatchupScore,
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
  scoreBotTacticRouteBonus,
  scoreBuffRouteNode,
  scoreCatchBossCounter,
  scoreCatchDraftSignals,
  scoreCatchRouteNode,
  scoreCenterRouteNode,
  scoreChallengeCatchBonus,
  scoreChallengeRouteBonus,
  scoreHeldItemFit,
  scoreItemRouteNode,
  scoreLegendaryRouteNode,
  scorePriorityTypes,
  scoreRouteLookahead,
  scoreChallengeItemBonus,
  scoreStoryCatchBonus,
  scoreStoryItemBonus,
  scoreStoryLeagueCoverage,
  scoreStoryRouteBonus,
  scoreTrainerRouteNode,
  scoreUnknownRouteNode,
  shouldPrioritizeEarlyTraining,
} from '../src/core/lib/strategy-utils.ts';
import {
  challengeCatchScoreCases,
  catchDecisionCases,
  storyCatchScoreCases,
} from './fixtures/strategy/catch-decisions.mjs';
import {
  challengeItemScoreCases,
  storyItemScoreCases,
} from './fixtures/strategy/item-decisions.mjs';
import {
  bossRouteCases,
  buffRouteCases,
  catchRouteCases,
  centerRouteCases,
  challengeRouteCases,
  itemRouteCases,
  legendaryRouteCases,
  storyRouteCases,
  tacticRouteCases,
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
  assert.equal(getDefensiveMatchupScore(['Water'], ['Fire', 'Ground']), 0);
  assert.equal(scoreCatchBossCounter(['Water'], ['Water'], ['Fire', 'Ground']), 25);
});

test('scores priority type lists with configurable rank weights', () => {
  const challengePriority = scorePriorityTypes({
    types: ['Fairy', 'Electric', 'Poison'],
    priorityTypes: [
      'Fairy',
      'Dragon',
      'Fire',
      'Dark',
      'Ghost',
      'Water',
      'Steel',
      'Grass',
      'Fighting',
      'Ground',
      'Rock',
      'Electric',
    ],
    minRank: 4,
    weight: 3,
  });
  const storyPriority = scorePriorityTypes({
    types: ['Ice', 'Psychic', 'Poison'],
    priorityTypes: [
      'Fairy',
      'Ice',
      'Dark',
      'Ghost',
      'Dragon',
      'Ground',
      'Fighting',
      'Electric',
      'Grass',
      'Water',
      'Fire',
      'Steel',
      'Rock',
      'Flying',
      'Psychic',
    ],
    minRank: 4,
    weight: 2.6,
  });

  assert.equal(challengePriority.score, 48);
  assert.equal(challengePriority.reason, 'Fairy,Electric');
  assert.equal(Math.round(storyPriority.score * 10) / 10, 46.8);
  assert.equal(storyPriority.reason, 'Ice,Psychic');
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

test('scores challenge catch bonuses from candidate signals', () => {
  const shiny = scoreChallengeCatchBonus(challengeCatchScoreCases.newShinyPriorityType);
  const lowValue = scoreChallengeCatchBonus(challengeCatchScoreCases.earlyNonShinyLowValue);
  const highBst = scoreChallengeCatchBonus(challengeCatchScoreCases.earlyHighBstRunValue);

  assert.equal(shiny.score, 367);
  assert.match(shiny.reason, /first-run-shiny/);
  assert.equal(Math.round(lowValue.score * 10) / 10, -53.2);
  assert.match(lowValue.reason, /early-non-shiny/);
  assert.equal(Math.round(highBst.score * 10) / 10, 106.6);
  assert.match(highBst.reason, /early-run-value/);
});

test('scores story catch bonuses and league coverage from candidate signals', () => {
  const legendary = scoreStoryCatchBonus(storyCatchScoreCases.teamNeedsLegendaryMainCarry);
  const leagueCoverage = scoreStoryLeagueCoverage(storyCatchScoreCases.leagueCoverageIceCounter);
  const leagueCatch = scoreStoryCatchBonus(storyCatchScoreCases.leagueCoverageIceCounter);
  const duplicate = scoreStoryCatchBonus(storyCatchScoreCases.settledDuplicatePenalty);

  assert.equal(legendary.score, 197);
  assert.match(legendary.reason, /legendary/);
  assert.equal(leagueCoverage.score, 99.5);
  assert.match(leagueCoverage.reason, /covers-Dragon/);
  assert.equal(leagueCatch.score, 99.5);
  assert.equal(duplicate.score, -76);
  assert.match(duplicate.reason, /duplicate/);
});

test('scores challenge item bonuses from reusable item signals', () => {
  const lowValue = scoreChallengeItemBonus(challengeItemScoreCases.lowValueHeldItem);
  const sacredAsh = scoreChallengeItemBonus(challengeItemScoreCases.sacredAshRevivesTwo);
  const rareCandy = scoreChallengeItemBonus(challengeItemScoreCases.rareCandyUnderleveledCarry);
  const tmWeak = scoreChallengeItemBonus(challengeItemScoreCases.tmForWeakCarry);
  const tmReady = scoreChallengeItemBonus(challengeItemScoreCases.tmAlreadyGood);
  const upgrade = scoreChallengeItemBonus(challengeItemScoreCases.matchingOffenseUpgrade);
  const mismatch = scoreChallengeItemBonus(challengeItemScoreCases.mismatchedBoost);

  assert.equal(lowValue.score, -220);
  assert.equal(sacredAsh.score, 260);
  assert.equal(Math.round(rareCandy.score * 10) / 10, 628.3);
  assert.match(rareCandy.reason, /underleveled/);
  assert.equal(tmWeak.score, 300);
  assert.equal(tmReady.score, 90);
  assert.equal(upgrade.score, 672.75);
  assert.match(upgrade.reason, /improvement/);
  assert.equal(mismatch.score, -110);
  assert.match(mismatch.reason, /mismatched-boost/);
});

test('scores story item bonuses from reusable item signals', () => {
  const lowValue = scoreStoryItemBonus(storyItemScoreCases.lowValueHeldItem);
  const rareCandy = scoreStoryItemBonus(storyItemScoreCases.rareCandyWithPrepPressure);
  const sacredAsh = scoreStoryItemBonus(storyItemScoreCases.sacredAshNoFainted);
  const premium = scoreStoryItemBonus(storyItemScoreCases.premiumHeldUpgrade);
  const boost = scoreStoryItemBonus(storyItemScoreCases.matchingBoostUpgrade);
  const mismatch = scoreStoryItemBonus(storyItemScoreCases.mismatchedBoost);

  assert.equal(lowValue.score, -180);
  assert.equal(rareCandy.score, 308);
  assert.equal(sacredAsh.score, -30);
  assert.equal(premium.score, 195);
  assert.match(premium.reason, /premium-held/);
  assert.equal(boost.score, 133);
  assert.match(boost.reason, /matching-boost/);
  assert.equal(mismatch.score, -55);
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

test('scores bot tactic route bonuses independently from runtime controls', () => {
  assert.equal(scoreBotTacticRouteBonus(tacticRouteCases.xpTrainer).score, 900);
  assert.equal(scoreBotTacticRouteBonus(tacticRouteCases.captureGrass).score, 350);

  const shinyCatch = scoreBotTacticRouteBonus(tacticRouteCases.shinyCatchAtCaptureCap);
  const shinyUnknown = scoreBotTacticRouteBonus(tacticRouteCases.shinyBalancedUnknown);
  const bossCenter = scoreBotTacticRouteBonus(tacticRouteCases.bossCenterNeeded);
  const duplicateCatch = scoreBotTacticRouteBonus(tacticRouteCases.duplicateOpeningCatch);
  const duplicateTrainer = scoreBotTacticRouteBonus(tacticRouteCases.duplicateTrainerWithPair);

  assert.equal(shinyCatch.score, 6400);
  assert.match(shinyCatch.reason, /shiny-catch/);
  assert.equal(shinyUnknown.score, 2075);
  assert.match(shinyUnknown.reason, /shiny-balanced-unknown/);
  assert.equal(bossCenter.score, 400);
  assert.equal(duplicateCatch.score, 1400);
  assert.match(duplicateCatch.reason, /duplicate-open-pair/);
  assert.equal(duplicateTrainer.score, 620);
});

test('scores challenge route bonuses from reusable strategy state', () => {
  const earlyCatch = scoreChallengeRouteBonus(challengeRouteCases.earlyShinyCatchSafe);
  const unknownPressure = scoreChallengeRouteBonus(challengeRouteCases.earlyShinyUnknownPressured);
  const buff = scoreChallengeRouteBonus(challengeRouteCases.carryBuffUnderPressure);
  const trainer = scoreChallengeRouteBonus(challengeRouteCases.underleveledTrainer);
  const boss = scoreChallengeRouteBonus(challengeRouteCases.bossNotReady);
  const center = scoreChallengeRouteBonus(challengeRouteCases.centerSkip);

  assert.equal(earlyCatch.score, 2800);
  assert.match(earlyCatch.reason, /early-shiny-catch/);
  assert.equal(unknownPressure.score, 500);
  assert.equal(buff.score, 1145);
  assert.match(buff.reason, /carry-buff/);
  assert.equal(trainer.score, 950);
  assert.equal(boss.score, -1710);
  assert.match(boss.reason, /boss-underprepared/);
  assert.equal(center.score, -520);
});

test('scores story route bonuses from reusable strategy state', () => {
  const teamCatch = scoreStoryRouteBonus(storyRouteCases.needsTeamCatch);
  const teamGrass = scoreStoryRouteBonus(storyRouteCases.needsTeamGrass);
  const coverageGrass = scoreStoryRouteBonus(storyRouteCases.needsCoverageGrass);
  const settledCatch = scoreStoryRouteBonus(storyRouteCases.settledCatchPenalty);
  const trainer = scoreStoryRouteBonus(storyRouteCases.prepTrainer);
  const weakItem = scoreStoryRouteBonus(storyRouteCases.weakItemUnderPrep);
  const boss = scoreStoryRouteBonus(storyRouteCases.bossNotReady);

  assert.equal(teamCatch.score, 900);
  assert.match(teamCatch.reason, /team-catch/);
  assert.equal(teamGrass.score, 495);
  assert.equal(coverageGrass.score, 360);
  assert.equal(settledCatch.score, -180);
  assert.equal(trainer.score, 840);
  assert.equal(weakItem.score, 340);
  assert.match(weakItem.reason, /weak-member-item/);
  assert.equal(boss.score, -1370);
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
