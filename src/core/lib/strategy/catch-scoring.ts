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

interface CatchProtectionFlags {
  premium: boolean;
  exceptional: boolean;
  directCounter: boolean;
  duplicatePlan: boolean;
  sinnohPassivePlan: boolean;
  challengePlan: boolean;
  storyPlan: boolean;
  bossRelevant: boolean;
}

function isProtectedCatchPlan(flags: CatchProtectionFlags): boolean {
  return (
    flags.premium ||
    flags.exceptional ||
    flags.directCounter ||
    flags.duplicatePlan ||
    flags.sinnohPassivePlan ||
    flags.challengePlan ||
    flags.storyPlan
  );
}

function shouldSkipEarlyNonShinyScout(
  input: CatchDraftDecisionInput,
  bestCandidate: CatchDraftDecisionInput['bestCandidate'],
  bestScore: number,
  flags: CatchProtectionFlags,
  config: NonNullable<CatchDraftDecisionInput['config']>,
): boolean {
  return Boolean(
    input.openTeamSlot &&
    input.earlyShinyScoutWindow &&
    !input.hasVisibleShiny &&
    bestCandidate &&
    bestScore < (config.earlyNonShinyMinAcceptScore ?? 38) &&
    !flags.premium &&
    !flags.exceptional &&
    !flags.directCounter &&
    !flags.sinnohPassivePlan &&
    !flags.challengePlan &&
    !flags.storyPlan,
  );
}

function shouldSkipOpenSlotCatch(
  input: CatchDraftDecisionInput,
  bestScore: number,
  flags: CatchProtectionFlags,
  config: NonNullable<CatchDraftDecisionInput['config']>,
): string {
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
      flags.premium ||
      bestScore >= (config.earlyExceptionalCatchScore ?? 42));
  const canBreakEarlyRosterCap = !input.earlyExpansionClosed || isProtectedCatchPlan(flags);

  if (
    !input.bestWouldDiluteLevels &&
    canBreakEarlyRosterCap &&
    (flags.premium ||
      flags.bossRelevant ||
      goodGeneralValue ||
      shouldAcceptRosterFill ||
      isProtectedCatchPlan(flags))
  ) {
    return '';
  }
  if (input.bestWouldDiluteLevels) return 'would dilute levels';
  if (input.earlyExpansionClosed && !isProtectedCatchPlan(flags)) return 'early roster closed';
  if (input.effectiveCaptureCapReached) return 'already caught this map';
  if (input.shouldPrioritizeTraining) return 'leveling focus';
  return 'no strong boss value';
}

function shouldSkipLowLevelReplacement(
  input: CatchDraftDecisionInput,
  flags: CatchProtectionFlags,
  minUsefulSwapLevel: number,
): boolean {
  const candidateLevel = input.bestCandidate?.level ?? 0;
  return Boolean(
    !input.openTeamSlot &&
    input.hasLowLevelForSwap &&
    candidateLevel &&
    candidateLevel < minUsefulSwapLevel &&
    !flags.premium &&
    !flags.exceptional &&
    !flags.directCounter &&
    !flags.sinnohPassivePlan &&
    !flags.challengePlan &&
    !flags.storyPlan,
  );
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
  const flags: CatchProtectionFlags = {
    premium: Boolean(input.bestIsPremiumCatch),
    exceptional: Boolean(input.bestIsExceptional),
    directCounter: Boolean(input.bestIsDirectCounter),
    duplicatePlan: Boolean(input.bestIsDuplicatePlan),
    sinnohPassivePlan: Boolean(input.bestIsSinnohPassivePlan),
    challengePlan: Boolean(input.bestIsChallengePlan),
    storyPlan: Boolean(input.bestIsStoryPlan),
    bossRelevant: Boolean(input.bestIsBossRelevant),
  };
  const protectedPlan = isProtectedCatchPlan(flags);

  const skip = (reason: string, details: CatchDraftDecision['details'] = {}) => ({
    action: 'skip' as const,
    reason,
    details,
  });

  if (shouldSkipEarlyNonShinyScout(input, bestCandidate, bestScore, flags, config)) {
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
    !flags.premium &&
    !flags.exceptional &&
    !flags.directCounter &&
    !flags.sinnohPassivePlan &&
    !flags.challengePlan &&
    !flags.storyPlan
  ) {
    return skip('sinnoh-carry-training');
  }

  if (input.openTeamSlot && bestCandidate && !input.shouldBuildCoreTeam) {
    const skipReason = shouldSkipOpenSlotCatch(input, bestScore, flags, config);
    if (skipReason) return skip(skipReason);
  }

  if (!input.openTeamSlot && input.hasLowLevelForSwap && bestCandidate?.level) {
    const minUsefulSwapLevel = Math.max(
      1,
      (input.teamMaxLevel ?? 0) - (config.earlyLowLevelSwapGap ?? 5),
    );
    if (shouldSkipLowLevelReplacement(input, flags, minUsefulSwapLevel)) {
      return skip('replacement-too-low-level', { minUsefulSwapLevel });
    }
  }

  if (
    !input.openTeamSlot &&
    input.earlyAllowance === 'skip' &&
    !input.hasLowLevelForSwap &&
    !flags.premium &&
    !flags.sinnohPassivePlan &&
    !flags.challengePlan &&
    !flags.storyPlan
  ) {
    return skip('xp-focus');
  }

  if (
    !input.openTeamSlot &&
    bestScore < 2 &&
    !input.hasLowLevelForSwap &&
    !flags.premium &&
    !flags.sinnohPassivePlan &&
    !flags.challengePlan &&
    !flags.storyPlan
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
    id: foldText(candidate.name).replaceAll(/\s+/g, '-'),
    score,
    reason: reasons.join(',') || 'baseline',
    details: {
      bossCounterScore,
      types: normalizeTypeList(candidate.types),
      attackTypes: normalizeTypeList(attackTypes),
    },
  };
}

