import type { ScoredDecision } from '../../types.d.ts';
import { foldText } from '../text-utils.ts';
import {
  getAttackCoverageScore,
  getDefensiveMatchupScore,
  normalizeTypeList,
} from '../type-matchups.ts';

export interface PassiveTextSignals {
  isSustain?: boolean;
  isSurvival?: boolean;
  isDamage?: boolean;
  isSpeed?: boolean;
  isScaling?: boolean;
  isMultiHit?: boolean;
  isCrit?: boolean;
  isExecute?: boolean;
  isDistinctTypes?: boolean;
  lowersOffense?: boolean;
  raisesDefense?: boolean;
  mentionsShiny?: boolean;
  mentionsItem?: boolean;
}

export interface PassiveScoreConfig {
  passiveShinyCardBonus?: number;
  passiveWeakCoreScalingBonus?: number;
  passiveWeakCoreSurvivalBonus?: number;
  passiveShinyTypeBonus?: number;
  passiveStrongCarryTypeBonus?: number;
  passiveBossCounterBonus?: number;
  passiveUncoveredBossTypeBonus?: number;
  passiveOffTeamTypePenalty?: number;
  challengeCarryBuffNodeBonus?: number;
}

export interface TraitInfo {
  tier?: string;
}

export interface PassiveProfileSnapshot {
  bestBst?: number;
  primaryBst?: number;
  hasLegendary?: boolean;
  hasMainCarry?: boolean;
  hasShiny?: boolean;
  hasStrongCarry?: boolean;
  weakCore?: boolean;
  underleveled?: boolean;
  bossCoveragePoor?: boolean;
  shinyTypes?: unknown;
  primaryTypes?: unknown;
  bossTypes?: unknown;
  uncoveredBossTypes?: unknown;
}

export interface PassiveProfileInput {
  alive?: Array<{
    isShiny?: boolean;
    types?: unknown;
  }>;
  primary?: {
    types?: unknown;
    attackTypes?: unknown;
  } | null;
  bestBst?: number;
  primaryBst?: number;
  hasLegendary?: boolean;
  hasMainCarry?: boolean;
  bossTypes?: unknown;
  teamAttackTypes?: unknown;
  trainingPriority?: boolean;
  prepDeficit?: number;
  weakCoreBstThreshold?: number;
  strongCarryBstThreshold?: number;
}

export interface PassiveTypeContextInput {
  passiveTypes?: unknown;
  traitCounts?: Record<string, number>;
  traitTierValues?: Record<string, number>;
  traitData?: Record<string, TraitInfo>;
  profile?: PassiveProfileSnapshot;
  teamUserTypes?: unknown;
  config?: PassiveScoreConfig;
}

export interface StoryPassiveCardPurposeInput {
  active?: boolean;
  passiveTypes?: unknown;
  signals?: PassiveTextSignals;
  priorityTypeScore?: number;
}

export interface SinnohPassiveCardPurposeInput {
  active?: boolean;
  passiveTypes?: unknown;
  signals?: PassiveTextSignals;
  typeScore?: number;
}

export interface ChallengePassiveCardPurposeInput {
  active?: boolean;
  passiveTypes?: unknown;
  signals?: PassiveTextSignals;
  isShinyPassive?: boolean;
  hasShiny?: boolean;
  underleveled?: boolean;
  carryNeedsItem?: boolean;
  carryTypes?: unknown;
  traitCounts?: Record<string, number>;
  bossTypes?: unknown;
  priorityTypeScore?: number;
  config?: PassiveScoreConfig;
}

export interface GeneralPassiveCardScoreInput {
  passiveTypes?: unknown;
  signals?: PassiveTextSignals;
  isShinyPassive?: boolean;
  avgHP?: number;
  hasCarry?: boolean;
  teamTypeCount?: number;
  traitCounts?: Record<string, number>;
  traitTierValues?: Record<string, number>;
  traitData?: Record<string, TraitInfo>;
  profile?: PassiveProfileSnapshot;
  teamUserTypes?: unknown;
  config?: PassiveScoreConfig;
}

