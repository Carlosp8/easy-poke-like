import type { ScoredDecision } from '../../types.d.ts';
import { foldText } from '../text-utils.ts';
import {
  getAttackCoverageScore,
  getDefensiveMatchupScore,
  normalizeTypeList,
  scoreCatchBossCounter,
} from '../type-matchups.ts';

export interface CatchDraftDecisionInput {
  openTeamSlot: boolean;
  bestScore: number;
  bestCandidate?: {
    level?: number;
  } | null;
  hasVisibleShiny?: boolean;
  earlyShinyScoutWindow?: boolean;
  settledCatchWindow?: boolean;
  sinnohTrainingActive?: boolean;
  aliveCount?: number;
  shouldBuildCoreTeam?: boolean;
  earlyExpansionClosed?: boolean;
  effectiveCaptureCapReached?: boolean;
  shouldPrioritizeTraining?: boolean;
  hasLowLevelForSwap?: boolean;
  teamMaxLevel?: number;
  earlyAllowance?: 'core' | 'exceptional' | 'optional' | 'skip';
  bestIsPremiumCatch?: boolean;
  bestIsExceptional?: boolean;
  bestIsDirectCounter?: boolean;
  bestIsDuplicatePlan?: boolean;
  bestIsSinnohPassivePlan?: boolean;
  bestIsChallengePlan?: boolean;
  bestIsStoryPlan?: boolean;
  bestIsBossRelevant?: boolean;
  bestWouldDiluteLevels?: boolean;
  config?: {
    earlyNonShinyMinAcceptScore?: number;
    settledCatchMinAcceptScore?: number;
    sinnohTrainingCoreTeamSize?: number;
    earlyOptionalTeamSize?: number;
    catchRerollMinAcceptScore?: number;
    earlyExceptionalCatchScore?: number;
    earlyLowLevelSwapGap?: number;
  };
}

export interface CatchDraftDecision {
  action: 'catch' | 'skip';
  reason: string;
  details: {
    minUsefulSwapLevel?: number;
  };
}

export interface StatScoreSnapshot {
  bst?: number;
  offense?: number;
  speed?: number;
  bulk?: number;
}

export interface ChallengeCatchScoreInput {
  active?: boolean;
  name?: string;
  types?: unknown;
  attackTypes?: unknown;
  isShiny?: boolean;
  alreadyOwnedShiny?: boolean;
  isLegendary?: boolean;
  isMainCarry?: boolean;
  hasShiny?: boolean;
  earlyShinyHunt?: boolean;
  targetTypes?: unknown;
  bossCounterScore?: number;
  priorityTypeScore?: number;
  level?: number;
  prepAvgLevel?: number;
  stats?: StatScoreSnapshot;
  config?: {
    challengeShinyCatchBonus?: number;
    challengeNonShinyEarlyPenalty?: number;
    earlyExpansionCounterScore?: number;
    legendaryCatchMinBst?: number;
  };
}

export interface StoryLeagueCoverageInput {
  active?: boolean;
  attackTypes?: unknown;
  types?: unknown;
  leagueTypes?: unknown;
  uncoveredLeagueTypes?: unknown;
  config?: {
    storyLeagueCoverageBonus?: number;
  };
}

export interface StoryCatchScoreInput {
  active?: boolean;
  name?: string;
  types?: unknown;
  attackTypes?: unknown;
  isShiny?: boolean;
  isLegendary?: boolean;
  isLegendaryName?: boolean;
  isMainCarry?: boolean;
  needsTeam?: boolean;
  needsCoverage?: boolean;
  currentBossTypes?: unknown;
  leagueTypes?: unknown;
  uncoveredLeagueTypes?: unknown;
  leagueCoverageScore?: number;
  priorityTypeScore?: number;
  duplicateCount?: number;
  stats?: StatScoreSnapshot;
  config?: {
    storyMinBstTarget?: number;
    storyWeakStatPenalty?: number;
    storyCurrentBossCoverageBonus?: number;
    storyLeagueCoverageBonus?: number;
    legendaryCatchMinBst?: number;
  };
}

export interface CatchDraftInput {
  name: string;
  types?: string[];
  attackTypes?: string[];
  isShiny?: boolean;
  alreadyOwnedShiny?: boolean;
  isLegendary?: boolean;
  bossTypes?: string[];
  duplicatePairScore?: number;
  baseScore?: number;
}

