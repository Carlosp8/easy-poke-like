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
