import type { MapNodeType, ScoredDecision } from '../../types.d.ts';

export interface CenterRouteNodeInput {
  avgHP: number;
  hasFainted?: boolean;
  lowHPCount?: number;
  bossLevelPressure?: number;
  centerNeed?: {
    fullEnough?: boolean;
    healthyCarryCanSkip?: boolean;
    almostFull?: boolean;
  };
  config?: {
    criticalHpThreshold?: number;
    lowHpThreshold?: number;
    centerHealthyPathPenalty?: number;
    centerStrongCarryPathPenalty?: number;
    centerAlmostHealthyPathPenalty?: number;
    centerCarrySkipAvgHpThreshold?: number;
  };
}

export interface ScoutRouteBalance {
  tacticActive?: boolean;
  mustTrain?: boolean;
  needsTraining?: boolean;
  safeToScout?: boolean;
}

export interface CatchRouteNodeInput {
  nodeType: 'catch' | 'grass';
  shinyRoute?: ScoutRouteBalance;
  buildingCoreTeam?: boolean;
  needsEarlyRoster?: boolean;
  hasLowLevelForSwap?: boolean;
  earlyLevelingPriority?: boolean;
  openTeamSlot?: boolean;
  captureCapReached?: boolean;
  earlyExpansionClosed?: boolean;
  bossLevelPressure?: number;
  prepPressure?: number;
  duplicateRouteScore?: number;
  sinnohTrainingActive?: boolean;
  aliveCount?: number;
  config?: {
    earlyOptionalTeamSize?: number;
    bossLevelPressureCatchPenalty?: number;
    sinnohCatchNodePenalty?: number;
    sinnohGrassNodePenalty?: number;
    sinnohTrainingCoreTeamSize?: number;
  };
}

export interface ItemRouteNodeInput {
  earlyLevelingPriority?: boolean;
  carryNeedsHealingItem?: boolean;
  leadNeedsItem?: boolean;
  buildingCoreTeam?: boolean;
  bossLevelPressure?: number;
  sinnohTrainingActive?: boolean;
  sinnohNeedsTm?: boolean;
  config?: {
    bossLevelPressureItemPenalty?: number;
    sinnohItemNodeBonus?: number;
    sinnohTmNodeBonus?: number;
  };
}

export interface TrainerRouteNodeInput {
  avgHP: number;
  matchupScore?: number;
  leadNeedsItem?: boolean;
  earlyLevelingPriority?: boolean;
  prepPressure?: number;
  bossLevelPressure?: number;
  sinnohTrainingActive?: boolean;
  config?: {
    lowHpThreshold?: number;
    bossLevelPressureTrainerBonus?: number;
    sinnohTrainerNodeBonus?: number;
  };
}

export interface BossRouteNodeInput {
  avgHP: number;
  leadMatchupScore?: number;
  leadNeedsItem?: boolean;
  earlyLevelingPriority?: boolean;
  prep?: {
    avgDeficit?: number;
    leadDeficit?: number;
    ready?: boolean;
  } | null;
  config?: {
    lowHpThreshold?: number;
  };
}

export interface BuffRouteNodeInput {
  earlyLevelingPriority?: boolean;
  prepPressure?: number;
  bossLevelPressure?: number;
  sinnohTrainingActive?: boolean;
  sinnohNeedsOffense?: boolean;
  config?: {
    bossLevelPressureBuffBonus?: number;
    sinnohBuffNodeBonus?: number;
    sinnohOffenseBuffNodeBonus?: number;
  };
}

export interface LegendaryRouteNodeInput {
  avgHP: number;
  hasFainted?: boolean;
  aliveCount?: number;
  leadCarryScore?: number;
  leadHasItem?: boolean;
  leadIsMainCarry?: boolean;
  leadHasHealingItem?: boolean;
  leadHp?: number;
  prep?: {
    avgDeficit?: number;
    leadDeficit?: number;
    ready?: boolean;
  } | null;
  config?: {
    criticalHpThreshold?: number;
    lowHpThreshold?: number;
    legendaryNodeBaseScore?: number;
    legendaryNodeRouteBonus?: number;
    legendaryNodeReadyBonus?: number;
    legendaryNodeLowHpPenalty?: number;
    legendaryNodeMaxUnderlevelPenalty?: number;
    legendaryNodeUnderlevelPenalty?: number;
  };
}

export interface UnknownRouteNodeInput {
  shinyRoute?: ScoutRouteBalance;
  captureCapReached?: boolean;
  bossLevelPressure?: number;
  prepPressure?: number;
}

export interface BotTacticRouteBonusInput {
  tactic?: string;
  nodeType: string;
  centerCanSkip?: boolean;
  earlyExpansionClosed?: boolean;
  captureCapReached?: boolean;
  openTeamSlot?: boolean;
  prepReady?: boolean;
  prepPressure?: number;
  runNeedsPower?: boolean;
  shinyRoute?: ScoutRouteBalance & {
    canBalancedScout?: boolean;
  };
  duplicateCatchesEnabled?: boolean;
  duplicateNeedsOpeningPair?: boolean;
  duplicateHasLowLevelNonDuplicate?: boolean;
  duplicateHasPair?: boolean;
  config?: {
    duplicatePriorityRouteBonus?: number;
  };
}

export interface ChallengeRouteBonusInput {
  active?: boolean;
  nodeType: string;
  earlyShinyHunt?: boolean;
  prepPressure?: number;
  prepReady?: boolean;
  centerCanSkip?: boolean;
  carryNeedsItem?: boolean;
  needsCarryBuff?: boolean;
  underleveled?: boolean;
  config?: {
    shinyScoutPressureLimit?: number;
    challengeFirstShinyNodeBonus?: number;
    challengeCarryItemNodeBonus?: number;
    challengeCarryBuffNodeBonus?: number;
    challengeTrainerLevelNodeBonus?: number;
  };
}