export interface TraitSynergyScoreInput {
  types?: unknown;
  traitCounts?: Record<string, number>;
  traitData?: Record<string, { tier?: string }>;
  traitTierValues?: Record<string, number>;
}

export interface TypeCoverageScoreInput {
  candidateTypes?: unknown;
  teamTypes?: unknown;
  coverageWeight?: number;
}

export function scoreTraitSynergy(input: TraitSynergyScoreInput = {}): ScoredDecision {
  const types = normalizeTypeList(input.types);
  const traitCounts = input.traitCounts || {};
  const traitData = input.traitData || {};
  const traitTierValues = input.traitTierValues || {};
  const reasons: string[] = [];
  let score = 0;

  types.forEach((type) => {
    const traitInfo = traitData[type];
    if (!traitInfo) return;
    const currentCount = traitCounts[type] || 0;
    const tierValue = traitTierValues[traitInfo.tier || ''] || 1;

    if (currentCount === 1 || currentCount === 3 || currentCount === 5) {
      score += tierValue * 2;
      reasons.push(`${type}:threshold`);
    } else if (currentCount === 0) {
      score += tierValue * 0.5;
      reasons.push(`${type}:new`);
    } else {
      score += tierValue * 0.3;
      reasons.push(`${type}:stack`);
    }
  });

  return {
    id: 'catch:trait-synergy',
    score,
    reason: reasons.join(',') || 'none',
    details: { types },
  };
}

export function scoreNewTypeCoverage(input: TypeCoverageScoreInput = {}): ScoredDecision {
  const candidateTypes = normalizeTypeList(input.candidateTypes);
  const teamTypes = normalizeTypeList(input.teamTypes);
  const coverageWeight = input.coverageWeight ?? 0;
  const newTypes = candidateTypes.filter((type) => !teamTypes.includes(type));

  return {
    id: 'catch:type-coverage',
    score: newTypes.length * coverageWeight,
    reason: newTypes.length > 0 ? newTypes.join(',') : 'covered',
    details: { candidateTypes, teamTypes, newTypes, coverageWeight },
  };
}

