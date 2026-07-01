import type { PokemonUnit } from '../types.d.ts';

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