export interface StoryRouteBonusInput {
  active?: boolean;
  nodeType: string;
  needsTeam?: boolean;
  needsCoverage?: boolean;
  prepPressure?: number;
  prepReady?: boolean;
  weakMemberCount?: number;
  centerCanSkip?: boolean;
  config?: {
    storyRouteTeamBuildBonus?: number;
    storyRouteCoverageBonus?: number;
    storyRouteTrainingBonus?: number;
  };
}

function routeBonus(score: number, reason: string): RouteScoreParts {
  return { score, reasons: [reason] };
}

function scoreXpTacticRoute(type: string, centerCanSkip: boolean): RouteScoreParts {
  const scores: Record<string, RouteScoreParts> = {
    trainer: routeBonus(900, 'xp-trainer'),
    buff: routeBonus(180, 'xp-buff'),
    catch: routeBonus(-500, 'xp-avoid-capture'),
    grass: routeBonus(-500, 'xp-avoid-capture'),
    item: routeBonus(-120, 'xp-low-item'),
  };
  if (type === 'center' && centerCanSkip) return routeBonus(-300, 'xp-skip-center');
  return scores[type] ?? routeBonus(0, 'auto');
}

function scoreCaptureTacticRoute(type: string): RouteScoreParts {
  const scores: Record<string, RouteScoreParts> = {
    catch: routeBonus(850, 'capture-catch'),
    grass: routeBonus(350, 'capture-grass'),
    trade: routeBonus(120, 'capture-trade'),
    trainer: routeBonus(-180, 'capture-avoid-trainer'),
  };
  return scores[type] ?? routeBonus(0, 'auto');
}

function scoreBossTacticRoute(
  type: string,
  centerCanSkip: boolean,
  earlyExpansionClosed: boolean,
): RouteScoreParts {
  const scores: Record<string, RouteScoreParts> = {
    item: routeBonus(420, 'boss-item'),
    buff: routeBonus(300, 'boss-buff'),
    trainer: routeBonus(220, 'boss-trainer'),
    legendary: routeBonus(260, 'boss-legendary'),
    boss: routeBonus(180, 'boss-boss'),
  };
  if (type === 'center') return routeBonus(centerCanSkip ? -100 : 400, 'boss-center');
  if ((type === 'catch' || type === 'grass') && earlyExpansionClosed) {
    return routeBonus(-200, 'boss-avoid-capture');
  }
  return scores[type] ?? routeBonus(0, 'auto');
}

function scoreDuplicateTacticRoute(input: BotTacticRouteBonusInput, type: string): RouteScoreParts {
  const duplicatePriorityRouteBonus = input.config?.duplicatePriorityRouteBonus ?? 1400;
  if (!input.duplicateCatchesEnabled) return routeBonus(0, 'duplicate-disabled');
  if (type === 'catch') {
    return input.duplicateNeedsOpeningPair
      ? routeBonus(duplicatePriorityRouteBonus, 'duplicate-open-pair')
      : routeBonus(input.duplicateHasLowLevelNonDuplicate ? 120 : -420, 'duplicate-catch');
  }
  if (type === 'grass') return routeBonus(-260, 'duplicate-avoid-grass');
  if (type === 'trainer') {
    return routeBonus(input.duplicateHasPair ? 620 : 260, 'duplicate-trainer');
  }
  if (type === 'buff') return routeBonus(input.duplicateHasPair ? 220 : 80, 'duplicate-buff');
  if (type === 'legendary') {
    return routeBonus(input.duplicateHasLowLevelNonDuplicate ? 180 : 80, 'duplicate-legendary');
  }
  if (type === 'trade') {
    return routeBonus(input.duplicateHasLowLevelNonDuplicate ? 80 : -80, 'duplicate-trade');
  }
  return routeBonus(0, 'auto');
}

function scoreShinyTacticRoute(input: BotTacticRouteBonusInput, type: string): RouteScoreParts {
  const prepPressure = input.prepPressure ?? 0;
  const captureCapReached = Boolean(input.captureCapReached);
  const openTeamSlot = Boolean(input.openTeamSlot);
  const earlyExpansionClosed = Boolean(input.earlyExpansionClosed);
  const centerCanSkip = Boolean(input.centerCanSkip);
  const runNeedsPower = Boolean(input.runNeedsPower);
  const shinyRoute = input.shinyRoute ?? {};
  const settledScoutBonus = !shinyRoute.needsTraining && earlyExpansionClosed ? 1200 : 0;
  const capScoutBonus = captureCapReached ? 900 : 0;
  const balancedScoutBonus = shinyRoute.canBalancedScout
    ? Math.max(420, 980 - prepPressure * 45)
    : 0;
  const scoutBase = (captureCapScore: number, openSlotScore: number, fullTeamScore: number) => {
    if (captureCapReached) return captureCapScore;
    return openTeamSlot ? openSlotScore : fullTeamScore;
  };

  if (type === 'catch') {
    if (shinyRoute.mustTrain) return routeBonus(-420 - prepPressure * 35, 'shiny-must-train');
    if (shinyRoute.needsTraining) {
      return routeBonus(balancedScoutBonus + capScoutBonus + 180, 'shiny-balanced-catch');
    }
    return routeBonus(scoutBase(5200, 1850, 2550) + settledScoutBonus, 'shiny-catch');
  }
  if (type === 'unknown') {
    if (shinyRoute.mustTrain) {
      return routeBonus(-280 - prepPressure * 30, 'shiny-unknown-must-train');
    }
    if (shinyRoute.needsTraining) {
      return routeBonus(
        Math.round(balancedScoutBonus * 1.05) + capScoutBonus + 240,
        'shiny-balanced-unknown',
      );
    }
    return routeBonus(
      scoutBase(5050, 1950, 2450) + Math.round(settledScoutBonus * 0.95),
      'shiny-unknown',
    );
  }
  if (type === 'grass') {
    if (shinyRoute.mustTrain) return routeBonus(-250 - prepPressure * 25, 'shiny-grass-must-train');
    if (shinyRoute.needsTraining) {
      return routeBonus(
        Math.round(balancedScoutBonus * 0.75) + Math.round(capScoutBonus * 0.55) + 40,
        'shiny-balanced-grass',
      );
    }
    return routeBonus(
      (captureCapReached ? 3700 : 1350) + Math.round(settledScoutBonus * 0.65),
      'shiny-grass',
    );
  }

  const scores: Record<string, RouteScoreParts> = {
    trainer: routeBonus(shinyRoute.needsTraining ? 900 + prepPressure * 120 : 260, 'shiny-trainer'),
    buff: routeBonus(shinyRoute.needsTraining ? 540 + prepPressure * 70 : 150, 'shiny-buff'),
    item: routeBonus(runNeedsPower ? -140 : -70, 'shiny-item'),
    trade: routeBonus(openTeamSlot ? 60 : 20, 'shiny-trade'),
    legendary: routeBonus(runNeedsPower ? 80 : 180, 'shiny-legendary'),
    center: routeBonus(centerCanSkip ? -260 : 150, 'shiny-center'),
    boss: routeBonus(input.prepReady ? 140 : -520, 'shiny-boss'),
  };
  return scores[type] ?? routeBonus(0, 'auto');
}

