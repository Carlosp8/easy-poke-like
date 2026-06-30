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
  ['miracle seed', 'Grass'],
  ['mystic water', 'Water'],
  ['never melt ice', 'Ice'],
  ['poison barb', 'Poison'],
  ['sharp beak', 'Flying'],
  ['silver powder', 'Bug'],
  ['soft sand', 'Ground'],
  ['spell tag', 'Ghost'],
  ['twisted spoon', 'Psychic'],
]);

export function foldText(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeItemName(name: unknown): string {
  return foldText(name)
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

  if (LOW_VALUE_HELD_ITEMS.has(normalizedItem)) {
    score -= 50;
    reasons.push('low-value');
  }
  if (HEALING_ITEMS.has(normalizedItem)) {
    score += unit.isFainted ? 0 : 35;
    reasons.push('sustain');
  }

  const boostType = TYPE_BOOST_ITEMS.get(normalizedItem);
  const attackTypes = normalizeTypeList(unit.attackTypes?.length ? unit.attackTypes : unit.types);
  if (boostType && attackTypes.includes(boostType)) {
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
