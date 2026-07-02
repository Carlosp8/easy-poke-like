import { foldText } from '../text-utils.ts';

export interface TowerProgressSnapshot {
  labelText?: string;
  reward?: number;
  round?: number;
  mapOrdinal?: number | null;
}

export interface BossPrepTargetTable {
  [key: string]: {
    avgLevel: number;
    leadLevel: number;
  };
}

export interface ChallengeBossPrepInput {
  active?: boolean;
  progress?: TowerProgressSnapshot;
  isFinalBoss?: boolean;
  isBigBoss?: boolean;
  isMap2?: boolean;
  reward?: number;
  round?: number;
  opponentName?: string;
  targets?: BossPrepTargetTable;
}

export interface StoryBossPrepInput {
  active?: boolean;
  progress?: TowerProgressSnapshot;
  labels?: string[];
  currentMapKey?: string;
  activeChallengeTarget?: string;
  mapPreference?: string;
  isFinalBoss?: boolean;
  isBigBoss?: boolean;
  isMap2?: boolean;
  reward?: number;
  round?: number;
  opponentName?: string;
  targets?: BossPrepTargetTable;
  leagueFinals?: Record<string, string[]>;
}

export function getChallengeMapOrdinal(progress: TowerProgressSnapshot = {}): number {
  if (progress.mapOrdinal !== null && progress.mapOrdinal !== undefined) return progress.mapOrdinal;
  if ((progress.reward ?? 0) > 0) return Math.max(1, Math.ceil((progress.reward ?? 0) / 100));
  return Math.max(1, progress.round || 1);
}

export function getChallengeBossPrepTargets(input: ChallengeBossPrepInput = {}) {
  if (!input.active) return null;

  const targets = input.targets || {};
  const progress = input.progress || {};
  const mapOrdinal = getChallengeMapOrdinal(progress);
  let key = 'map1';

  if (input.isFinalBoss || (input.reward || 0) >= 400) key = 'final';
  else if (input.isBigBoss || (input.reward || 0) >= 300) key = 'big';
  else if (mapOrdinal >= 5 || (input.round || 1) >= 3) key = 'late';
  else if (mapOrdinal >= 4) key = 'map4';
  else if (mapOrdinal >= 3) key = 'map3';
  else if (mapOrdinal >= 2 || input.isMap2) key = 'map2';

  const target = targets[key] || targets.map1 || null;
  if (!target) return null;
  return {
    avgLevel: target.avgLevel,
    leadLevel: target.leadLevel,
    reason: `challenge-${key}-carry-prep`,
  };
}

export function getStoryRegionKeyFromLabels({
  labels = [],
  currentMapKey = '',
  activeChallengeTarget = '',
  mapPreference = '',
} = {}): string {
  const text = foldText(
    [...(labels || []), currentMapKey, activeChallengeTarget, mapPreference].join(' '),
  );
  const regionAliases = {
    kanto: ['kanto'],
    johto: ['johto'],
    hoenn: ['hoenn'],
    sinnoh: ['sinnoh', 'shinnoh'],
    unova: ['unova', 'teselia'],
  };

  for (const [region, aliases] of Object.entries(regionAliases)) {
    if (aliases.some((alias) => text.includes(alias))) return region;
  }
  return '';
}

export function getStoryLeagueBossKeys(
  region = '',
  leagueFinals: Record<string, string[]> = {},
): string[] {
  if (region && leagueFinals[region]) return leagueFinals[region];
  return [...new Set(Object.values(leagueFinals).flat())];
}

export function getStoryBossPrepTargets(input: StoryBossPrepInput = {}) {
  if (!input.active) return null;

  const targets = input.targets || {};
  const progress = input.progress || {};
  const labelText = progress.labelText || foldText((input.labels || []).join(' '));
  const region = getStoryRegionKeyFromLabels({
    labels: input.labels || [],
    currentMapKey: input.currentMapKey || '',
    activeChallengeTarget: input.activeChallengeTarget || '',
    mapPreference: input.mapPreference || '',
  });
  const leagueKeys = getStoryLeagueBossKeys(region, input.leagueFinals || {}).map(foldText);
  const opponentName = foldText(input.opponentName || '');
  const isLeagueText = Boolean(
    /liga|league|elite|alto mando|champion|campeon|final boss|stage final boss/.exec(labelText),
  );
  const isLeagueBoss = Boolean(opponentName && leagueKeys.includes(opponentName));
  const championKey = leagueKeys.at(-1) || '';
  const isChampion = Boolean(input.isFinalBoss || (opponentName && opponentName === championKey));
  const reward = input.reward || progress.reward || 0;
  const round = input.round || progress.round || 1;

  let key = 'early';
  if (isChampion || reward >= 400) key = 'champion';
  else if (isLeagueText || isLeagueBoss || reward >= 300) key = 'league';
  else if (input.isBigBoss || round >= 3 || reward >= 200) key = 'late';
  else if (input.isMap2 || round >= 2 || reward >= 100) key = 'mid';

  const target = targets[key] || targets.early;
  if (!target) return null;
  return {
    avgLevel: target.avgLevel,
    leadLevel: target.leadLevel,
    reason: `story-${key}-team-prep`,
  };
}