export function buildPassiveTeamProfileSnapshot(
  input: PassiveProfileInput = {},
): PassiveProfileSnapshot {
  const alive = input.alive || [];
  const bossTypes = normalizeTypeList(input.bossTypes);
  const teamAttackTypes = normalizeTypeList(input.teamAttackTypes);
  const shinyTypes = normalizeTypeList(
    alive.filter((unit) => unit?.isShiny).flatMap((unit) => normalizeTypeList(unit.types)),
  );
  const primaryTypes = normalizeTypeList([
    ...normalizeTypeList(input.primary?.types),
    ...normalizeTypeList(input.primary?.attackTypes),
  ]);
  const bestBst = input.bestBst ?? 0;
  const primaryBst = input.primaryBst ?? 0;
  const hasLegendary = Boolean(input.hasLegendary);
  const hasMainCarry = Boolean(input.hasMainCarry);
  const weakCoreBstThreshold = input.weakCoreBstThreshold ?? 500;
  const strongCarryBstThreshold = input.strongCarryBstThreshold ?? 540;
  const uncoveredBossTypes = bossTypes.filter(
    (type) => getAttackCoverageScore(teamAttackTypes, [type]) <= 0,
  );
  const bossAttackScore =
    bossTypes.length > 0 ? getAttackCoverageScore(teamAttackTypes, bossTypes) : 0;
  const weakCore = Boolean(
    alive.length > 0 &&
    !hasLegendary &&
    !hasMainCarry &&
    (!bestBst || bestBst < weakCoreBstThreshold),
  );

  return {
    bestBst,
    primaryBst,
    hasLegendary,
    hasMainCarry,
    hasShiny: shinyTypes.length > 0,
    hasStrongCarry: hasLegendary || hasMainCarry || primaryBst >= strongCarryBstThreshold,
    weakCore,
    underleveled: Boolean(input.trainingPriority || (input.prepDeficit ?? 0) > 0),
    shinyTypes,
    primaryTypes,
    bossTypes,
    uncoveredBossTypes,
    bossCoveragePoor:
      bossTypes.length > 0 &&
      (uncoveredBossTypes.length > 0 || bossAttackScore < bossTypes.length * 2.5),
  };
}

export function detectPassiveTextSignals(text: string): PassiveTextSignals {
  const folded = foldText(text);
  const has = (pattern: RegExp) => pattern.exec(folded) !== null;
  return {
    isSustain: has(/heal|restore|drain|lifesteal|cur|recuper|dren/),
    isSurvival: has(/survive|sturdy|revive|faint|ko|resist|defen|shield|escudo/),
    isDamage: has(/damage|dano|power|move|ataque|golpe|boost|aument/),
    isSpeed: has(/speed|first|lead|priority|velocidad|primero/),
    isScaling: has(/level|lvl|xp|experiencia|nivel|evol|growth|crec/),
    isMultiHit: has(/extra attack|double|twice|ataque extra|doble/),
    isCrit: has(/crit|critical|critico/),
    isExecute: has(/execute|remata|ejecut/),
    isDistinctTypes: has(/distinct|different|cada tipo|tipos distintos/),
    lowersOffense: Boolean(
      has(/lower|reduce|decrease|drop|debuff|baj|reduc|dismin|resta/) &&
      has(/atk|attack|ataque|sp\.?\s*atk|special attack|ataque especial|ofens/),
    ),
    raisesDefense: has(/def|defense|defensa|sp\.?\s*def|resist|shield|escudo|armor|armadura/),
    mentionsShiny: has(/shiny|variocolor|brillante/),
    mentionsItem: has(/item|held|equip|objeto|sujeto/),
  };
}

export function scoreStoryPassiveCardPurpose(input: StoryPassiveCardPurposeInput): ScoredDecision {
  if (!input.active) {
    return {
      id: 'passive:story',
      score: 0,
      reason: 'inactive',
      details: {},
    };
  }

  const signals = input.signals || {};
  const reasons: string[] = ['story'];
  let score = 16;

  if (signals.isDamage || signals.isMultiHit || signals.isCrit) {
    score += 28;
    reasons.push('damage');
  }
  if (signals.isSpeed) {
    score += 22;
    reasons.push('speed');
  }
  if (signals.isSustain || signals.isSurvival) {
    score += 20;
    reasons.push('sustain');
  }
  if (signals.isScaling) {
    score += 18;
    reasons.push('scaling');
  }

  const priorityTypeScore = input.priorityTypeScore ?? 0;
  score += priorityTypeScore * 0.4;
  if (priorityTypeScore) reasons.push('priority-types');

  return {
    id: 'passive:story',
    score,
    reason: reasons.join(','),
    details: {
      passiveTypes: normalizeTypeList(input.passiveTypes),
      priorityTypeScore,
    },
  };
}

