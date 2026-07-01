import type { MapNodeType, PokemonUnit, ScoredDecision } from '../types.d.ts';

export const POKELIKE_TYPES = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;

export type PokelikeType = (typeof POKELIKE_TYPES)[number];

export interface TypeChartEntry {
  strong: PokelikeType[];
  weak: PokelikeType[];
  immune: PokelikeType[];
}

export type TypeChart = Record<PokelikeType, TypeChartEntry>;

export const TYPE_CHART: TypeChart = {
  Normal: { strong: [], weak: ['Rock', 'Steel'], immune: ['Ghost'] },
  Fire: {
    strong: ['Grass', 'Ice', 'Bug', 'Steel'],
    weak: ['Fire', 'Water', 'Rock', 'Dragon'],
    immune: [],
  },
  Water: { strong: ['Fire', 'Ground', 'Rock'], weak: ['Water', 'Grass', 'Dragon'], immune: [] },
  Electric: {
    strong: ['Water', 'Flying'],
    weak: ['Electric', 'Grass', 'Dragon'],
    immune: ['Ground'],
  },
  Grass: {
    strong: ['Water', 'Ground', 'Rock'],
    weak: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'],
    immune: [],
  },
  Ice: {
    strong: ['Grass', 'Ground', 'Flying', 'Dragon'],
    weak: ['Fire', 'Water', 'Ice', 'Steel'],
    immune: [],
  },
  Fighting: {
    strong: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'],
    weak: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'],
    immune: ['Ghost'],
  },
  Poison: {
    strong: ['Grass', 'Fairy'],
    weak: ['Poison', 'Ground', 'Rock', 'Ghost'],
    immune: ['Steel'],
  },
  Ground: {
    strong: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'],
    weak: ['Grass', 'Bug'],
    immune: ['Flying'],
  },
  Flying: { strong: ['Grass', 'Fighting', 'Bug'], weak: ['Electric', 'Rock', 'Steel'], immune: [] },
  Psychic: { strong: ['Fighting', 'Poison'], weak: ['Psychic', 'Steel'], immune: ['Dark'] },
  Bug: {
    strong: ['Grass', 'Psychic', 'Dark'],
    weak: ['Fire', 'Fighting', 'Poison', 'Flying', 'Ghost', 'Steel', 'Fairy'],
    immune: [],
  },
  Rock: {
    strong: ['Fire', 'Ice', 'Flying', 'Bug'],
    weak: ['Fighting', 'Ground', 'Steel'],
    immune: [],
  },
  Ghost: { strong: ['Psychic', 'Ghost'], weak: ['Dark'], immune: ['Normal'] },
  Dragon: { strong: ['Dragon'], weak: ['Steel'], immune: ['Fairy'] },
  Dark: { strong: ['Psychic', 'Ghost'], weak: ['Fighting', 'Dark', 'Fairy'], immune: [] },
  Steel: {
    strong: ['Ice', 'Rock', 'Fairy'],
    weak: ['Fire', 'Water', 'Electric', 'Steel'],
    immune: [],
  },
  Fairy: { strong: ['Fighting', 'Dragon', 'Dark'], weak: ['Fire', 'Poison', 'Steel'], immune: [] },
};

const TYPE_SET = new Set<string>(POKELIKE_TYPES);
const LOW_VALUE_HELD_ITEMS = new Set([
  'lagging tail',
  'kings rock',
  "king's rock",
  'eviolite',
  'focus band',
  'focus sash',
  'air balloon',
]);
const HEALING_ITEMS = new Set(['leftovers', 'shell bell', 'sitrus berry', 'oran berry']);
const TYPE_BOOST_ITEMS = new Map<string, PokelikeType>([
  ['black belt', 'Fighting'],
  ['black glasses', 'Dark'],
  ['charcoal', 'Fire'],
  ['magnet', 'Electric'],
  ['hard stone', 'Rock'],
  ['dragon fang', 'Dragon'],
  ['metal coat', 'Steel'],
  ['silk scarf', 'Normal'],
  ['pixie plate', 'Fairy'],
  ['miracle seed', 'Grass'],
  ['mystic water', 'Water'],
  ['never melt ice', 'Ice'],
  ['never-melt ice', 'Ice'],
  ['poison barb', 'Poison'],
  ['sharp beak', 'Flying'],
  ['silver powder', 'Bug'],
  ['soft sand', 'Ground'],
  ['spell tag', 'Ghost'],
  ['twisted spoon', 'Psychic'],
]);