function addChallengeEarlyShinyRoute(
  input: ChallengeRouteBonusInput,
  parts: RouteScoreParts,
  values: {
    type: string;
    prepPressure: number;
    shinyScoutPressureLimit: number;
    challengeFirstShinyNodeBonus: number;
  },
): void {
  if (!input.earlyShinyHunt) return;
  const scoutPressureOk = values.prepPressure <= values.shinyScoutPressureLimit;
  const earlyShinyScores: Record<string, [number, string]> = {
    catch: [scoutPressureOk ? values.challengeFirstShinyNodeBonus : 620, 'early-shiny-catch'],
    grass: [
      scoutPressureOk ? Math.round(values.challengeFirstShinyNodeBonus * 0.72) : 420,
      'early-shiny-grass',
    ],
    unknown: [
      scoutPressureOk ? Math.round(values.challengeFirstShinyNodeBonus * 0.82) : 500,
      'early-shiny-unknown',
    ],
  };
  const score = earlyShinyScores[values.type];
  if (!score) return;
  parts.score += score[0];
  parts.reasons.push(score[1]);
}

function addChallengeProgressRoute(
  input: ChallengeRouteBonusInput,
  parts: RouteScoreParts,
  values: {
    type: string;
    prepPressure: number;
    prepReady: boolean;
    challengeCarryItemNodeBonus: number;
    challengeCarryBuffNodeBonus: number;
    challengeTrainerLevelNodeBonus: number;
  },
): void {
  if (input.carryNeedsItem && values.type === 'item') {
    parts.score += values.challengeCarryItemNodeBonus;
    parts.reasons.push('carry-item');
  }
  if (input.needsCarryBuff && values.type === 'buff') {
    parts.score += values.challengeCarryBuffNodeBonus + values.prepPressure * 55;
    parts.reasons.push('carry-buff');
  }
  if (input.underleveled && values.type === 'trainer') {
    parts.score += values.challengeTrainerLevelNodeBonus + values.prepPressure * 85;
    parts.reasons.push('underleveled-trainer');
  }
  if (values.type === 'boss') {
    parts.score += values.prepReady ? 260 : -1350 - values.prepPressure * 180;
    parts.reasons.push(values.prepReady ? 'boss-ready' : 'boss-underprepared');
  }
}

function addChallengeRoutePenalties(
  input: ChallengeRouteBonusInput,
  parts: RouteScoreParts,
  type: string,
  prepPressure: number,
): void {
  if (type === 'legendary') {
    parts.score += prepPressure <= 1 ? 380 : -320;
    parts.reasons.push(prepPressure <= 1 ? 'legendary-ready' : 'legendary-pressure');
  }
  if (type === 'center' && input.centerCanSkip) {
    parts.score -= 520;
    parts.reasons.push('skip-center');
  }
  if (type === 'item' && !input.carryNeedsItem && input.needsCarryBuff) {
    parts.score -= 120;
    parts.reasons.push('prefer-buff-over-item');
  }
  if ((type === 'catch' || type === 'grass') && !input.earlyShinyHunt && input.underleveled) {
    parts.score -= 260 + prepPressure * 45;
    parts.reasons.push('underleveled-avoid-capture');
  }
}

function addStoryTeamRoute(
  input: StoryRouteBonusInput,
  parts: RouteScoreParts,
  values: { type: string; storyRouteTeamBuildBonus: number; storyRouteCoverageBonus: number },
): void {
  if (input.needsTeam) {
    const teamScores: Record<string, [number, string]> = {
      catch: [values.storyRouteTeamBuildBonus, 'team-catch'],
      grass: [Math.round(values.storyRouteTeamBuildBonus * 0.55), 'team-grass'],
      trade: [260, 'team-trade'],
    };
    const score = teamScores[values.type];
    if (score) {
      parts.score += score[0];
      parts.reasons.push(score[1]);
    }
    return;
  }

  if (input.needsCoverage) {
    const coverageScores: Record<string, [number, string]> = {
      catch: [values.storyRouteCoverageBonus, 'coverage-catch'],
      grass: [Math.round(values.storyRouteCoverageBonus * 0.5), 'coverage-grass'],
    };
    const score = coverageScores[values.type];
    if (score) {
      parts.score += score[0];
      parts.reasons.push(score[1]);
    }
  } else if (values.type === 'catch' || values.type === 'grass') {
    parts.score -= 180;
    parts.reasons.push('avoid-extra-capture');
  }
}

