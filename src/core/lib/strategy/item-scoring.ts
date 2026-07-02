import type { PokemonUnit, ScoredDecision } from '../../types.d.ts';
import { foldText, normalizeItemName } from '../text-utils.ts';
import { normalizeTypeList } from '../type-matchups.ts';
import type { PokelikeType } from '../type-matchups.ts';

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

export type ItemTypeMatch = ReadonlyMap<string, unknown> | Record<string, unknown>;

export interface ItemMatchOptions {
  itemTypeMatch?: ItemTypeMatch;
  getAttackTypes?: (_unit: PokemonUnit) => unknown;
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

function inactiveItemDecision(prefix: string, itemName: string): ScoredDecision {
  return {
    id: `${prefix}:${itemName || 'unknown'}`,
    score: 0,
    reason: 'inactive',
    details: { item: itemName },
  };
}

function lowValueItemDecision(prefix: string, itemName: string, score: number): ScoredDecision {
  return {
    id: `${prefix}:${itemName}`,
    score,
    reason: 'low-value',
    details: { item: itemName },
  };
}

function scoreChallengeSacredAsh(itemName: string, faintedCount: number): ScoredDecision {
  const score = faintedCount > 0 ? 160 + faintedCount * 50 : -40;
  return {
    id: `item:challenge:${itemName}`,
    score,
    reason: faintedCount > 0 ? 'revive-fainted' : 'no-fainted',
    details: { item: itemName, faintedCount },
  };
}

function scoreChallengeRareCandy(
  input: ChallengeItemScoreInput,
  itemName: string,
  prepPressure: number,
): ScoredDecision {
  const reasons: string[] = ['rare-candy'];
  let score = 320 + prepPressure * 30;
  if (input.hasCarry) score += 120 + Math.max(0, 85 - (input.carryLevel || 85)) / 1.8;
  if (input.underleveled || input.needsCarryBuff) score += 90;
  if (input.underleveled) reasons.push('underleveled');
  if (input.needsCarryBuff) reasons.push('carry-buff');
  return {
    id: `item:challenge:${itemName}`,
    score,
    reason: reasons.join(','),
    details: { item: itemName, prepPressure, carryLevel: input.carryLevel ?? null },
  };
}

function scoreChallengeTm(
  input: ChallengeItemScoreInput,
  itemName: string,
  moveTier: number,
  challengeCarryMoveTierTarget: number,
): ScoredDecision {
  const reasons: string[] = ['tm'];
  let score = 170;
  if (input.needsCarryBuff) {
    score += 130;
    reasons.push('carry-buff');
  }
  if (moveTier >= challengeCarryMoveTierTarget) {
    score -= 80;
    reasons.push('move-tier-met');
  }
  return {
    id: `item:challenge:${itemName}`,
    score,
    reason: reasons.join(','),
    details: { item: itemName, moveTier },
  };
}

function scoreChallengeMoonStone(input: ChallengeItemScoreInput, itemName: string): ScoredDecision {
  let score = 165;
  if (input.hasCarry) score += 45 + Math.max(0, 70 - (input.carryLevel || 70)) / 3;
  return {
    id: `item:challenge:${itemName}`,
    score,
    reason: 'moon-stone',
    details: { item: itemName, carryLevel: input.carryLevel ?? null },
  };
}

function scoreChallengeSpecialItem(
  input: ChallengeItemScoreInput,
  itemName: string,
  prepPressure: number,
  faintedCount: number,
  moveTier: number,
  challengeCarryMoveTierTarget: number,
): ScoredDecision | null {
  if (itemName === 'sacred ash') return scoreChallengeSacredAsh(itemName, faintedCount);
  if (itemName === 'rare candy') return scoreChallengeRareCandy(input, itemName, prepPressure);
  if (itemName === 'tm normal') {
    return scoreChallengeTm(input, itemName, moveTier, challengeCarryMoveTierTarget);
  }
  if (itemName === 'moon stone') return scoreChallengeMoonStone(input, itemName);
  return null;
}

function scoreChallengeCarryItem(
  input: ChallengeItemScoreInput,
  itemName: string,
  prepPressure: number,
): ScoredDecision {
  const improvement = (input.carryNewScore ?? 0) - (input.carryOldScore ?? 0);
  const reasons: string[] = [];
  let score = 0;

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
): itemTypeMatch is ReadonlyMap<string, unknown> {
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

  if (Object.hasOwn(itemTypeMatch, normalizedItem)) {
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

export function scoreChallengeItemBonus(input: ChallengeItemScoreInput): ScoredDecision {
  const itemName = normalizeItemName(input.itemName);
  const prepPressure = input.prepPressure ?? 0;
  const faintedCount = input.faintedCount ?? 0;
  const moveTier = input.moveTier ?? -1;
  const challengeCarryMoveTierTarget = input.config?.challengeCarryMoveTierTarget ?? 2;

  if (!input.active || !itemName) {
    return inactiveItemDecision('item:challenge', itemName);
  }

  if (input.isLowValue) {
    return lowValueItemDecision('item:challenge', itemName, -220);
  }

  const specialItem = scoreChallengeSpecialItem(
    input,
    itemName,
    prepPressure,
    faintedCount,
    moveTier,
    challengeCarryMoveTierTarget,
  );
  if (specialItem) return specialItem;

  if (!input.hasCarry || input.isUsable) {
    return {
      id: `item:challenge:${itemName}`,
      score: 0,
      reason: input.hasCarry ? 'usable' : 'no-carry',
      details: { item: itemName },
    };
  }

  return scoreChallengeCarryItem(input, itemName, prepPressure);
}

function getStoryBaseItemScore(input: StoryItemScoreInput, itemName: string, prepPressure: number) {
  const reasons: string[] = [];
  let score = 0;
  const simpleRules: Array<[boolean, number, string]> = [
    [itemName === 'rare candy', 260 + prepPressure * 24, 'rare-candy'],
    [itemName === 'tm normal', 120, 'tm'],
    [itemName === 'moon stone', 135 + prepPressure * 10, 'moon-stone'],
    [
      itemName === 'sacred ash',
      input.hasFainted ? 130 : -30,
      input.hasFainted ? 'revive-fainted' : 'no-fainted',
    ],
    [
      ['leftovers', 'shell bell', 'choice band', 'choice specs', 'life orb', 'lucky egg'].includes(
        itemName,
      ),
      105,
      'premium-held',
    ],
    [
      ['expert belt', 'loaded dice', 'power bracer', 'choice scarf'].includes(itemName),
      60,
      'utility-held',
    ],
  ];

  simpleRules.forEach(([applies, value, reason]) => {
    if (!applies) return;
    score += value;
    reasons.push(reason);
  });
  return { score, reasons };
}

function addStoryCarryItemScore(
  input: StoryItemScoreInput,
  scoreParts: { score: number; reasons: string[] },
): void {
  if (!input.hasCarry || input.isUsable) return;

  if (input.boostType) {
    scoreParts.score += input.carryMatchesBoost ? 48 : -55;
    scoreParts.reasons.push(input.carryMatchesBoost ? 'matching-boost' : 'mismatched-boost');
  }
  const improvement = (input.carryNewScore ?? 0) - (input.carryOldScore ?? 0);
  if ((input.carryNewScore ?? 0) > (input.carryOldScore ?? 0) + 8) {
    scoreParts.score += 55 + improvement;
    scoreParts.reasons.push('improvement');
  }
}

export function scoreStoryItemBonus(input: StoryItemScoreInput): ScoredDecision {
  const itemName = normalizeItemName(input.itemName);
  const prepPressure = input.prepPressure ?? 0;

  if (!input.active || !itemName) {
    return inactiveItemDecision('item:story', itemName);
  }

  if (input.isLowValue) {
    return lowValueItemDecision('item:story', itemName, -180);
  }

  const scoreParts = getStoryBaseItemScore(input, itemName, prepPressure);
  addStoryCarryItemScore(input, scoreParts);

  return {
    id: `item:story:${itemName}`,
    score: scoreParts.score,
    reason: scoreParts.reasons.join(',') || 'neutral',
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