export function decideCatchDraftAction(input: CatchDraftDecisionInput): CatchDraftDecision {
  const bestCandidate = input.bestCandidate ?? null;
  const config = input.config ?? {};
  const bestScore = Number.isFinite(input.bestScore) ? input.bestScore : -999;
  const bestIsPremiumCatch = Boolean(input.bestIsPremiumCatch);
  const bestIsExceptional = Boolean(input.bestIsExceptional);
  const bestIsDirectCounter = Boolean(input.bestIsDirectCounter);
  const bestIsDuplicatePlan = Boolean(input.bestIsDuplicatePlan);
  const bestIsSinnohPassivePlan = Boolean(input.bestIsSinnohPassivePlan);
  const bestIsChallengePlan = Boolean(input.bestIsChallengePlan);
  const bestIsStoryPlan = Boolean(input.bestIsStoryPlan);
  const bestIsBossRelevant = Boolean(input.bestIsBossRelevant);
  const protectedPlan =
    bestIsPremiumCatch ||
    bestIsExceptional ||
    bestIsDirectCounter ||
    bestIsDuplicatePlan ||
    bestIsSinnohPassivePlan ||
    bestIsChallengePlan ||
    bestIsStoryPlan;

  const skip = (reason: string, details: CatchDraftDecision['details'] = {}) => ({
    action: 'skip' as const,
    reason,
    details,
  });

  if (
    input.openTeamSlot &&
    input.earlyShinyScoutWindow &&
    !input.hasVisibleShiny &&
    bestCandidate &&
    bestScore < (config.earlyNonShinyMinAcceptScore ?? 38) &&
    !bestIsPremiumCatch &&
    !bestIsExceptional &&
    !bestIsDirectCounter &&
    !bestIsSinnohPassivePlan &&
    !bestIsChallengePlan &&
    !bestIsStoryPlan
  ) {
    return skip('early-non-shiny-low-value');
  }

  if (
    input.openTeamSlot &&
    input.settledCatchWindow &&
    bestCandidate &&
    bestScore < (config.settledCatchMinAcceptScore ?? 32) &&
    !protectedPlan
  ) {
    return skip('settled-run-low-value');
  }

  if (
    input.sinnohTrainingActive &&
    (input.aliveCount ?? 0) >= (config.sinnohTrainingCoreTeamSize ?? 2) &&
    !bestIsPremiumCatch &&
    !bestIsExceptional &&
    !bestIsDirectCounter &&
    !bestIsSinnohPassivePlan &&
    !bestIsChallengePlan &&
    !bestIsStoryPlan
  ) {
    return skip('sinnoh-carry-training');
  }

  if (input.openTeamSlot && bestCandidate && !input.shouldBuildCoreTeam) {
    const fillingEarlyRoster =
      (input.aliveCount ?? 0) < (config.earlyOptionalTeamSize ?? 4) &&
      bestScore >= (config.catchRerollMinAcceptScore ?? 18);
    const goodGeneralValue =
      !input.earlyExpansionClosed &&
      !input.shouldPrioritizeTraining &&
      !input.effectiveCaptureCapReached &&
      bestScore >= (config.catchRerollMinAcceptScore ?? 18);
    const shouldAcceptRosterFill =
      fillingEarlyRoster &&
      (!input.effectiveCaptureCapReached ||
        bestIsPremiumCatch ||
        bestScore >= (config.earlyExceptionalCatchScore ?? 42));
    const canBreakEarlyRosterCap =
      !input.earlyExpansionClosed ||
      bestIsExceptional ||
      bestIsPremiumCatch ||
      bestIsDirectCounter ||
      bestIsDuplicatePlan ||
      bestIsSinnohPassivePlan ||
      bestIsChallengePlan ||
      bestIsStoryPlan;

    if (
      input.bestWouldDiluteLevels ||
      !canBreakEarlyRosterCap ||
      (!bestIsPremiumCatch &&
        !bestIsBossRelevant &&
        !goodGeneralValue &&
        !shouldAcceptRosterFill &&
        !bestIsExceptional &&
        !bestIsDirectCounter &&
        !bestIsDuplicatePlan &&
        !bestIsSinnohPassivePlan &&
        !bestIsChallengePlan &&
        !bestIsStoryPlan)
    ) {
      if (input.bestWouldDiluteLevels) return skip('would dilute levels');
      if (
        input.earlyExpansionClosed &&
        !bestIsExceptional &&
        !bestIsPremiumCatch &&
        !bestIsDirectCounter &&
        !bestIsDuplicatePlan &&
        !bestIsSinnohPassivePlan &&
        !bestIsChallengePlan &&
        !bestIsStoryPlan
      ) {
        return skip('early roster closed');
      }
      if (input.effectiveCaptureCapReached) return skip('already caught this map');
      if (input.shouldPrioritizeTraining) return skip('leveling focus');
      return skip('no strong boss value');
    }
  }

  if (!input.openTeamSlot && input.hasLowLevelForSwap && bestCandidate?.level) {
    const minUsefulSwapLevel = Math.max(
      1,
      (input.teamMaxLevel ?? 0) - (config.earlyLowLevelSwapGap ?? 5),
    );
    if (
      bestCandidate.level < minUsefulSwapLevel &&
      !bestIsPremiumCatch &&
      !bestIsExceptional &&
      !bestIsDirectCounter &&
      !bestIsSinnohPassivePlan &&
      !bestIsChallengePlan &&
      !bestIsStoryPlan
    ) {
      return skip('replacement-too-low-level', { minUsefulSwapLevel });
    }
  }

  if (
    !input.openTeamSlot &&
    input.earlyAllowance === 'skip' &&
    !input.hasLowLevelForSwap &&
    !bestIsPremiumCatch &&
    !bestIsSinnohPassivePlan &&
    !bestIsChallengePlan &&
    !bestIsStoryPlan
  ) {
    return skip('xp-focus');
  }

  if (
    !input.openTeamSlot &&
    bestScore < 2 &&
    !input.hasLowLevelForSwap &&
    !bestIsPremiumCatch &&
    !bestIsSinnohPassivePlan &&
    !bestIsChallengePlan &&
    !bestIsStoryPlan
  ) {
    return skip('weak-candidate');
  }

  return {
    action: 'catch',
    reason: 'accepted',
    details: {},
  };
}