export function scoreSinnohPassiveCardPurpose(
  input: SinnohPassiveCardPurposeInput,
): ScoredDecision {
  if (!input.active) {
    return {
      id: 'passive:sinnoh',
      score: 0,
      reason: 'inactive',
      details: {},
    };
  }

  const types = normalizeTypeList(input.passiveTypes);
  const signals = input.signals || {};
  const reasons: string[] = [];
  let score = input.typeScore ?? 0;
  if (score) reasons.push('type-plan');

  if (signals.isSpeed) {
    score += 54;
    reasons.push('speed');
  }
  if (signals.lowersOffense) {
    score += 58;
    reasons.push('offense-control');
  }
  if (signals.isSurvival || signals.raisesDefense) {
    score += 36;
    reasons.push('survival');
  }
  if (signals.isDamage && types.includes('Dragon')) score += 22;
  if (types.includes('Rock') && (signals.raisesDefense || signals.isSurvival)) score += 32;
  if (types.includes('Water') && signals.lowersOffense) score += 34;
  if (types.includes('Fairy') && signals.lowersOffense) score += 22;
  if (types.includes('Flying') && signals.isSpeed) score += 20;
  if (
    types.length === 0 &&
    !(signals.isSpeed || signals.lowersOffense || signals.raisesDefense || signals.isSurvival)
  ) {
    score -= 14;
    reasons.push('no-clear-purpose');
  }

  return {
    id: 'passive:sinnoh',
    score,
    reason: reasons.join(',') || 'neutral',
    details: { passiveTypes: types },
  };
}

export function scoreChallengePassiveCardPurpose(
  input: ChallengePassiveCardPurposeInput,
): ScoredDecision {
  if (!input.active) {
    return {
      id: 'passive:challenge',
      score: 0,
      reason: 'inactive',
      details: {},
    };
  }

  const types = normalizeTypeList(input.passiveTypes);
  const carryTypes = normalizeTypeList(input.carryTypes);
  const bossTypes = normalizeTypeList(input.bossTypes);
  const traitCounts = input.traitCounts || {};
  const signals = input.signals || {};
  const challengeCarryBuffNodeBonus = input.config?.challengeCarryBuffNodeBonus ?? 980;
  const reasons: string[] = ['challenge'];
  let score = 0;

  if (input.isShinyPassive) {
    score += input.hasShiny ? 48 : 96;
    reasons.push('shiny');
  }
  if (signals.isDamage || signals.isMultiHit || signals.isCrit) {
    score += 42;
    reasons.push('damage');
  }
  if (signals.isSpeed) {
    score += 44;
    reasons.push('speed');
  }
  if (signals.isSustain || signals.isSurvival || signals.raisesDefense || signals.lowersOffense) {
    score += 36;
    reasons.push('survival-control');
  }
  if (signals.isScaling) {
    score += input.underleveled ? 44 : 18;
    reasons.push('scaling');
  }
  if (input.carryNeedsItem && signals.mentionsItem) {
    score += 38;
    reasons.push('carry-item');
  }

  types.forEach((type) => {
    if (carryTypes.includes(type)) score += challengeCarryBuffNodeBonus / 28;
    const count = traitCounts[type] || 0;
    const nextThreshold = getNextTraitThreshold(count);
    if (nextThreshold && count + (input.isShinyPassive ? 2 : 1) >= nextThreshold) score += 20;
    if (bossTypes.length > 0 && getAttackCoverageScore([type], bossTypes) > 0) score += 28;
    if (bossTypes.length > 0 && getDefensiveMatchupScore([type], bossTypes) > 0) score += 12;
  });

  const priorityTypeScore = input.priorityTypeScore ?? 0;
  score += priorityTypeScore;
  if (priorityTypeScore) reasons.push('priority-types');

  if (
    types.length === 0 &&
    !(
      signals.isDamage ||
      signals.isSpeed ||
      signals.isSustain ||
      signals.isSurvival ||
      signals.isScaling ||
      signals.raisesDefense ||
      signals.lowersOffense
    )
  ) {
    score -= 18;
    reasons.push('no-clear-purpose');
  }

  return {
    id: 'passive:challenge',
    score,
    reason: reasons.join(','),
    details: { passiveTypes: types, bossTypes, priorityTypeScore },
  };
}

