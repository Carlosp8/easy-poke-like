import type { ScoredDecision } from '../../types.d.ts';
import { foldText } from '../text-utils.ts';
import {
  getAttackCoverageScore,
  getDefensiveMatchupScore,
  normalizeTypeList,
} from '../type-matchups.ts';

export interface ChallengeStarterFitInput {
  active?: boolean;
  name?: string;
  types?: unknown;
  attackTypes?: unknown;
  bossTypes?: unknown;
  allowedTypes?: unknown;
  isShiny?: boolean;
  isMainCarry?: boolean;
  isLegendary?: boolean;
  bst?: number;
  priorityTypeScore?: number;
  config?: {
    challengeShinyCatchBonus?: number;
  };
}

export interface StoryStarterFitInput {
  active?: boolean;
  name?: string;
  isShiny?: boolean;
  isMainCarry?: boolean;
  isLegendary?: boolean;
  bst?: number;
  leagueCoverageScore?: number;
  priorityTypeScore?: number;
}

export function scoreChallengeStarterFit(input: ChallengeStarterFitInput): ScoredDecision {
  const types = normalizeTypeList(input.types);
  const attackTypes = normalizeTypeList(input.attackTypes).length > 0 ? input.attackTypes : types;
  const bossTypes = normalizeTypeList(input.bossTypes);
  const allowedTypes = normalizeTypeList(input.allowedTypes);
  const challengeShinyCatchBonus = input.config?.challengeShinyCatchBonus ?? 220;
  const priorityTypeScore = input.priorityTypeScore ?? 0;
  const bst = input.bst ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `starter:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: { types },
    };
  }

  if (input.isShiny) {
    score += challengeShinyCatchBonus + 80;
    reasons.push('shiny');
  }
  if (input.isMainCarry) {
    score += 95;
    reasons.push('main-carry');
  }
  if (input.isLegendary) {
    score += 70;
    reasons.push('legendary');
  }
  if (bst) {
    score += Math.max(0, bst - 450) / 4;
    reasons.push('bst');
  }

  score += priorityTypeScore * 1.2;
  if (priorityTypeScore) reasons.push('priority-types');

  if (allowedTypes.length > 0) {
    const allowed = types.some((type) => allowedTypes.includes(type));
    score += allowed ? 55 : -80;
    reasons.push(allowed ? 'allowed-type' : 'disallowed-type');
  }

  if (bossTypes.length > 0) {
    score += getAttackCoverageScore(attackTypes, bossTypes) * 5;
    score += getDefensiveMatchupScore(types, bossTypes) * 3;
    reasons.push('boss-matchup');
  }

  return {
    id: `starter:challenge:${foldText(input.name || 'unknown') || 'unknown'}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      types,
      attackTypes: normalizeTypeList(attackTypes),
      bossTypes,
      allowedTypes,
      priorityTypeScore,
      bst,
    },
  };
}

export function scoreStoryStarterFit(input: StoryStarterFitInput): ScoredDecision {
  const bst = input.bst ?? 0;
  const leagueCoverageScore = input.leagueCoverageScore ?? 0;
  const priorityTypeScore = input.priorityTypeScore ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (!input.active) {
    return {
      id: `starter:story:${foldText(input.name || 'unknown') || 'unknown'}`,
      score: 0,
      reason: 'inactive',
      details: {},
    };
  }

  if (input.isShiny) {
    score += 18;
    reasons.push('shiny');
  }
  if (input.isLegendary) {
    score += 70;
    reasons.push('legendary');
  }
  if (input.isMainCarry) {
    score += 60;
    reasons.push('main-carry');
  }
  if (bst) {
    score += Math.max(0, bst - 430) / 3.5;
    reasons.push('bst');
  }
  score += leagueCoverageScore;
  if (leagueCoverageScore) reasons.push('league-coverage');
  score += priorityTypeScore;
  if (priorityTypeScore) reasons.push('priority-types');

  return {
    id: `starter:story:${foldText(input.name || 'unknown') || 'unknown'}`,
    score,
    reason: reasons.join(',') || 'neutral',
    details: {
      bst,
      leagueCoverageScore,
      priorityTypeScore,
    },
  };
}