function addChallengeShinyScore(
  input: ChallengeCatchScoreInput,
  scoreParts: { score: number; reasons: string[] },
  values: {
    priorityTypeScore: number;
    challengeShinyCatchBonus: number;
    challengeNonShinyEarlyPenalty: number;
    earlyExpansionCounterScore: number;
    legendaryCatchMinBst: number;
    bossCounterScore: number;
    bst: number;
  },
): void {
  if (input.isShiny) {
    scoreParts.score += input.hasShiny ? 120 : values.challengeShinyCatchBonus;
    scoreParts.score += input.alreadyOwnedShiny ? 18 : 72;
    scoreParts.score += values.priorityTypeScore * 0.9;
    scoreParts.reasons.push(input.hasShiny ? 'repeat-run-shiny' : 'first-run-shiny');
    return;
  }

  if (!input.earlyShinyHunt) return;
  const runValue =
    Boolean(input.isLegendary) ||
    values.bossCounterScore >= values.earlyExpansionCounterScore ||
    values.bst >= values.legendaryCatchMinBst;
  scoreParts.score -= runValue ? 8 : values.challengeNonShinyEarlyPenalty;
  scoreParts.reasons.push(runValue ? 'early-run-value' : 'early-non-shiny');
}

function addChallengeCatchStats(
  input: ChallengeCatchScoreInput,
  scoreParts: { score: number; reasons: string[] },
  values: {
    bst: number;
    offense: number;
    speed: number;
    level: number;
    prepAvgLevel: number;
    legendaryCatchMinBst: number;
  },
): void {
  if (input.isMainCarry) {
    scoreParts.score += 78;
    scoreParts.reasons.push('main-carry');
  }
  if (input.isLegendary || values.bst >= values.legendaryCatchMinBst) {
    scoreParts.score += 54;
    scoreParts.reasons.push('legendary-or-high-bst');
  }
  if (values.bst) scoreParts.score += Math.max(0, values.bst - 460) / 5;
  if (values.offense) scoreParts.score += values.offense / 9;
  if (values.speed) scoreParts.score += values.speed / 14;
  if (values.level && values.prepAvgLevel && values.level >= values.prepAvgLevel - 3) {
    scoreParts.score += 18;
    scoreParts.reasons.push('level-ready');
  }
  if (values.level && values.prepAvgLevel && values.level < values.prepAvgLevel - 8) {
    scoreParts.score -= 18;
    scoreParts.reasons.push('level-low');
  }
}