function scoreSinglePassiveTypeContext(input: {
  type: string;
  traitCounts: Record<string, number>;
  profile: PassiveProfileSnapshot;
  shinyTypes: string[];
  primaryTypes: string[];
  bossTypes: string[];
  uncoveredBossTypes: string[];
  teamUserTypes: string[];
  config: Required<
    Pick<
      PassiveScoreConfig,
      | 'passiveShinyTypeBonus'
      | 'passiveStrongCarryTypeBonus'
      | 'passiveBossCounterBonus'
      | 'passiveUncoveredBossTypeBonus'
      | 'passiveOffTeamTypePenalty'
    >
  >;
}): RouteScoreParts {
  const reasons: string[] = [];
  let score = 0;
  const hasTeamUser =
    input.teamUserTypes.includes(input.type) || (input.traitCounts[input.type] || 0) > 0;
  const typeBossScore =
    input.bossTypes.length > 0 ? getAttackCoverageScore([input.type], input.bossTypes) : 0;
  const coversUncoveredBossType = input.uncoveredBossTypes.some(
    (bossType) => getAttackCoverageScore([input.type], [bossType]) > 0,
  );

  if (input.shinyTypes.includes(input.type)) {
    score += input.config.passiveShinyTypeBonus + (input.traitCounts[input.type] || 0) * 3;
    reasons.push('shiny-type');
  }
  if (input.primaryTypes.includes(input.type) && input.profile.hasStrongCarry) {
    score += input.config.passiveStrongCarryTypeBonus;
    reasons.push('carry-type');
  }
  if (typeBossScore > 0) {
    score += Math.min(42, input.config.passiveBossCounterBonus + typeBossScore * 5);
    reasons.push('boss-counter');
    if (coversUncoveredBossType) score += input.config.passiveUncoveredBossTypeBonus;
    if (!hasTeamUser) score -= input.config.passiveOffTeamTypePenalty;
  } else if (!hasTeamUser) {
    score -= input.config.passiveOffTeamTypePenalty;
    reasons.push('off-team-type');
  }

  if (input.profile.weakCore && hasTeamUser && typeBossScore > 0) {
    score += 10;
    reasons.push('weak-core-counter');
  }

  return { score, reasons };
}

export function scorePassiveTypeContext(input: PassiveTypeContextInput): ScoredDecision {
  const passiveTypes = normalizeTypeList(input.passiveTypes);
  const traitCounts = input.traitCounts || {};
  const profile = input.profile || {};
  const shinyTypes = normalizeTypeList(profile.shinyTypes);
  const primaryTypes = normalizeTypeList(profile.primaryTypes);
  const bossTypes = normalizeTypeList(profile.bossTypes);
  const uncoveredBossTypes = normalizeTypeList(profile.uncoveredBossTypes);
  const teamUserTypes = normalizeTypeList(input.teamUserTypes);
  const passiveShinyTypeBonus = input.config?.passiveShinyTypeBonus ?? 20;
  const passiveStrongCarryTypeBonus = input.config?.passiveStrongCarryTypeBonus ?? 18;
  const passiveBossCounterBonus = input.config?.passiveBossCounterBonus ?? 26;
  const passiveUncoveredBossTypeBonus = input.config?.passiveUncoveredBossTypeBonus ?? 22;
  const passiveOffTeamTypePenalty = input.config?.passiveOffTeamTypePenalty ?? 14;
  const reasons: string[] = [];
  let score = 0;

  passiveTypes.forEach((type) => {
    const typeScore = scoreSinglePassiveTypeContext({
      type,
      traitCounts,
      profile,
      shinyTypes,
      primaryTypes,
      bossTypes,
      uncoveredBossTypes,
      teamUserTypes,
      config: {
        passiveShinyTypeBonus,
        passiveStrongCarryTypeBonus,
        passiveBossCounterBonus,
        passiveUncoveredBossTypeBonus,
        passiveOffTeamTypePenalty,
      },
    });
    score += typeScore.score;
    reasons.push(...typeScore.reasons);
  });

  return {
    id: 'passive:type-context',
    score,
    reason: reasons.join(',') || 'neutral',
    details: { passiveTypes },
  };
}

interface RouteScoreParts {
  score: number;
  reasons: string[];
}

function addGeneralPassiveSignalScore(
  input: GeneralPassiveCardScoreInput,
  parts: RouteScoreParts,
  signals: PassiveTextSignals,
  traitCounts: Record<string, number>,
  passiveTypes: string[],
): void {
  if (signals.isSustain) parts.score += (input.avgHP ?? 100) < 70 ? 38 : 22;
  if (signals.isCrit) parts.score += 18 + (traitCounts.Dark || 0) * 8;
  if (signals.isSurvival) parts.score += 26;
  if (signals.isDamage) parts.score += 18;
  if (signals.isSpeed) parts.score += 14;
  if (signals.isScaling) parts.score += 18 + (traitCounts.Bug || 0) * 7;
  if (signals.isDistinctTypes) parts.score += (input.teamTypeCount || 0) * 7;
  if (signals.isMultiHit) parts.score += 18 + (traitCounts.Electric || 0) * 7;
  if (signals.isExecute) parts.score += 16 + (traitCounts.Ghost || 0) * 8;
  if (input.hasCarry && signals.isSustain) parts.score += 18;
  if (input.hasCarry && passiveTypes.includes('Grass')) {
    parts.score += 18 + (traitCounts.Grass || 0) * 6;
  }
}