export type ItemNameCollection = Iterable<string> & {
  has?: (_value: string) => boolean;
};

export type ItemTypeMatch =
  ReadonlyMap<string, PokelikeType | string> | Record<string, PokelikeType | string>;

export interface ItemMatchOptions {
  itemTypeMatch?: ItemTypeMatch;
  getAttackTypes?: (_unit: PokemonUnit) => unknown;
}

export interface EarlyCatchAllowanceConfig {
  coreTeamSize?: number;
  optionalTeamSize?: number;
  exceptionalScore?: number;
  minAcceptScore?: number;
}

export interface TrainingPriorityConfig {
  coreTeamSize?: number;
  optionalTeamSize?: number;
}

export interface BossPrepTargets {
  avgLevel: number;
  leadLevel: number;
  reason?: string;
}

export interface CenterNeedOptions {
  criticalHpThreshold?: number;
  lowHpThreshold?: number;
  fullHpAvgThreshold?: number;
  almostFullHpAvgThreshold?: number;
  lowestHpThreshold?: number;
  carrySafeHpThreshold?: number;
  carrySkipAvgHpThreshold?: number;
  carrySkipLowestHpThreshold?: number;
  strongCarryScoreThreshold?: number;
  primaryCarry?: PokemonUnit | null;
  prepStatus?: {
    avgDeficit?: number;
    leadDeficit?: number;
  } | null;
  hasOpponentProfile?: boolean;
  carryBossScore?: number;
  carryPowerScore?: number;
  isMainCarry?: boolean;
}

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