function addStoryPrepRoute(
  parts: RouteScoreParts,
  values: { type: string; prepPressure: number; storyRouteTrainingBonus: number },
): void {
  if (values.prepPressure <= 0) return;
  const prepScores: Record<string, [number, string]> = {
    trainer: [values.storyRouteTrainingBonus + values.prepPressure * 80, 'prep-trainer'],
    buff: [360 + values.prepPressure * 45, 'prep-buff'],
    item: [180, 'prep-item'],
  };
  const score = prepScores[values.type];
  if (!score) return;
  parts.score += score[0];
  parts.reasons.push(score[1]);
}

function addStoryRoutePenalties(
  input: StoryRouteBonusInput,
  parts: RouteScoreParts,
  values: { type: string; prepPressure: number; prepReady: boolean },
): void {
  if (values.type === 'legendary') {
    parts.score += values.prepPressure <= 2 ? 520 : -180;
    parts.reasons.push(values.prepPressure <= 2 ? 'legendary-ready' : 'legendary-pressure');
  }
  if (values.type === 'item' && (input.weakMemberCount ?? 0) > 0) {
    parts.score += 160;
    parts.reasons.push('weak-member-item');
  }
  if (values.type === 'center' && input.centerCanSkip) {
    parts.score -= 420;
    parts.reasons.push('skip-center');
  }
  if (values.type === 'boss') {
    parts.score += values.prepReady ? 220 : -1050 - values.prepPressure * 160;
    parts.reasons.push(values.prepReady ? 'boss-ready' : 'boss-underprepared');
  }
}

interface CatchRouteContext {
  nodeType: 'catch' | 'grass';
  shinyRoute: ScoutRouteBalance;
  buildingCoreTeam: boolean;
  needsEarlyRoster: boolean;
  hasLowLevelForSwap: boolean;
  earlyLevelingPriority: boolean;
  openTeamSlot: boolean;
  captureCapReached: boolean;
  earlyExpansionClosed: boolean;
  bossLevelPressure: number;
  prepPressure: number;
  duplicateRouteScore: number;
  aliveCount: number;
  earlyOptionalTeamSize: number;
  bossLevelPressureCatchPenalty: number;
  sinnohCatchNodePenalty: number;
  sinnohGrassNodePenalty: number;
  sinnohTrainingApplies: boolean;
}

interface RouteScoreParts {
  score: number;
  reasons: string[];
}

function pushDuplicateRoute(parts: RouteScoreParts, duplicateScore: number): void {
  parts.score += duplicateScore;
  if (duplicateScore) parts.reasons.push('duplicate-route');
}

function applyBossPressure(
  parts: RouteScoreParts,
  bossLevelPressure: number,
  multiplier: number,
): void {
  if (bossLevelPressure <= 0) return;
  parts.score -= bossLevelPressure * multiplier;
  parts.reasons.push('boss-pressure');
}

function scoreShinyCatchRoute(context: CatchRouteContext): RouteScoreParts {
  const reasons: string[] = [];
  let score = 0;

  if (context.buildingCoreTeam) {
    score += 980;
    reasons.push('shiny-core-team');
  } else if (context.needsEarlyRoster) {
    score += context.earlyLevelingPriority ? 760 : 620;
    reasons.push('shiny-early-roster');
  } else if (context.hasLowLevelForSwap) {
    score += context.earlyLevelingPriority ? 620 : 520;
    reasons.push('shiny-replacement');
  } else if (context.shinyRoute.mustTrain) {
    score -= 620 + context.prepPressure * 45;
    reasons.push('shiny-must-train');
  } else if (context.shinyRoute.needsTraining) {
    score += 460 - context.prepPressure * 14;
    reasons.push('shiny-training-pressure');
  } else if (context.openTeamSlot) {
    score += 760;
    reasons.push('shiny-open-slot');
  } else {
    score += 620;
    reasons.push('shiny-scout');
  }

  const parts = { score, reasons };
  applyBossPressure(parts, context.bossLevelPressure, context.shinyRoute.mustTrain ? 70 : 28);
  if (context.captureCapReached && !context.shinyRoute.mustTrain) {
    parts.score += context.shinyRoute.needsTraining ? 260 : 560;
    parts.reasons.push('capture-cap-scout');
  }
  pushDuplicateRoute(parts, context.duplicateRouteScore);
  if (context.sinnohTrainingApplies && !context.shinyRoute.safeToScout) {
    parts.score -= Math.round(context.sinnohCatchNodePenalty * 0.45);
    parts.reasons.push('sinnoh-training');
  }
  return parts;
}

function scoreRegularCatchRoute(context: CatchRouteContext): RouteScoreParts {
  const reasons: string[] = [];
  let score = 0;

  if (context.earlyExpansionClosed && !context.hasLowLevelForSwap) {
    score -= 1800 + context.prepPressure * 80;
    reasons.push('early-expansion-closed');
  } else if (
    context.captureCapReached &&
    !context.needsEarlyRoster &&
    !context.hasLowLevelForSwap
  ) {
    score -= 3200;
    reasons.push('capture-cap');
  } else if (context.buildingCoreTeam) {
    score += 700;
    reasons.push('core-team');
  } else if (context.needsEarlyRoster) {
    score += context.earlyLevelingPriority ? 520 : 380;
    reasons.push('early-roster');
  } else if (context.hasLowLevelForSwap) {
    score += context.earlyLevelingPriority ? 450 : 350;
    reasons.push('replacement');
  } else if (context.earlyLevelingPriority) {
    score -= 900 + context.prepPressure * 55;
    reasons.push('leveling-priority');
  } else if (context.openTeamSlot) {
    score += 120;
    reasons.push('open-slot');
  } else if (context.aliveCount < context.earlyOptionalTeamSize) {
    score += 180;
    reasons.push('thin-team');
  } else {
    score -= 450;
    reasons.push('full-team');
  }

  const parts = { score, reasons };
  applyBossPressure(parts, context.bossLevelPressure, context.bossLevelPressureCatchPenalty);
  pushDuplicateRoute(parts, context.duplicateRouteScore);
  if (context.sinnohTrainingApplies) {
    parts.score -= context.sinnohCatchNodePenalty;
    parts.reasons.push('sinnoh-training');
  }
  return parts;
}