function addGeneralPassiveProfileScore(
  profile: PassiveProfileSnapshot,
  parts: RouteScoreParts,
  signals: PassiveTextSignals,
  passiveTypes: string[],
  config: Required<
    Pick<PassiveScoreConfig, 'passiveWeakCoreScalingBonus' | 'passiveWeakCoreSurvivalBonus'>
  >,
): void {
  if (profile.weakCore) {
    if (signals.isScaling) parts.score += config.passiveWeakCoreScalingBonus;
    if (signals.isSustain || signals.isSurvival) parts.score += config.passiveWeakCoreSurvivalBonus;
    if (signals.isDamage || signals.isMultiHit || signals.isCrit) parts.score += 12;
    if (
      passiveTypes.length === 0 &&
      profile.bossCoveragePoor &&
      (signals.isDamage || signals.isSustain || signals.isSurvival || signals.isScaling)
    ) {
      parts.score += 10;
    }
    return;
  }

  if (
    profile.hasStrongCarry &&
    (signals.isSustain || signals.isSpeed || signals.isDamage || signals.isMultiHit)
  ) {
    parts.score += 8;
  }
}

function addGeneralPassiveTypeScore(
  parts: RouteScoreParts,
  passiveTypes: string[],
  traitCounts: Record<string, number>,
  traitData: Record<string, TraitInfo>,
  traitTierValues: Record<string, number>,
): void {
  passiveTypes.forEach((type) => {
    const count = traitCounts[type] || 0;
    const traitInfo = traitData[type];
    const tierValue = traitInfo ? traitTierValues[traitInfo.tier || ''] || 1 : 1;
    parts.score += count > 0 ? count * 12 + tierValue : -6;
  });
}

export function scoreGeneralPassiveCardFit(input: GeneralPassiveCardScoreInput): ScoredDecision {
  const passiveTypes = normalizeTypeList(input.passiveTypes);
  const signals = input.signals || {};
  const traitCounts = input.traitCounts || {};
  const profile = input.profile || {};
  const traitData = input.traitData || {};
  const traitTierValues = input.traitTierValues || {};
  const passiveShinyCardBonus = input.config?.passiveShinyCardBonus ?? 70;
  const passiveWeakCoreScalingBonus = input.config?.passiveWeakCoreScalingBonus ?? 28;
  const passiveWeakCoreSurvivalBonus = input.config?.passiveWeakCoreSurvivalBonus ?? 20;
  const reasons: string[] = ['baseline'];
  const parts = { score: 35, reasons };

  if (input.isShinyPassive) {
    parts.score += passiveShinyCardBonus + (profile.hasShiny ? 18 : 0);
    reasons.push('shiny-passive');
  }
  if (profile.hasShiny && signals.mentionsShiny) parts.score += 22;
  addGeneralPassiveSignalScore(input, parts, signals, traitCounts, passiveTypes);
  addGeneralPassiveProfileScore(profile, parts, signals, passiveTypes, {
    passiveWeakCoreScalingBonus,
    passiveWeakCoreSurvivalBonus,
  });
  if (profile.underleveled && signals.isScaling) parts.score += 16;
  if (profile.bossCoveragePoor && (signals.isSurvival || signals.isSustain)) parts.score += 8;
  addGeneralPassiveTypeScore(parts, passiveTypes, traitCounts, traitData, traitTierValues);

  parts.score += scorePassiveTypeContext({
    passiveTypes,
    traitCounts,
    traitTierValues,
    traitData,
    profile,
    teamUserTypes: input.teamUserTypes,
    config: input.config,
  }).score;

  return {
    id: 'passive:general',
    score: parts.score,
    reason: reasons.join(','),
    details: { passiveTypes },
  };
}

function getNextTraitThreshold(count: number): number {
  if ((count || 0) < 2) return 2;
  if ((count || 0) < 4) return 4;
  if ((count || 0) < 6) return 6;
  return 0;
}