export interface PriorityTypeScoreInput {
  types?: unknown;
  priorityTypes?: string[];
  minRank?: number;
  weight?: number;
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

export interface ChallengeItemScoreInput {
  active?: boolean;
  itemName?: unknown;
  isLowValue?: boolean;
  isUsable?: boolean;
  faintedCount?: number;
  prepPressure?: number;
  hasCarry?: boolean;
  carryLevel?: number;
  carryHeldItem?: unknown;
  carryNeedsItem?: boolean;
  needsCarryBuff?: boolean;
  underleveled?: boolean;
  moveTier?: number;
  carryNewScore?: number;
  carryOldScore?: number;
  isMainCarryPreferredItem?: boolean;
  isSustainItem?: boolean;
  isOffenseItem?: boolean;
  isUtilityItem?: boolean;
  boostType?: string | null;
  carryMatchesBoost?: boolean;
  config?: {
    challengeCarryMoveTierTarget?: number;
  };
}

export interface StoryItemScoreInput {
  active?: boolean;
  itemName?: unknown;
  isLowValue?: boolean;
  isUsable?: boolean;
  hasFainted?: boolean;
  prepPressure?: number;
  hasCarry?: boolean;
  carryNewScore?: number;
  carryOldScore?: number;
  boostType?: string | null;
  carryMatchesBoost?: boolean;
}

export function foldText(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeItemName(
  name: unknown,
  translations: Record<string, string> = {},
): string {
  if (!name) return '';
  const clean = String(name).toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (translations[clean]) return translations[clean];

  const folded = foldText(clean);
  if (translations[folded]) return translations[folded];

  return folded
    .replace(/['`]/g, "'")
    .replace(/[^a-z0-9'+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTypeList(types: unknown): PokelikeType[] {
  const list = Array.isArray(types) ? types : types ? [types] : [];
  return [
    ...new Set(
      list.filter((type): type is PokelikeType => typeof type === 'string' && TYPE_SET.has(type)),
    ),
  ];
}

export function scorePriorityTypes(input: PriorityTypeScoreInput = {}): ScoredDecision {
  const priority = input.priorityTypes ?? [];
  const minRank = input.minRank ?? 4;
  const weight = input.weight ?? 1;
  const types = normalizeTypeList(input.types);
  const scoredTypes: string[] = [];

  const score = types.reduce((sum, type) => {
    const index = priority.indexOf(type);
    if (index < 0) return sum;
    scoredTypes.push(type);
    return sum + Math.max(minRank, priority.length - index) * weight;
  }, 0);

  return {
    id: 'priority-types',
    score,
    reason: scoredTypes.length > 0 ? scoredTypes.join(',') : 'none',
    details: {
      types,
      scoredTypes,
      minRank,
      weight,
    },
  };
}

function getPokemonHpPercent(unit: PokemonUnit | null | undefined): number {
  if (!unit) return 0;
  if (typeof unit.hp === 'number' && Number.isFinite(unit.hp)) {
    return Math.max(0, Math.min(100, unit.hp));
  }
  if (typeof unit.hpPercent === 'number' && Number.isFinite(unit.hpPercent)) {
    return Math.max(0, Math.min(100, unit.hpPercent));
  }
  if (
    typeof unit.currentHp === 'number' &&
    typeof unit.maxHp === 'number' &&
    Number.isFinite(unit.currentHp) &&
    Number.isFinite(unit.maxHp) &&
    unit.maxHp > 0
  ) {
    return Math.round((unit.currentHp / unit.maxHp) * 100);
  }
  return 100;
}

export function getAliveTeam(team: PokemonUnit[] = []): PokemonUnit[] {
  return (team || []).filter((unit) => !unit?.isFainted);
}

export function getTeamAverageHP(team: PokemonUnit[] = []): number {
  const alive = getAliveTeam(team);
  if (alive.length === 0) return 0;
  return alive.reduce((sum, unit) => sum + getPokemonHpPercent(unit), 0) / alive.length;
}

export function hasOpenTeamSlot(team: PokemonUnit[] = [], targetSize = 6): boolean {
  return (team || []).length < targetSize;
}

export function getTeamAverageLevel(team: PokemonUnit[] = []): number {
  const leveled = getAliveTeam(team).filter((unit) => (unit.level || 0) > 0);
  if (leveled.length === 0) return 0;
  return leveled.reduce((sum, unit) => sum + (unit.level || 0), 0) / leveled.length;
}

export function getLeadLevel(team: PokemonUnit[] = []): number {
  const lead = getAliveTeam(team)[0];
  return lead ? lead.level || 0 : 0;
}

export function shouldBuildCoreTeam(team: PokemonUnit[] = [], coreTeamSize = 2): boolean {
  return getAliveTeam(team).length < coreTeamSize;
}

export function shouldPrioritizeEarlyTraining(
  team: PokemonUnit[] = [],
  targets: BossPrepTargets,
  config: TrainingPriorityConfig = {},
): boolean {
  const coreTeamSize = config.coreTeamSize ?? 2;
  const optionalTeamSize = config.optionalTeamSize ?? 4;
  const aliveCount = getAliveTeam(team).length;
  if (aliveCount < coreTeamSize) return false;

  const avgLevel = getTeamAverageLevel(team);
  const leadLevel = getLeadLevel(team);
  if (avgLevel === 0 && leadLevel === 0) {
    return aliveCount >= optionalTeamSize;
  }

  return avgLevel < targets.avgLevel || leadLevel < targets.leadLevel;
}

export function getProjectedAverageLevelAfterCatch(
  team: PokemonUnit[] = [],
  candidateLevel: number,
): number | null {
  const leveled = getAliveTeam(team).filter((unit) => (unit.level || 0) > 0);
  if (!Number.isFinite(candidateLevel) || candidateLevel <= 0 || leveled.length === 0) {
    return null;
  }

  const total = leveled.reduce((sum, unit) => sum + (unit.level || 0), 0) + candidateLevel;
  return total / (leveled.length + 1);
}

export function getEarlyCatchAllowance(
  team: PokemonUnit[] = [],
  score = 0,
  isShiny = false,
  config: EarlyCatchAllowanceConfig = {},
): 'core' | 'exceptional' | 'optional' | 'skip' {
  const coreTeamSize = config.coreTeamSize ?? 2;
  const optionalTeamSize = config.optionalTeamSize ?? 4;
  const exceptionalScore = config.exceptionalScore ?? 42;
  const minAcceptScore = config.minAcceptScore ?? 18;
  const aliveCount = getAliveTeam(team).length;

  if (aliveCount < coreTeamSize) return 'core';
  if (isShiny || score >= exceptionalScore) return 'exceptional';
  if (aliveCount < optionalTeamSize && score >= minAcceptScore) return 'optional';
  return 'skip';
}

export function getCenterNeedStatus(team: PokemonUnit[] = [], options: CenterNeedOptions = {}) {
  const alive = getAliveTeam(team);
  const avgHP = getTeamAverageHP(team);
  const lowestHP =
    alive.length > 0 ? Math.min(...alive.map((unit) => getPokemonHpPercent(unit))) : 0;
  const hasFainted = (team || []).some((unit) => unit?.isFainted);
  const lowHpThreshold = options.lowHpThreshold ?? 50;
  const criticalHpThreshold = options.criticalHpThreshold ?? 30;
  const lowHPCount = alive.filter((unit) => getPokemonHpPercent(unit) < lowHpThreshold).length;
  const criticalHPCount = alive.filter(
    (unit) => getPokemonHpPercent(unit) < criticalHpThreshold,
  ).length;
  const fullEnough =
    alive.length > 0 &&
    avgHP >= (options.fullHpAvgThreshold ?? 92) &&
    lowestHP >= (options.lowestHpThreshold ?? 70);
  const almostFull =
    alive.length > 0 &&
    avgHP >= (options.almostFullHpAvgThreshold ?? 82) &&
    lowestHP >= (options.lowestHpThreshold ?? 70) &&
    lowHPCount === 0;
  const primaryCarry = options.primaryCarry ?? alive[0] ?? null;
  const carryHP = primaryCarry ? getPokemonHpPercent(primaryCarry) : 0;
  const avgDeficit = Math.max(0, options.prepStatus?.avgDeficit ?? 0);
  const leadDeficit = Math.max(0, options.prepStatus?.leadDeficit ?? 0);
  const prepPressure = avgDeficit + leadDeficit;
  const carryBossScore = options.carryBossScore ?? 0;
  const carryPowerScore = options.carryPowerScore ?? 0;
  const strongCarryScoreThreshold = options.strongCarryScoreThreshold ?? 260;
  const carryOverpowersBoss = Boolean(
    primaryCarry &&
    !primaryCarry.isFainted &&
    leadDeficit <= 0 &&
    (avgDeficit <= 3 ||
      !options.hasOpponentProfile ||
      carryBossScore >= strongCarryScoreThreshold ||
      carryPowerScore >= strongCarryScoreThreshold ||
      options.isMainCarry),
  );
  const healthyCarryCanSkip = Boolean(
    carryOverpowersBoss &&
    carryHP >= (options.carrySafeHpThreshold ?? 72) &&
    avgHP >= (options.carrySkipAvgHpThreshold ?? 78) &&
    lowestHP >= (options.carrySkipLowestHpThreshold ?? 55) &&
    lowHPCount <= 1,
  );

  return {
    avgHP,
    lowestHP,
    hasFainted,
    lowHPCount,
    criticalHPCount,
    fullEnough,
    almostFull,
    healthyCarryCanSkip,
    carry: primaryCarry ? primaryCarry.name : null,
    carryHP,
    carryBossScore,
    prepPressure,
    canSkipCenter:
      !hasFainted && criticalHPCount === 0 && (fullEnough || almostFull || healthyCarryCanSkip),
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

function normalizedCollectionHas(items: ItemNameCollection, itemName: unknown): boolean {
  const normalizedItem = normalizeItemName(itemName);
  if (!normalizedItem) return false;

  if (items.has?.(normalizedItem)) return true;
  for (const item of items) {
    if (normalizeItemName(item) === normalizedItem) return true;
  }
  return false;
}

function isItemTypeMatchMap(
  itemTypeMatch: ItemTypeMatch,
): itemTypeMatch is ReadonlyMap<string, PokelikeType | string> {
  const maybeMap = itemTypeMatch as { get?: unknown; entries?: unknown };
  return typeof maybeMap.get === 'function' && typeof maybeMap.entries === 'function';
}

function getItemTypeMatchValue(itemName: unknown, itemTypeMatch: ItemTypeMatch): unknown {
  const normalizedItem = normalizeItemName(itemName);
  if (!normalizedItem) return null;

  if (isItemTypeMatchMap(itemTypeMatch)) {
    const directValue = itemTypeMatch.get(normalizedItem);
    if (directValue) return directValue;
    for (const [key, value] of itemTypeMatch.entries()) {
      if (normalizeItemName(key) === normalizedItem) return value;
    }
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(itemTypeMatch, normalizedItem)) {
    return itemTypeMatch[normalizedItem];
  }
  for (const [key, value] of Object.entries(itemTypeMatch)) {
    if (normalizeItemName(key) === normalizedItem) return value;
  }
  return null;
}

export function isLowValueHeldItem(
  itemName: unknown,
  lowValueItems: ItemNameCollection = LOW_VALUE_HELD_ITEMS,
): boolean {
  return normalizedCollectionHas(lowValueItems, itemName);
}

export function isHealingItem(
  itemName: unknown,
  healingItems: ItemNameCollection = HEALING_ITEMS,
): boolean {
  return normalizedCollectionHas(healingItems, itemName);
}

export function getItemBoostType(
  itemName: unknown,
  itemTypeMatch: ItemTypeMatch = TYPE_BOOST_ITEMS,
): PokelikeType | null {
  const [boostType] = normalizeTypeList(getItemTypeMatchValue(itemName, itemTypeMatch));
  return boostType ?? null;
}

export function hasMatchingAttackForItem(
  unit: PokemonUnit | null | undefined,
  itemName: unknown,
  options: ItemMatchOptions = {},
): boolean {
  if (!unit) return false;

  const matchingType = getItemBoostType(itemName, options.itemTypeMatch);
  if (!matchingType) return false;

  const attackTypeSource =
    options.getAttackTypes?.(unit) ??
    (unit.attackTypes && unit.attackTypes.length > 0 ? unit.attackTypes : unit.types);

  return normalizeTypeList(attackTypeSource).includes(matchingType);
}

export function isTypeBoostItemUsefulForTeam(
  itemName: unknown,
  team: PokemonUnit[] = [],
  options: ItemMatchOptions = {},
): boolean {
  const matchingType = getItemBoostType(itemName, options.itemTypeMatch);
  if (!matchingType) return true;
  return team.some((unit) => !unit?.isFainted && hasMatchingAttackForItem(unit, itemName, options));
}

export function getAttackTypeScoreAgainstDefenders(
  attackType: unknown,
  defenderTypes: unknown,
  typeChart = TYPE_CHART,
): number {
  const [normalizedAttackType] = normalizeTypeList(attackType);
  if (!normalizedAttackType) return 0;

  const chart = typeChart[normalizedAttackType];
  if (!chart) return 0;

  return normalizeTypeList(defenderTypes).reduce((score, defenderType) => {
    if (chart.immune.includes(defenderType)) return score - 12;
    if (chart.strong.includes(defenderType)) return score + 5;
    if (chart.weak.includes(defenderType)) return score - 3;
    return score;
  }, 0);
}

export function getAttackCoverageScore(
  attackerTypes: unknown,
  defenderTypes: unknown,
  typeChart = TYPE_CHART,
): number {
  const attacks = normalizeTypeList(attackerTypes);
  const defenders = normalizeTypeList(defenderTypes);
  if (attacks.length === 0 || defenders.length === 0) return 0;
  return Math.max(
    ...attacks.map((attackType) =>
      getAttackTypeScoreAgainstDefenders(attackType, defenders, typeChart),
    ),
  );
}

export function getDefensiveScoreAgainstAttack(
  defenderTypes: unknown,
  attackType: unknown,
  typeChart = TYPE_CHART,
): number {
  const [normalizedAttackType] = normalizeTypeList(attackType);
  if (!normalizedAttackType) return 0;

  const chart = typeChart[normalizedAttackType];
  if (!chart) return 0;

  return normalizeTypeList(defenderTypes).reduce((score, defenderType) => {
    if (chart.immune.includes(defenderType)) return score + 8;
    if (chart.strong.includes(defenderType)) return score - 4;
    if (chart.weak.includes(defenderType)) return score + 2;
    return score;
  }, 0);
}

export function getDefensiveMatchupScore(
  defenderTypes: unknown,
  attackerTypes: unknown,
  typeChart = TYPE_CHART,
): number {
  const attacks = normalizeTypeList(attackerTypes);
  if (attacks.length === 0) return 0;
  return Math.min(
    ...attacks.map((attackType) =>
      getDefensiveScoreAgainstAttack(defenderTypes, attackType, typeChart),
    ),
  );
}

export function scoreCatchBossCounter(
  candidateTypes: unknown,
  attackTypes: unknown,
  bossTypes: unknown,
): number {
  const targetTypes = normalizeTypeList(bossTypes);
  if (targetTypes.length === 0) return 0;
  const attacks = normalizeTypeList(attackTypes).length > 0 ? attackTypes : candidateTypes;
  return (
    getAttackCoverageScore(attacks, targetTypes) * 2.5 +
    getDefensiveMatchupScore(candidateTypes, targetTypes) * 2
  );
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

export function scoreChallengeItemBonus(input: ChallengeItemScoreInput): ScoredDecision {
  const itemName = normalizeItemName(input.itemName);
  const prepPressure = input.prepPressure ?? 0;
  const faintedCount = input.faintedCount ?? 0;
  const moveTier = input.moveTier ?? -1;
  const challengeCarryMoveTierTarget = input.config?.challengeCarryMoveTierTarget ?? 2;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active || !itemName) {
    return {
      id: `item:challenge:${itemName || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { item: itemName },
    };
  }

  if (input.isLowValue) {
    return {
      id: `item:challenge:${itemName}`,
      score: -220,
      reason: 'low-value',
      details: { item: itemName },
    };
  }

  if (itemName === 'sacred ash') {
    score = faintedCount > 0 ? 160 + faintedCount * 50 : -40;
    return {
      id: `item:challenge:${itemName}`,
      score,
      reason: faintedCount > 0 ? 'revive-fainted' : 'no-fainted',
      details: { item: itemName, faintedCount },
    };
  }

  if (itemName === 'rare candy') {
    score += 320 + prepPressure * 30;
    if (input.hasCarry) score += 120 + Math.max(0, 85 - (input.carryLevel || 85)) / 1.8;
    if (input.underleveled || input.needsCarryBuff) score += 90;
    reasons.push('rare-candy');
    if (input.underleveled) reasons.push('underleveled');
    if (input.needsCarryBuff) reasons.push('carry-buff');
    return {
      id: `item:challenge:${itemName}`,
      score,
      reason: reasons.join(','),
      details: { item: itemName, prepPressure, carryLevel: input.carryLevel ?? null },
    };
  }

  if (itemName === 'tm normal') {
    score += 170;
    if (input.needsCarryBuff) score += 130;
    if (moveTier >= challengeCarryMoveTierTarget) score -= 80;
    reasons.push('tm');
    if (input.needsCarryBuff) reasons.push('carry-buff');
    if (moveTier >= challengeCarryMoveTierTarget) reasons.push('move-tier-met');
    return {
      id: `item:challenge:${itemName}`,
      score,
      reason: reasons.join(','),
      details: { item: itemName, moveTier },
    };
  }

  if (itemName === 'moon stone') {
    score += 165;
    if (input.hasCarry) score += 45 + Math.max(0, 70 - (input.carryLevel || 70)) / 3;
    return {
      id: `item:challenge:${itemName}`,
      score,
      reason: 'moon-stone',
      details: { item: itemName, carryLevel: input.carryLevel ?? null },
    };
  }

  if (!input.hasCarry || input.isUsable) {
    return {
      id: `item:challenge:${itemName}`,
      score,
      reason: input.hasCarry ? 'usable' : 'no-carry',
      details: { item: itemName },
    };
  }

  const improvement = (input.carryNewScore ?? 0) - (input.carryOldScore ?? 0);

  if (input.isMainCarryPreferredItem) {
    score += 260;
    reasons.push('preferred-carry-item');
  }
  if (input.isSustainItem) {
    score += 120;
    reasons.push('sustain');
  }
  if (input.isOffenseItem) {
    score += 105;
    reasons.push('offense');
  }
  if (input.isUtilityItem) {
    score += 70;
    reasons.push('utility');
  }
  if (input.carryNeedsItem) {
    score += 90;
    reasons.push('carry-needs-item');
  }
  if (!normalizeItemName(input.carryHeldItem)) {
    score += 80;
    reasons.push('empty-slot');
  }
  if (improvement > 0) {
    score += improvement * 1.45;
    reasons.push('improvement');
  } else if (input.carryNeedsItem && input.isMainCarryPreferredItem) {
    score += 40;
    reasons.push('preferred-rescue');
  }

  if (input.boostType) {
    score += input.carryMatchesBoost ? 85 : -110;
    reasons.push(input.carryMatchesBoost ? 'matching-boost' : 'mismatched-boost');
  }

  return {
    id: `item:challenge:${itemName}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      item: itemName,
      prepPressure,
      improvement,
      boostType: input.boostType ?? null,
    },
  };
}

export function scoreStoryItemBonus(input: StoryItemScoreInput): ScoredDecision {
  const itemName = normalizeItemName(input.itemName);
  const prepPressure = input.prepPressure ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active || !itemName) {
    return {
      id: `item:story:${itemName || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { item: itemName },
    };
  }

  if (input.isLowValue) {
    return {
      id: `item:story:${itemName}`,
      score: -180,
      reason: 'low-value',
      details: { item: itemName },
    };
  }

  if (itemName === 'rare candy') {
    score += 260 + prepPressure * 24;
    reasons.push('rare-candy');
  }
  if (itemName === 'tm normal') {
    score += 120;
    reasons.push('tm');
  }
  if (itemName === 'moon stone') {
    score += 135 + prepPressure * 10;
    reasons.push('moon-stone');
  }
  if (itemName === 'sacred ash') {
    score += input.hasFainted ? 130 : -30;
    reasons.push(input.hasFainted ? 'revive-fainted' : 'no-fainted');
  }
  if (
    ['leftovers', 'shell bell', 'choice band', 'choice specs', 'life orb', 'lucky egg'].includes(
      itemName,
    )
  ) {
    score += 105;
    reasons.push('premium-held');
  }
  if (['expert belt', 'loaded dice', 'power bracer', 'choice scarf'].includes(itemName)) {
    score += 60;
    reasons.push('utility-held');
  }

  if (input.hasCarry && !input.isUsable) {
    if (input.boostType) {
      score += input.carryMatchesBoost ? 48 : -55;
      reasons.push(input.carryMatchesBoost ? 'matching-boost' : 'mismatched-boost');
    }
    const improvement = (input.carryNewScore ?? 0) - (input.carryOldScore ?? 0);
    if ((input.carryNewScore ?? 0) > (input.carryOldScore ?? 0) + 8) {
      score += 55 + improvement;
      reasons.push('improvement');
    }
  }

  return {
    id: `item:story:${itemName}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      item: itemName,
      prepPressure,
      boostType: input.boostType ?? null,
      improvement: (input.carryNewScore ?? 0) - (input.carryOldScore ?? 0),
    },
  };
}

export function scoreHeldItemFit(unit: PokemonUnit, itemName: string): ScoredDecision {
  const normalizedItem = normalizeItemName(itemName);
  let score = 0;
  const reasons: string[] = [];

  if (isLowValueHeldItem(normalizedItem)) {
    score -= 50;
    reasons.push('low-value');
  }
  if (isHealingItem(normalizedItem)) {
    score += unit.isFainted ? 0 : 35;
    reasons.push('sustain');
  }

  const boostType = getItemBoostType(normalizedItem);
  const attackTypes = normalizeTypeList(unit.attackTypes?.length ? unit.attackTypes : unit.types);
  if (hasMatchingAttackForItem(unit, normalizedItem)) {
    score += 45;
    reasons.push('matching-attack-type');
  }

  return {
    id: `${foldText(unit.name)}:${normalizedItem}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      item: normalizedItem,
      boostType: boostType ?? null,
      attackTypes,
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