export function scoreCatchDraftSignals(candidate: CatchDraftInput): ScoredDecision {
  const attackTypes = candidate.attackTypes?.length ? candidate.attackTypes : candidate.types;
  const bossCounterScore = getAttackCoverageScore(attackTypes, candidate.bossTypes);
  let score = candidate.baseScore ?? 0;
  const reasons: string[] = [];

  if (candidate.isShiny) {
    score += candidate.alreadyOwnedShiny ? 35 : 120;
    reasons.push(candidate.alreadyOwnedShiny ? 'repeat-shiny' : 'new-shiny');
  }
  if (candidate.isLegendary) {
    score += 80;
    reasons.push('legendary');
  }
  if ((candidate.duplicatePairScore ?? 0) > 0) {
    score += candidate.duplicatePairScore ?? 0;
    reasons.push('duplicate-plan');
  }
  if (bossCounterScore > 0) {
    score += bossCounterScore * 10;
    reasons.push('boss-counter');
  }

  return {
    id: foldText(candidate.name).replace(/\s+/g, '-'),
    score,
    reason: reasons.join(',') || 'baseline',
    details: {
      bossCounterScore,
      types: normalizeTypeList(candidate.types),
      attackTypes: normalizeTypeList(attackTypes),
    },
  };
}

export function scoreChallengeCatchBonus(input: ChallengeCatchScoreInput): ScoredDecision {
  const config = input.config ?? {};
  const types = normalizeTypeList(input.types);
  const attacks = normalizeTypeList(input.attackTypes).length > 0 ? input.attackTypes : types;
  const targetTypes = normalizeTypeList(input.targetTypes);
  const stats = input.stats ?? {};
  const bst = stats.bst ?? 0;
  const offense = stats.offense ?? 0;
  const speed = stats.speed ?? 0;
  const level = input.level ?? 0;
  const prepAvgLevel = input.prepAvgLevel ?? 0;
  const challengeShinyCatchBonus = config.challengeShinyCatchBonus ?? 220;
  const challengeNonShinyEarlyPenalty = config.challengeNonShinyEarlyPenalty ?? 42;
  const earlyExpansionCounterScore = config.earlyExpansionCounterScore ?? 12;
  const legendaryCatchMinBst = config.legendaryCatchMinBst ?? 540;
  const bossCounterScore =
    input.bossCounterScore ?? scoreCatchBossCounter(types, attacks, targetTypes);
  const priorityTypeScore = input.priorityTypeScore ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `catch:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { types, bossCounterScore },
    };
  }

  if (input.isShiny) {
    score += input.hasShiny ? 120 : challengeShinyCatchBonus;
    score += input.alreadyOwnedShiny ? 18 : 72;
    score += priorityTypeScore * 0.9;
    reasons.push(input.hasShiny ? 'repeat-run-shiny' : 'first-run-shiny');
  } else if (input.earlyShinyHunt) {
    const runValue =
      Boolean(input.isLegendary) ||
      bossCounterScore >= earlyExpansionCounterScore ||
      bst >= legendaryCatchMinBst;
    score -= runValue ? 8 : challengeNonShinyEarlyPenalty;
    reasons.push(runValue ? 'early-run-value' : 'early-non-shiny');
  }

  if (input.isMainCarry) {
    score += 78;
    reasons.push('main-carry');
  }
  if (input.isLegendary || bst >= legendaryCatchMinBst) {
    score += 54;
    reasons.push('legendary-or-high-bst');
  }
  if (bst) score += Math.max(0, bst - 460) / 5;
  if (offense) score += offense / 9;
  if (speed) score += speed / 14;
  if (level && prepAvgLevel && level >= prepAvgLevel - 3) {
    score += 18;
    reasons.push('level-ready');
  }
  if (level && prepAvgLevel && level < prepAvgLevel - 8) {
    score -= 18;
    reasons.push('level-low');
  }

  if (targetTypes.length > 0) {
    score += getAttackCoverageScore(attacks, targetTypes) * 4.2;
    score += getDefensiveMatchupScore(types, targetTypes) * 2.8;
    reasons.push('target-matchup');
  }

  score += priorityTypeScore;
  if (priorityTypeScore) reasons.push('priority-types');
  if (types.includes('Fairy')) {
    score += 18;
    reasons.push('fairy');
  }
  if (
    types.includes('Dragon') ||
    types.includes('Fire') ||
    types.includes('Dark') ||
    types.includes('Ghost')
  ) {
    score += 12;
    reasons.push('power-type');
  }
  if (types.includes('Poison') && bst && bst < 500) {
    score -= 14;
    reasons.push('low-bst-poison');
  }

  return {
    id: `catch:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      types,
      targetTypes,
      bossCounterScore,
      priorityTypeScore,
      bst,
      offense,
      speed,
    },
  };
}