function scoreShinyGrassRoute(context: CatchRouteContext): RouteScoreParts {
  const reasons: string[] = [];
  let score = 0;

  if (context.buildingCoreTeam) {
    score += 420;
    reasons.push('shiny-core-team');
  } else if (context.needsEarlyRoster) {
    score += context.earlyLevelingPriority ? 340 : 240;
    reasons.push('shiny-early-roster');
  } else if (context.hasLowLevelForSwap) {
    score += context.earlyLevelingPriority ? 300 : 230;
    reasons.push('shiny-replacement');
  } else if (context.shinyRoute.mustTrain) {
    score -= 440 + context.prepPressure * 35;
    reasons.push('shiny-must-train');
  } else if (context.shinyRoute.needsTraining) {
    score += 210 - context.prepPressure * 10;
    reasons.push('shiny-training-pressure');
  } else if (context.openTeamSlot) {
    score += 330;
    reasons.push('shiny-open-slot');
  } else {
    score += 280;
    reasons.push('shiny-scout');
  }

  const parts = { score, reasons };
  applyBossPressure(parts, context.bossLevelPressure, context.shinyRoute.mustTrain ? 50 : 20);
  if (context.captureCapReached && !context.shinyRoute.mustTrain) {
    parts.score += context.shinyRoute.needsTraining ? 130 : 320;
    parts.reasons.push('capture-cap-scout');
  }
  pushDuplicateRoute(parts, Math.round(context.duplicateRouteScore * 0.55));
  if (context.sinnohTrainingApplies && !context.shinyRoute.safeToScout) {
    parts.score -= Math.round(context.sinnohGrassNodePenalty * 0.45);
    parts.reasons.push('sinnoh-training');
  }
  return parts;
}

function scoreRegularGrassRoute(context: CatchRouteContext): RouteScoreParts {
  const reasons: string[] = [];
  let score = 0;

  if (context.earlyExpansionClosed && !context.hasLowLevelForSwap) {
    score -= 1400 + context.prepPressure * 60;
    reasons.push('early-expansion-closed');
  } else if (
    context.captureCapReached &&
    !context.needsEarlyRoster &&
    !context.hasLowLevelForSwap
  ) {
    score -= 2400;
    reasons.push('capture-cap');
  } else if (context.buildingCoreTeam) {
    score += 280;
    reasons.push('core-team');
  } else if (context.needsEarlyRoster) {
    score += context.earlyLevelingPriority ? 240 : 120;
    reasons.push('early-roster');
  } else if (context.hasLowLevelForSwap) {
    score += context.earlyLevelingPriority ? 180 : 120;
    reasons.push('replacement');
  } else if (context.earlyLevelingPriority) {
    score -= 650 + context.prepPressure * 40;
    reasons.push('leveling-priority');
  } else if (context.openTeamSlot) {
    score += 40;
    reasons.push('open-slot');
  } else {
    score -= 250;
    reasons.push('full-team');
  }

  const parts = { score, reasons };
  applyBossPressure(
    parts,
    context.bossLevelPressure,
    Math.round(context.bossLevelPressureCatchPenalty * 0.7),
  );
  pushDuplicateRoute(parts, Math.round(context.duplicateRouteScore * 0.55));
  if (context.sinnohTrainingApplies) {
    parts.score -= context.sinnohGrassNodePenalty;
    parts.reasons.push('sinnoh-training');
  }
  return parts;
}

export function scoreCenterRouteNode(input: CenterRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const criticalHpThreshold = config.criticalHpThreshold ?? 30;
  const lowHpThreshold = config.lowHpThreshold ?? 50;
  const centerHealthyPathPenalty = config.centerHealthyPathPenalty ?? 1450;
  const centerStrongCarryPathPenalty = config.centerStrongCarryPathPenalty ?? 1250;
  const centerAlmostHealthyPathPenalty = config.centerAlmostHealthyPathPenalty ?? 850;
  const centerCarrySkipAvgHpThreshold = config.centerCarrySkipAvgHpThreshold ?? 78;
  const lowHPCount = input.lowHPCount ?? 0;
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const centerNeed = input.centerNeed ?? {};

  let score = -250;
  let reason = 'default-skip';

  if (input.hasFainted) {
    score = 5000;
    reason = 'revive-fainted';
  } else if (input.avgHP < criticalHpThreshold) {
    score = 4000;
    reason = 'critical-hp';
  } else if (input.avgHP < lowHpThreshold) {
    score = 2000;
    reason = 'low-hp';
  } else if (lowHPCount >= 2) {
    score = 1500;
    reason = 'multiple-low-hp';
  } else if (centerNeed.fullEnough) {
    score = -centerHealthyPathPenalty;
    reason = 'healthy-team';
  } else if (centerNeed.healthyCarryCanSkip) {
    score = -centerStrongCarryPathPenalty;
    reason = 'healthy-carry';
  } else if (centerNeed.almostFull) {
    score = -centerAlmostHealthyPathPenalty;
    reason = 'almost-healthy';
  } else if (bossLevelPressure > 0 && input.avgHP >= centerCarrySkipAvgHpThreshold) {
    score = -(650 + bossLevelPressure * 55);
    reason = 'boss-pressure-but-healthy';
  }

  return {
    id: 'route:center',
    score,
    reason,
    details: {
      avgHP: input.avgHP,
      lowHPCount,
      bossLevelPressure,
    },
  };
}

