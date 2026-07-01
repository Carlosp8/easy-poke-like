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
  const nodeType = input.nodeType;
  const shinyRoute = input.shinyRoute ?? {};
  const buildingCoreTeam = Boolean(input.buildingCoreTeam);
  const needsEarlyRoster = Boolean(input.needsEarlyRoster);
  const hasLowLevelForSwap = Boolean(input.hasLowLevelForSwap);
  const earlyLevelingPriority = Boolean(input.earlyLevelingPriority);
  const openTeamSlot = Boolean(input.openTeamSlot);
  const captureCapReached = Boolean(input.captureCapReached);
  const earlyExpansionClosed = Boolean(input.earlyExpansionClosed);
  const bossLevelPressure = Math.max(0, input.bossLevelPressure ?? 0);
  const prepPressure = input.prepPressure ?? 0;
  const duplicateRouteScore = input.duplicateRouteScore ?? 0;
  const aliveCount = input.aliveCount ?? 0;
  const earlyOptionalTeamSize = config.earlyOptionalTeamSize ?? 4;
  const bossLevelPressureCatchPenalty = config.bossLevelPressureCatchPenalty ?? 120;
  const sinnohCatchNodePenalty = config.sinnohCatchNodePenalty ?? 1150;
  const sinnohGrassNodePenalty = config.sinnohGrassNodePenalty ?? 900;
  const sinnohTrainingCoreTeamSize = config.sinnohTrainingCoreTeamSize ?? 2;
  const sinnohTrainingApplies =
    Boolean(input.sinnohTrainingActive) && aliveCount >= sinnohTrainingCoreTeamSize;

  let score = 0;
  const reasons: string[] = [];

  if (nodeType === 'catch') {
    if (shinyRoute.tacticActive) {
      if (buildingCoreTeam) {
        score += 980;
        reasons.push('shiny-core-team');
      } else if (needsEarlyRoster) {
        score += earlyLevelingPriority ? 760 : 620;
        reasons.push('shiny-early-roster');
      } else if (hasLowLevelForSwap) {
        score += earlyLevelingPriority ? 620 : 520;
        reasons.push('shiny-replacement');
      } else if (shinyRoute.mustTrain) {
        score -= 620 + prepPressure * 45;
        reasons.push('shiny-must-train');
      } else if (shinyRoute.needsTraining) {
        score += 460 - prepPressure * 14;
        reasons.push('shiny-training-pressure');
      } else if (openTeamSlot) {
        score += 760;
        reasons.push('shiny-open-slot');
      } else {
        score += 620;
        reasons.push('shiny-scout');
      }
      if (bossLevelPressure > 0) {
        score -= bossLevelPressure * (shinyRoute.mustTrain ? 70 : 28);
        reasons.push('boss-pressure');
      }
      if (captureCapReached && !shinyRoute.mustTrain) {
        score += shinyRoute.needsTraining ? 260 : 560;
        reasons.push('capture-cap-scout');
      }
      score += duplicateRouteScore;
      if (duplicateRouteScore) reasons.push('duplicate-route');
      if (sinnohTrainingApplies && !shinyRoute.safeToScout) {
        score -= Math.round(sinnohCatchNodePenalty * 0.45);
        reasons.push('sinnoh-training');
      }
    } else {
      if (earlyExpansionClosed && !hasLowLevelForSwap) {
        score -= 1800 + prepPressure * 80;
        reasons.push('early-expansion-closed');
      } else if (captureCapReached && !needsEarlyRoster && !hasLowLevelForSwap) {
        score -= 3200;
        reasons.push('capture-cap');
      } else if (buildingCoreTeam) {
        score += 700;
        reasons.push('core-team');
      } else if (needsEarlyRoster) {
        score += earlyLevelingPriority ? 520 : 380;
        reasons.push('early-roster');
      } else if (hasLowLevelForSwap) {
        score += earlyLevelingPriority ? 450 : 350;
        reasons.push('replacement');
      } else if (earlyLevelingPriority) {
        score -= 900 + prepPressure * 55;
        reasons.push('leveling-priority');
      } else if (openTeamSlot) {
        score += 120;
        reasons.push('open-slot');
      } else if (aliveCount < earlyOptionalTeamSize) {
        score += 180;
        reasons.push('thin-team');
      } else {
        score -= 450;
        reasons.push('full-team');
      }
      if (bossLevelPressure > 0) {
        score -= bossLevelPressure * bossLevelPressureCatchPenalty;
        reasons.push('boss-pressure');
      }
      score += duplicateRouteScore;
      if (duplicateRouteScore) reasons.push('duplicate-route');
      if (sinnohTrainingApplies) {
        score -= sinnohCatchNodePenalty;
        reasons.push('sinnoh-training');
      }
    }
  } else if (shinyRoute.tacticActive) {
    if (buildingCoreTeam) {
      score += 420;
      reasons.push('shiny-core-team');
    } else if (needsEarlyRoster) {
      score += earlyLevelingPriority ? 340 : 240;
      reasons.push('shiny-early-roster');
    } else if (hasLowLevelForSwap) {
      score += earlyLevelingPriority ? 300 : 230;
      reasons.push('shiny-replacement');
    } else if (shinyRoute.mustTrain) {
      score -= 440 + prepPressure * 35;
      reasons.push('shiny-must-train');
    } else if (shinyRoute.needsTraining) {
      score += 210 - prepPressure * 10;
      reasons.push('shiny-training-pressure');
    } else if (openTeamSlot) {
      score += 330;
      reasons.push('shiny-open-slot');
    } else {
      score += 280;
      reasons.push('shiny-scout');
    }
    if (bossLevelPressure > 0) {
      score -= bossLevelPressure * (shinyRoute.mustTrain ? 50 : 20);
      reasons.push('boss-pressure');
    }
    if (captureCapReached && !shinyRoute.mustTrain) {
      score += shinyRoute.needsTraining ? 130 : 320;
      reasons.push('capture-cap-scout');
    }
    score += Math.round(duplicateRouteScore * 0.55);
    if (duplicateRouteScore) reasons.push('duplicate-route');
    if (sinnohTrainingApplies && !shinyRoute.safeToScout) {
      score -= Math.round(sinnohGrassNodePenalty * 0.45);
      reasons.push('sinnoh-training');
    }
  } else {
    if (earlyExpansionClosed && !hasLowLevelForSwap) {
      score -= 1400 + prepPressure * 60;
      reasons.push('early-expansion-closed');
    } else if (captureCapReached && !needsEarlyRoster && !hasLowLevelForSwap) {
      score -= 2400;
      reasons.push('capture-cap');
    } else if (buildingCoreTeam) {
      score += 280;
      reasons.push('core-team');
    } else if (needsEarlyRoster) {
      score += earlyLevelingPriority ? 240 : 120;
      reasons.push('early-roster');
    } else if (hasLowLevelForSwap) {
      score += earlyLevelingPriority ? 180 : 120;
      reasons.push('replacement');
    } else if (earlyLevelingPriority) {
      score -= 650 + prepPressure * 40;
      reasons.push('leveling-priority');
    } else if (openTeamSlot) {
      score += 40;
      reasons.push('open-slot');
    } else {
      score -= 250;
      reasons.push('full-team');
    }
    if (bossLevelPressure > 0) {
      score -= bossLevelPressure * Math.round(bossLevelPressureCatchPenalty * 0.7);
      reasons.push('boss-pressure');
    }
    score += Math.round(duplicateRouteScore * 0.55);
    if (duplicateRouteScore) reasons.push('duplicate-route');
    if (sinnohTrainingApplies) {
      score -= sinnohGrassNodePenalty;
      reasons.push('sinnoh-training');
    }
  }

  return {
    id: `route:${nodeType}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      nodeType,
      bossLevelPressure,
      prepPressure,
      aliveCount,
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
  const captureCapReached = Boolean(input.captureCapReached);
  const openTeamSlot = Boolean(input.openTeamSlot);
  const earlyExpansionClosed = Boolean(input.earlyExpansionClosed);
  const centerCanSkip = Boolean(input.centerCanSkip);
  const runNeedsPower = Boolean(input.runNeedsPower);
  const shinyRoute = input.shinyRoute ?? {};
  const duplicatePriorityRouteBonus = input.config?.duplicatePriorityRouteBonus ?? 1400;
  let score = 0;
  let reason = 'auto';

  if (tactic === 'xp') {
    if (type === 'trainer') {
      score = 900;
      reason = 'xp-trainer';
    } else if (type === 'buff') {
      score = 180;
      reason = 'xp-buff';
    } else if (type === 'catch' || type === 'grass') {
      score = -500;
      reason = 'xp-avoid-capture';
    } else if (type === 'item') {
      score = -120;
      reason = 'xp-low-item';
    } else if (type === 'center' && centerCanSkip) {
      score = -300;
      reason = 'xp-skip-center';
    }
  } else if (tactic === 'capture') {
    if (type === 'catch') {
      score = 850;
      reason = 'capture-catch';
    } else if (type === 'grass') {
      score = 350;
      reason = 'capture-grass';
    } else if (type === 'trade') {
      score = 120;
      reason = 'capture-trade';
    } else if (type === 'trainer') {
      score = -180;
      reason = 'capture-avoid-trainer';
    }
  } else if (tactic === 'shiny') {
    const settledScoutBonus = !shinyRoute.needsTraining && earlyExpansionClosed ? 1200 : 0;
    const capScoutBonus = captureCapReached ? 900 : 0;
    const balancedScoutBonus = shinyRoute.canBalancedScout
      ? Math.max(420, 980 - prepPressure * 45)
      : 0;

    if (type === 'catch') {
      if (shinyRoute.mustTrain) {
        score = -420 - prepPressure * 35;
        reason = 'shiny-must-train';
      } else if (shinyRoute.needsTraining) {
        score = balancedScoutBonus + capScoutBonus + 180;
        reason = 'shiny-balanced-catch';
      } else {
        score = (captureCapReached ? 5200 : openTeamSlot ? 1850 : 2550) + settledScoutBonus;
        reason = 'shiny-catch';
      }
    } else if (type === 'unknown') {
      if (shinyRoute.mustTrain) {
        score = -280 - prepPressure * 30;
        reason = 'shiny-unknown-must-train';
      } else if (shinyRoute.needsTraining) {
        score = Math.round(balancedScoutBonus * 1.05) + capScoutBonus + 240;
        reason = 'shiny-balanced-unknown';
      } else {
        score =
          (captureCapReached ? 5050 : openTeamSlot ? 1950 : 2450) +
          Math.round(settledScoutBonus * 0.95);
        reason = 'shiny-unknown';
      }
    } else if (type === 'grass') {
      if (shinyRoute.mustTrain) {
        score = -250 - prepPressure * 25;
        reason = 'shiny-grass-must-train';
      } else if (shinyRoute.needsTraining) {
        score = Math.round(balancedScoutBonus * 0.75) + Math.round(capScoutBonus * 0.55) + 40;
        reason = 'shiny-balanced-grass';
      } else {
        score = (captureCapReached ? 3700 : 1350) + Math.round(settledScoutBonus * 0.65);
        reason = 'shiny-grass';
      }
    } else if (type === 'trainer') {
      score = shinyRoute.needsTraining ? 900 + prepPressure * 120 : 260;
      reason = 'shiny-trainer';
    } else if (type === 'buff') {
      score = shinyRoute.needsTraining ? 540 + prepPressure * 70 : 150;
      reason = 'shiny-buff';
    } else if (type === 'item') {
      score = runNeedsPower ? -140 : -70;
      reason = 'shiny-item';
    } else if (type === 'trade') {
      score = openTeamSlot ? 60 : 20;
      reason = 'shiny-trade';
    } else if (type === 'legendary') {
      score = runNeedsPower ? 80 : 180;
      reason = 'shiny-legendary';
    } else if (type === 'center') {
      score = centerCanSkip ? -260 : 150;
      reason = 'shiny-center';
    } else if (type === 'boss') {
      score = input.prepReady ? 140 : -520;
      reason = 'shiny-boss';
    }
  } else if (tactic === 'boss') {
    if (type === 'item') {
      score = 420;
      reason = 'boss-item';
    } else if (type === 'buff') {
      score = 300;
      reason = 'boss-buff';
    } else if (type === 'trainer') {
      score = 220;
      reason = 'boss-trainer';
    } else if (type === 'legendary') {
      score = 260;
      reason = 'boss-legendary';
    } else if (type === 'boss') {
      score = 180;
      reason = 'boss-boss';
    } else if (type === 'center') {
      score = centerCanSkip ? -100 : 400;
      reason = 'boss-center';
    } else if ((type === 'catch' || type === 'grass') && earlyExpansionClosed) {
      score = -200;
      reason = 'boss-avoid-capture';
    }
  } else if (tactic === 'duplicate') {
    if (!input.duplicateCatchesEnabled) {
      score = 0;
      reason = 'duplicate-disabled';
    } else if (type === 'catch') {
      if (input.duplicateNeedsOpeningPair) {
        score = duplicatePriorityRouteBonus;
        reason = 'duplicate-open-pair';
      } else {
        score = input.duplicateHasLowLevelNonDuplicate ? 120 : -420;
        reason = 'duplicate-catch';
      }
    } else if (type === 'grass') {
      score = -260;
      reason = 'duplicate-avoid-grass';
    } else if (type === 'trainer') {
      score = input.duplicateHasPair ? 620 : 260;
      reason = 'duplicate-trainer';
    } else if (type === 'buff') {
      score = input.duplicateHasPair ? 220 : 80;
      reason = 'duplicate-buff';
    } else if (type === 'legendary') {
      score = input.duplicateHasLowLevelNonDuplicate ? 180 : 80;
      reason = 'duplicate-legendary';
    } else if (type === 'trade') {
      score = input.duplicateHasLowLevelNonDuplicate ? 80 : -80;
      reason = 'duplicate-trade';
    }
  }

  return {
    id: `route:tactic:${tactic}:${type}`,
    score,
    reason,
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
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `route:challenge:${type}`,
      score: 0,
      reason: 'inactive',
      details: { type, prepPressure },
    };
  }

  if (input.earlyShinyHunt) {
    const scoutPressureOk = prepPressure <= shinyScoutPressureLimit;
    if (type === 'catch') {
      score += scoutPressureOk ? challengeFirstShinyNodeBonus : 620;
      reasons.push('early-shiny-catch');
    }
    if (type === 'grass') {
      score += scoutPressureOk ? Math.round(challengeFirstShinyNodeBonus * 0.72) : 420;
      reasons.push('early-shiny-grass');
    }
    if (type === 'unknown') {
      score += scoutPressureOk ? Math.round(challengeFirstShinyNodeBonus * 0.82) : 500;
      reasons.push('early-shiny-unknown');
    }
  }

  if (input.carryNeedsItem && type === 'item') {
    score += challengeCarryItemNodeBonus;
    reasons.push('carry-item');
  }
  if (input.needsCarryBuff && type === 'buff') {
    score += challengeCarryBuffNodeBonus + prepPressure * 55;
    reasons.push('carry-buff');
  }
  if (input.underleveled && type === 'trainer') {
    score += challengeTrainerLevelNodeBonus + prepPressure * 85;
    reasons.push('underleveled-trainer');
  }
  if (type === 'legendary') {
    score += prepPressure <= 1 ? 380 : -320;
    reasons.push(prepPressure <= 1 ? 'legendary-ready' : 'legendary-pressure');
  }

  if (type === 'center' && input.centerCanSkip) {
    score -= 520;
    reasons.push('skip-center');
  }
  if (type === 'item' && !input.carryNeedsItem && input.needsCarryBuff) {
    score -= 120;
    reasons.push('prefer-buff-over-item');
  }
  if ((type === 'catch' || type === 'grass') && !input.earlyShinyHunt && input.underleveled) {
    score -= 260 + prepPressure * 45;
    reasons.push('underleveled-avoid-capture');
  }
  if (type === 'boss') {
    score += prepReady ? 260 : -1350 - prepPressure * 180;
    reasons.push(prepReady ? 'boss-ready' : 'boss-underprepared');
  }

  return {
    id: `route:challenge:${type}`,
    score,
    reason: reasons.join(',') || 'neutral',
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
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `route:story:${type}`,
      score: 0,
      reason: 'inactive',
      details: { type, prepPressure },
    };
  }

  if (input.needsTeam) {
    if (type === 'catch') {
      score += storyRouteTeamBuildBonus;
      reasons.push('team-catch');
    }
    if (type === 'grass') {
      score += Math.round(storyRouteTeamBuildBonus * 0.55);
      reasons.push('team-grass');
    }
    if (type === 'trade') {
      score += 260;
      reasons.push('team-trade');
    }
  } else if (input.needsCoverage) {
    if (type === 'catch') {
      score += storyRouteCoverageBonus;
      reasons.push('coverage-catch');
    }
    if (type === 'grass') {
      score += Math.round(storyRouteCoverageBonus * 0.5);
      reasons.push('coverage-grass');
    }
  } else if (type === 'catch' || type === 'grass') {
    score -= 180;
    reasons.push('avoid-extra-capture');
  }

  if (prepPressure > 0) {
    if (type === 'trainer') {
      score += storyRouteTrainingBonus + prepPressure * 80;
      reasons.push('prep-trainer');
    }
    if (type === 'buff') {
      score += 360 + prepPressure * 45;
      reasons.push('prep-buff');
    }
    if (type === 'item') {
      score += 180;
      reasons.push('prep-item');
    }
  }

  if (type === 'legendary') {
    score += prepPressure <= 2 ? 520 : -180;
    reasons.push(prepPressure <= 2 ? 'legendary-ready' : 'legendary-pressure');
  }
  if (type === 'item' && (input.weakMemberCount ?? 0) > 0) {
    score += 160;
    reasons.push('weak-member-item');
  }
  if (type === 'center' && input.centerCanSkip) {
    score -= 420;
    reasons.push('skip-center');
  }
  if (type === 'boss') {
    score += prepReady ? 220 : -1050 - prepPressure * 160;
    reasons.push(prepReady ? 'boss-ready' : 'boss-underprepared');
  }

  return {
    id: `route:story:${type}`,
    score,
    reason: reasons.join(',') || 'neutral',
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
  const bestChild = childScores.sort((a, b) => b.score - a.score)[0] ?? null;
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