export function scoreStoryLeagueCoverage(input: StoryLeagueCoverageInput = {}): ScoredDecision {
  const types = normalizeTypeList(input.types);
  const attackTypes = normalizeTypeList(input.attackTypes).length > 0 ? input.attackTypes : types;
  const defenderTypes = normalizeTypeList(input.leagueTypes);
  const uncoveredLeagueTypes = normalizeTypeList(input.uncoveredLeagueTypes);
  const storyLeagueCoverageBonus = input.config?.storyLeagueCoverageBonus ?? 72;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: 'catch:story-league-coverage',
      score: 0,
      reason: 'inactive',
      details: { types: normalizeTypeList(types), defenderTypes },
    };
  }

  if (defenderTypes.length > 0) {
    score += getAttackCoverageScore(attackTypes, defenderTypes) * 5.5;
    score += getDefensiveMatchupScore(types, defenderTypes) * 2.5;
    reasons.push('league-matchup');
  }
  uncoveredLeagueTypes.forEach((type) => {
    if (getAttackCoverageScore(attackTypes, [type]) > 0) {
      score += storyLeagueCoverageBonus;
      reasons.push(`covers-${type}`);
    }
  });

  return {
    id: 'catch:story-league-coverage',
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      types,
      attackTypes: normalizeTypeList(attackTypes),
      defenderTypes,
      uncoveredLeagueTypes,
    },
  };
}

export function scoreStoryCatchBonus(input: StoryCatchScoreInput): ScoredDecision {
  const config = input.config ?? {};
  const types = normalizeTypeList(input.types);
  const attacks = normalizeTypeList(input.attackTypes).length > 0 ? input.attackTypes : types;
  const currentBossTypes = normalizeTypeList(input.currentBossTypes);
  const stats = input.stats ?? {};
  const bst = stats.bst ?? 0;
  const offense = stats.offense ?? 0;
  const speed = stats.speed ?? 0;
  const bulk = stats.bulk ?? 0;
  const storyMinBstTarget = config.storyMinBstTarget ?? 480;
  const storyWeakStatPenalty = config.storyWeakStatPenalty ?? 34;
  const storyCurrentBossCoverageBonus = config.storyCurrentBossCoverageBonus ?? 44;
  const legendaryCatchMinBst = config.legendaryCatchMinBst ?? 540;
  const leagueCoverageScore =
    input.leagueCoverageScore ??
    scoreStoryLeagueCoverage({
      active: input.active,
      attackTypes: attacks,
      types,
      leagueTypes: input.leagueTypes,
      uncoveredLeagueTypes: input.uncoveredLeagueTypes,
      config: {
        storyLeagueCoverageBonus: config.storyLeagueCoverageBonus,
      },
    }).score;
  const priorityTypeScore = input.priorityTypeScore ?? 0;
  const duplicateCount = input.duplicateCount ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `catch:story:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { types },
    };
  }

  if (input.needsTeam) {
    score += 34;
    reasons.push('needs-team');
  }
  if (input.isShiny) {
    score += 18;
    reasons.push('shiny');
  }
  if (input.isLegendary || input.isLegendaryName) {
    score += 70;
    reasons.push('legendary');
  }
  if (input.isMainCarry) {
    score += 55;
    reasons.push('main-carry');
  }
  if (bst) score += Math.max(0, bst - 430) / 3.6;
  if (offense) score += offense / 7.5;
  if (speed) score += speed / 12;
  if (bulk) score += bulk / 42;
  if (bst && bst < storyMinBstTarget && !input.needsTeam) {
    score -= storyWeakStatPenalty;
    reasons.push('weak-stats');
  }

  if (currentBossTypes.length > 0) {
    score +=
      (getAttackCoverageScore(attacks, currentBossTypes) * storyCurrentBossCoverageBonus) / 5;
    score += getDefensiveMatchupScore(types, currentBossTypes) * 3;
    reasons.push('current-boss');
  }

  score += leagueCoverageScore;
  if (leagueCoverageScore) reasons.push('league-coverage');
  score += priorityTypeScore;
  if (priorityTypeScore) reasons.push('priority-types');

  if (
    duplicateCount > 0 &&
    !input.isLegendary &&
    !input.isMainCarry &&
    bst < legendaryCatchMinBst
  ) {
    score -= input.needsCoverage ? 24 : 42;
    reasons.push(input.needsCoverage ? 'coverage-duplicate' : 'duplicate');
  }

  return {
    id: `catch:story:${foldText(input.name || 'unknown') || 'unknown'}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      types,
      currentBossTypes,
      leagueCoverageScore,
      priorityTypeScore,
      duplicateCount,
      bst,
      offense,
      speed,
      bulk,
    },
  };
}