export function scoreCatchRouteNode(input: CatchRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const sinnohTrainingCoreTeamSize = config.sinnohTrainingCoreTeamSize ?? 2;
  const context: CatchRouteContext = {
    nodeType: input.nodeType,
    shinyRoute: input.shinyRoute ?? {},
    buildingCoreTeam: Boolean(input.buildingCoreTeam),
    needsEarlyRoster: Boolean(input.needsEarlyRoster),
    hasLowLevelForSwap: Boolean(input.hasLowLevelForSwap),
    earlyLevelingPriority: Boolean(input.earlyLevelingPriority),
    openTeamSlot: Boolean(input.openTeamSlot),
    captureCapReached: Boolean(input.captureCapReached),
    earlyExpansionClosed: Boolean(input.earlyExpansionClosed),
    bossLevelPressure: Math.max(0, input.bossLevelPressure ?? 0),
    prepPressure: input.prepPressure ?? 0,
    duplicateRouteScore: input.duplicateRouteScore ?? 0,
    aliveCount: input.aliveCount ?? 0,
    earlyOptionalTeamSize: config.earlyOptionalTeamSize ?? 4,
    bossLevelPressureCatchPenalty: config.bossLevelPressureCatchPenalty ?? 120,
    sinnohCatchNodePenalty: config.sinnohCatchNodePenalty ?? 1150,
    sinnohGrassNodePenalty: config.sinnohGrassNodePenalty ?? 900,
    sinnohTrainingApplies:
      Boolean(input.sinnohTrainingActive) && (input.aliveCount ?? 0) >= sinnohTrainingCoreTeamSize,
  };
  let parts: RouteScoreParts;
  if (context.nodeType === 'catch') {
    parts = context.shinyRoute.tacticActive
      ? scoreShinyCatchRoute(context)
      : scoreRegularCatchRoute(context);
  } else {
    parts = context.shinyRoute.tacticActive
      ? scoreShinyGrassRoute(context)
      : scoreRegularGrassRoute(context);
  }

  return {
    id: `route:${context.nodeType}`,
    score: parts.score,
    reason: parts.reasons.join(',') || 'neutral',
    details: {
      nodeType: context.nodeType,
      bossLevelPressure: context.bossLevelPressure,
      prepPressure: context.prepPressure,
      aliveCount: context.aliveCount,
    },
  };
}

export function scoreBuffRouteNode(input: BuffRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const prepPressure = input.prepPressure ?? 0;
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const bossLevelPressureBuffBonus = config.bossLevelPressureBuffBonus ?? 52;
  const sinnohBuffNodeBonus = config.sinnohBuffNodeBonus ?? 1050;
  const sinnohOffenseBuffNodeBonus = config.sinnohOffenseBuffNodeBonus ?? 1200;
  const reasons: string[] = [];

  let score = input.earlyLevelingPriority ? 360 + prepPressure * 45 : 500;
  reasons.push(input.earlyLevelingPriority ? 'leveling-priority' : 'baseline-buff');

  if (bossLevelPressure > 0) {
    score += bossLevelPressure * bossLevelPressureBuffBonus;
    reasons.push('boss-pressure');
  }
  if (input.sinnohTrainingActive) {
    score += sinnohBuffNodeBonus;
    reasons.push('sinnoh-training');
    if (input.sinnohNeedsOffense) {
      score += sinnohOffenseBuffNodeBonus;
      reasons.push('sinnoh-offense');
    }
  }

  return {
    id: 'route:buff',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      prepPressure,
      bossLevelPressure,
    },
  };
}

export function scoreLegendaryRouteNode(input: LegendaryRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const criticalHpThreshold = config.criticalHpThreshold ?? 30;
  const lowHpThreshold = config.lowHpThreshold ?? 50;
  const legendaryNodeBaseScore = config.legendaryNodeBaseScore ?? 3600;
  const legendaryNodeRouteBonus = config.legendaryNodeRouteBonus ?? 2400;
  const legendaryNodeReadyBonus = config.legendaryNodeReadyBonus ?? 900;
  const legendaryNodeLowHpPenalty = config.legendaryNodeLowHpPenalty ?? 2600;
  const legendaryNodeMaxUnderlevelPenalty = config.legendaryNodeMaxUnderlevelPenalty ?? 1400;
  const legendaryNodeUnderlevelPenalty = config.legendaryNodeUnderlevelPenalty ?? 850;
  const prep = input.prep ?? {};
  const prepPressure = Math.max(0, (prep.avgDeficit ?? 0) + (prep.leadDeficit ?? 0));
  const aliveCount = input.aliveCount ?? 0;
  const hasLead = Number.isFinite(input.leadCarryScore);
  const leadHp = input.leadHp ?? 100;
  const reasons: string[] = ['legendary-base'];

  let score = legendaryNodeBaseScore + legendaryNodeRouteBonus;

  if (input.hasFainted) {
    score -= 1500;
    reasons.push('fainted-team');
  }
  if (input.avgHP < criticalHpThreshold) {
    score -= legendaryNodeLowHpPenalty;
    reasons.push('critical-hp');
  } else if (input.avgHP < lowHpThreshold) {
    score -= Math.round(legendaryNodeLowHpPenalty * 0.45);
    reasons.push('low-hp');
  }
  if (aliveCount < 3) {
    score -= 900;
    reasons.push('thin-team');
  }
  if (prep.ready) {
    score += legendaryNodeReadyBonus;
    reasons.push('ready');
  } else {
    score -= Math.min(
      legendaryNodeMaxUnderlevelPenalty,
      prepPressure * legendaryNodeUnderlevelPenalty,
    );
    reasons.push('underlevel');
  }

  if (hasLead) {
    score += (input.leadCarryScore ?? 0) / 2.5;
    score += input.leadHasItem ? 180 : -180;
    if (input.leadIsMainCarry) score += 420;
    if (input.leadHasHealingItem) score += 320;
    if (leadHp < lowHpThreshold) score -= 500;
    reasons.push('lead');
  }

  return {
    id: 'route:legendary',
    score,
    reason: reasons.join(','),
    details: {
      prepPressure,
      aliveCount,
      leadHp,
    },
  };
}