function addChallengeCatchTypeScore(
  scoreParts: { score: number; reasons: string[] },
  types: string[],
  attacks: unknown,
  targetTypes: string[],
  priorityTypeScore: number,
  bst: number,
): void {
  if (targetTypes.length > 0) {
    scoreParts.score += getAttackCoverageScore(attacks, targetTypes) * 4.2;
    scoreParts.score += getDefensiveMatchupScore(types, targetTypes) * 2.8;
    scoreParts.reasons.push('target-matchup');
  }

  scoreParts.score += priorityTypeScore;
  if (priorityTypeScore) scoreParts.reasons.push('priority-types');
  if (types.includes('Fairy')) {
    scoreParts.score += 18;
    scoreParts.reasons.push('fairy');
  }
  if (
    types.includes('Dragon') ||
    types.includes('Fire') ||
    types.includes('Dark') ||
    types.includes('Ghost')
  ) {
    scoreParts.score += 12;
    scoreParts.reasons.push('power-type');
  }
  if (types.includes('Poison') && bst && bst < 500) {
    scoreParts.score -= 14;
    scoreParts.reasons.push('low-bst-poison');
  }
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
  const scoreParts = { score: 0, reasons: [] as string[] };

  if (!input.active) {
    return {
      id: `catch:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { types, bossCounterScore },
    };
  }

  addChallengeShinyScore(input, scoreParts, {
    priorityTypeScore,
    challengeShinyCatchBonus,
    challengeNonShinyEarlyPenalty,
    earlyExpansionCounterScore,
    legendaryCatchMinBst,
    bossCounterScore,
    bst,
  });
  addChallengeCatchStats(input, scoreParts, {
    bst,
    offense,
    speed,
    level,
    prepAvgLevel,
    legendaryCatchMinBst,
  });
  addChallengeCatchTypeScore(scoreParts, types, attacks, targetTypes, priorityTypeScore, bst);

  return {
    id: `catch:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
    score: scoreParts.score,
    reason: scoreParts.reasons.join(',') || 'neutral',
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

function addStoryCatchIdentityScore(
  input: StoryCatchScoreInput,
  scoreParts: { score: number; reasons: string[] },
): void {
  if (input.needsTeam) {
    scoreParts.score += 34;
    scoreParts.reasons.push('needs-team');
  }
  if (input.isShiny) {
    scoreParts.score += 18;
    scoreParts.reasons.push('shiny');
  }
  if (input.isLegendary || input.isLegendaryName) {
    scoreParts.score += 70;
    scoreParts.reasons.push('legendary');
  }
  if (input.isMainCarry) {
    scoreParts.score += 55;
    scoreParts.reasons.push('main-carry');
  }
}

function addStoryCatchStats(
  input: StoryCatchScoreInput,
  scoreParts: { score: number; reasons: string[] },
  values: {
    bst: number;
    offense: number;
    speed: number;
    bulk: number;
    storyMinBstTarget: number;
    storyWeakStatPenalty: number;
  },
): void {
  if (values.bst) scoreParts.score += Math.max(0, values.bst - 430) / 3.6;
  if (values.offense) scoreParts.score += values.offense / 7.5;
  if (values.speed) scoreParts.score += values.speed / 12;
  if (values.bulk) scoreParts.score += values.bulk / 42;
  if (values.bst && values.bst < values.storyMinBstTarget && !input.needsTeam) {
    scoreParts.score -= values.storyWeakStatPenalty;
    scoreParts.reasons.push('weak-stats');
  }
}

function addStoryCatchMatchups(
  scoreParts: { score: number; reasons: string[] },
  values: {
    attacks: unknown;
    types: string[];
    currentBossTypes: string[];
    storyCurrentBossCoverageBonus: number;
    leagueCoverageScore: number;
    priorityTypeScore: number;
  },
): void {
  if (values.currentBossTypes.length > 0) {
    scoreParts.score +=
      (getAttackCoverageScore(values.attacks, values.currentBossTypes) *
        values.storyCurrentBossCoverageBonus) /
      5;
    scoreParts.score += getDefensiveMatchupScore(values.types, values.currentBossTypes) * 3;
    scoreParts.reasons.push('current-boss');
  }

  scoreParts.score += values.leagueCoverageScore;
  if (values.leagueCoverageScore) scoreParts.reasons.push('league-coverage');
  scoreParts.score += values.priorityTypeScore;
  if (values.priorityTypeScore) scoreParts.reasons.push('priority-types');
}

function addStoryDuplicatePenalty(
  input: StoryCatchScoreInput,
  scoreParts: { score: number; reasons: string[] },
  values: { duplicateCount: number; bst: number; legendaryCatchMinBst: number },
): void {
  if (
    values.duplicateCount <= 0 ||
    input.isLegendary ||
    input.isMainCarry ||
    values.bst >= values.legendaryCatchMinBst
  ) {
    return;
  }
  scoreParts.score -= input.needsCoverage ? 24 : 42;
  scoreParts.reasons.push(input.needsCoverage ? 'coverage-duplicate' : 'duplicate');
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
  const scoreParts = { score: 0, reasons: [] as string[] };

  if (!input.active) {
    return {
      id: `catch:story:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { types },
    };
  }

  addStoryCatchIdentityScore(input, scoreParts);
  addStoryCatchStats(input, scoreParts, {
    bst,
    offense,
    speed,
    bulk,
    storyMinBstTarget,
    storyWeakStatPenalty,
  });
  addStoryCatchMatchups(scoreParts, {
    attacks,
    types,
    currentBossTypes,
    storyCurrentBossCoverageBonus,
    leagueCoverageScore,
    priorityTypeScore,
  });
  addStoryDuplicatePenalty(input, scoreParts, {
    duplicateCount,
    bst,
    legendaryCatchMinBst,
  });

  return {
    id: `catch:story:${foldText(input.name || 'unknown') || 'unknown'}`,
    score: scoreParts.score,
    reason: scoreParts.reasons.join(',') || 'neutral',
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