export function scoreUnknownRouteNode(input: UnknownRouteNodeInput = {}): ScoredDecision {
  const shinyRoute = input.shinyRoute ?? {};
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const prepPressure = input.prepPressure ?? 0;
  const reasons: string[] = [];
  let score = 1;

  if (shinyRoute.tacticActive) {
    if (shinyRoute.mustTrain) {
      score = -(480 + prepPressure * 35);
      reasons.push('shiny-must-train');
    } else if (shinyRoute.needsTraining) {
      score = 560 - prepPressure * 12;
      reasons.push('shiny-training-pressure');
    } else {
      score = input.captureCapReached ? 980 : 820;
      reasons.push(input.captureCapReached ? 'capture-cap-scout' : 'shiny-scout');
    }
    if (bossLevelPressure > 0) {
      score -= bossLevelPressure * (shinyRoute.mustTrain ? 55 : 22);
      reasons.push('boss-pressure');
    }
  } else {
    reasons.push('unknown-baseline');
  }

  return {
    id: 'route:unknown',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      prepPressure,
      bossLevelPressure,
    },
  };
}

export function scoreBotTacticRouteBonus(input: BotTacticRouteBonusInput): ScoredDecision {
  const tactic = input.tactic || 'auto';
  const type = input.nodeType;
  const prepPressure = input.prepPressure ?? 0;
  const earlyExpansionClosed = Boolean(input.earlyExpansionClosed);
  const centerCanSkip = Boolean(input.centerCanSkip);
  const tacticScores: Record<string, () => RouteScoreParts> = {
    xp: () => scoreXpTacticRoute(type, centerCanSkip),
    capture: () => scoreCaptureTacticRoute(type),
    shiny: () => scoreShinyTacticRoute(input, type),
    boss: () => scoreBossTacticRoute(type, centerCanSkip, earlyExpansionClosed),
    duplicate: () => scoreDuplicateTacticRoute(input, type),
  };
  const parts = tacticScores[tactic]?.() ?? routeBonus(0, 'auto');

  return {
    id: `route:tactic:${tactic}:${type}`,
    score: parts.score,
    reason: parts.reasons[0] || 'auto',
    details: {
      tactic,
      type,
      prepPressure,
    },
  };
}

export function scoreChallengeRouteBonus(input: ChallengeRouteBonusInput): ScoredDecision {
  const type = input.nodeType;
  const prepPressure = input.prepPressure ?? 0;
  const prepReady = input.prepReady ?? true;
  const config = input.config ?? {};
  const shinyScoutPressureLimit = config.shinyScoutPressureLimit ?? 2;
  const challengeFirstShinyNodeBonus = config.challengeFirstShinyNodeBonus ?? 2800;
  const challengeCarryItemNodeBonus = config.challengeCarryItemNodeBonus ?? 1150;
  const challengeCarryBuffNodeBonus = config.challengeCarryBuffNodeBonus ?? 980;
  const challengeTrainerLevelNodeBonus = config.challengeTrainerLevelNodeBonus ?? 780;
  const parts = { score: 0, reasons: [] as string[] };

  if (!input.active) {
    return {
      id: `route:challenge:${type}`,
      score: 0,
      reason: 'inactive',
      details: { type, prepPressure },
    };
  }

  addChallengeEarlyShinyRoute(input, parts, {
    type,
    prepPressure,
    shinyScoutPressureLimit,
    challengeFirstShinyNodeBonus,
  });
  addChallengeProgressRoute(input, parts, {
    type,
    prepPressure,
    prepReady,
    challengeCarryItemNodeBonus,
    challengeCarryBuffNodeBonus,
    challengeTrainerLevelNodeBonus,
  });
  addChallengeRoutePenalties(input, parts, type, prepPressure);

  return {
    id: `route:challenge:${type}`,
    score: parts.score,
    reason: parts.reasons.join(',') || 'neutral',
    details: {
      type,
      prepPressure,
      prepReady,
    },
  };
}

export function scoreStoryRouteBonus(input: StoryRouteBonusInput): ScoredDecision {
  const type = input.nodeType;
  const prepPressure = input.prepPressure ?? 0;
  const prepReady = input.prepReady ?? true;
  const config = input.config ?? {};
  const storyRouteTeamBuildBonus = config.storyRouteTeamBuildBonus ?? 900;
  const storyRouteCoverageBonus = config.storyRouteCoverageBonus ?? 720;
  const storyRouteTrainingBonus = config.storyRouteTrainingBonus ?? 680;
  const parts = { score: 0, reasons: [] as string[] };

  if (!input.active) {
    return {
      id: `route:story:${type}`,
      score: 0,
      reason: 'inactive',
      details: { type, prepPressure },
    };
  }

  addStoryTeamRoute(input, parts, {
    type,
    storyRouteTeamBuildBonus,
    storyRouteCoverageBonus,
  });
  addStoryPrepRoute(parts, {
    type,
    prepPressure,
    storyRouteTrainingBonus,
  });
  addStoryRoutePenalties(input, parts, { type, prepPressure, prepReady });

  return {
    id: `route:story:${type}`,
    score: parts.score,
    reason: parts.reasons.join(',') || 'neutral',
    details: {
      type,
      prepPressure,
      prepReady,
    },
  };
}

export function scoreItemRouteNode(input: ItemRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const carryNeedsHealingItem = Boolean(input.carryNeedsHealingItem);
  const leadNeedsItem = Boolean(input.leadNeedsItem);
  const earlyLevelingPriority = Boolean(input.earlyLevelingPriority);
  const buildingCoreTeam = Boolean(input.buildingCoreTeam);
  const bossLevelPressureItemPenalty = config.bossLevelPressureItemPenalty ?? 170;
  const sinnohItemNodeBonus = config.sinnohItemNodeBonus ?? 2600;
  const sinnohTmNodeBonus = config.sinnohTmNodeBonus ?? 3200;
  const reasons: string[] = [];

  let score = 0;

  if (earlyLevelingPriority) {
    if (carryNeedsHealingItem) {
      score += 260;
      reasons.push('carry-healing-during-leveling');
    } else if (leadNeedsItem && !buildingCoreTeam) {
      score += 120;
      reasons.push('lead-item-during-leveling');
    } else {
      score -= 420;
      reasons.push('leveling-priority');
    }
  } else if (carryNeedsHealingItem) {
    score += 720;
    reasons.push('carry-healing');
  } else if (leadNeedsItem) {
    score += 520;
    reasons.push('lead-item');
  } else {
    score += 260;
    reasons.push('general-item');
  }

  if (bossLevelPressure > 0 && !carryNeedsHealingItem && !leadNeedsItem) {
    score -= bossLevelPressure * bossLevelPressureItemPenalty;
    reasons.push('boss-pressure');
  }
  if (input.sinnohTrainingActive) {
    score += sinnohItemNodeBonus;
    reasons.push('sinnoh-training');
    if (input.sinnohNeedsTm) {
      score += sinnohTmNodeBonus;
      reasons.push('sinnoh-tm');
    }
  }

  return {
    id: 'route:item',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      bossLevelPressure,
    },
  };
}

export function scoreTrainerRouteNode(input: TrainerRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const lowHpThreshold = config.lowHpThreshold ?? 50;
  const bossLevelPressureTrainerBonus = config.bossLevelPressureTrainerBonus ?? 150;
  const sinnohTrainerNodeBonus = config.sinnohTrainerNodeBonus ?? 3600;
  const prepPressure = input.prepPressure ?? 0;
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const reasons: string[] = [];

  let score = input.avgHP > lowHpThreshold ? 820 : 220;
  reasons.push(input.avgHP > lowHpThreshold ? 'healthy-team' : 'low-hp-team');

  score += input.matchupScore ?? 0;
  if (input.matchupScore) reasons.push('matchup');

  if (input.leadNeedsItem) {
    score -= 70;
    reasons.push('lead-needs-item');
  }

  if (input.earlyLevelingPriority) {
    score += 1150 + prepPressure * 80;
    reasons.push('leveling-priority');
  } else {
    score += 120;
    reasons.push('baseline-training');
  }

  if (bossLevelPressure > 0) {
    score += bossLevelPressure * bossLevelPressureTrainerBonus;
    reasons.push('boss-pressure');
  }
  if (input.sinnohTrainingActive) {
    score += sinnohTrainerNodeBonus + prepPressure * 70;
    reasons.push('sinnoh-training');
  }

  return {
    id: 'route:trainer',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      matchupScore: input.matchupScore ?? 0,
      prepPressure,
      bossLevelPressure,
    },
  };
}

export function scoreBossRouteNode(input: BossRouteNodeInput): ScoredDecision {
  const config = input.config ?? {};
  const lowHpThreshold = config.lowHpThreshold ?? 50;
  const prep = input.prep ?? {};
  const avgDeficit = Math.max(0, prep.avgDeficit ?? 0);
  const leadDeficit = Math.max(0, prep.leadDeficit ?? 0);
  const ready = Boolean(prep.ready);
  const deficitPenalty = avgDeficit * 150 + leadDeficit * 110;
  const reasons: string[] = [];

  let score = input.avgHP > lowHpThreshold ? 320 : -850;
  reasons.push(input.avgHP > lowHpThreshold ? 'healthy-team' : 'low-hp-team');

  score += input.leadMatchupScore ?? 0;
  if (input.leadMatchupScore) reasons.push('lead-matchup');

  if (input.leadNeedsItem) {
    score -= ready ? 280 : 520;
    reasons.push('lead-needs-item');
  }
  if (input.earlyLevelingPriority && !ready) {
    score -= 1400;
    reasons.push('leveling-priority');
  }
  if (!ready) {
    score -= 900 + deficitPenalty;
    reasons.push('underprepared');
  } else {
    score += 620;
    reasons.push('ready');
  }

  return {
    id: 'route:boss',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      avgDeficit,
      leadDeficit,
      deficitPenalty,
    },
  };
}

export interface RouteNode {
  id: string;
  type: MapNodeType;
  score: number;
  next?: RouteNode[];
}

export function scoreRouteLookahead(node: RouteNode, depth: number, decay = 0.72): ScoredDecision {
  const childScores =
    depth > 0 ? (node.next ?? []).map((child) => scoreRouteLookahead(child, depth - 1, decay)) : [];
  const sortedChildScores = [...childScores];
  sortedChildScores.sort((a, b) => b.score - a.score);
  const bestChild = sortedChildScores[0] ?? null;
  const score = node.score + (bestChild ? bestChild.score * decay : 0);

  return {
    id: node.id,
    score,
    reason: bestChild ? `${node.type}->${bestChild.id}` : node.type,
    details: {
      type: node.type,
      immediate: node.score,
      bestNextId: bestChild?.id ?? null,
    },
  };
}
