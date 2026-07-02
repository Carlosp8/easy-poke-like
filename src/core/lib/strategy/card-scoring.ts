export interface PokemonStatsLike {
  hp?: number;
  atk?: number;
  attack?: number;
  def?: number;
  defense?: number;
  special?: number;
  spa?: number;
  spatk?: number;
  spdef?: number;
  spd?: number;
  speed?: number;
  spe?: number;
}

export interface TraitPreviewRow {
  text?: string;
  className?: string;
  types?: string[];
}

export interface TraitPreviewScoreInput {
  rows?: TraitPreviewRow[];
  traitData?: Record<string, { tier?: string }>;
  traitTierValues?: Record<string, number>;
}

export interface CardHpSnapshot {
  current: number;
  max: number;
  percent: number;
}

export function parseLevelFromText(text: string): number {
  const match = /(?:lv|lvl|nivel|nv\.?)\s*(\d+)/i.exec(text || '');
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function parseHpSnapshotFromText(text: string): CardHpSnapshot | null {
  const hpMatch = /(\d+)\s*\/\s*(\d+)/.exec(text || '');
  if (!hpMatch) return null;
  const current = Number.parseInt(hpMatch[1], 10);
  const max = Number.parseInt(hpMatch[2], 10);
  return {
    current,
    max,
    percent: max > 0 ? Math.round((current / max) * 100) : 0,
  };
}

export function parseStatsFromTooltips(tooltips: string[] = []): PokemonStatsLike {
  const stats: PokemonStatsLike = {};
  (tooltips || []).forEach((tooltip) => {
    const [rawKey = '', rawValue = ''] = (tooltip || '').split(':', 2);
    const valueMatch = /^\s*(\d+)/.exec(rawValue);
    if (!rawKey || !valueMatch) return;
    const key = rawKey
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '');
    const value = Number.parseInt(valueMatch[1], 10);
    if (key === 'hp') stats.hp = value;
    else if (key === 'atk' || key === 'attack') stats.atk = value;
    else if (key === 'def' || key === 'defense') stats.def = value;
    else if (key === 'spa' || key === 'spatk' || key === 'specialattack' || key === 'special') {
      stats.spa = value;
    } else if (key === 'spd' || key === 'spdef' || key === 'specialdefense') stats.spd = value;
    else if (key === 'spe' || key === 'speed') stats.spe = value;
  });
  return stats;
}

export function getStatValue(
  stats: PokemonStatsLike | null | undefined,
  ...keys: string[]
): number {
  if (!stats) return 0;
  for (const key of keys) {
    const value = stats[key as keyof PokemonStatsLike];
    if (Number.isFinite(value)) return value as number;
  }
  return 0;
}

export function getPokemonBaseStatTotal(stats: PokemonStatsLike | null | undefined): number {
  if (!stats) return 0;
  return (
    getStatValue(stats, 'hp') +
    getStatValue(stats, 'atk', 'attack') +
    getStatValue(stats, 'def', 'defense') +
    getStatValue(stats, 'special', 'spa', 'spatk') +
    getStatValue(stats, 'spdef', 'spd') +
    getStatValue(stats, 'speed', 'spe')
  );
}

export function scorePokemonStats(stats: PokemonStatsLike | null | undefined): number {
  if (!stats || Object.keys(stats).length === 0) return 0;
  const offense = Math.max(
    getStatValue(stats, 'atk', 'attack'),
    getStatValue(stats, 'special', 'spa', 'spatk'),
  );
  const speed = getStatValue(stats, 'speed', 'spe');
  const bulk =
    getStatValue(stats, 'hp') +
    getStatValue(stats, 'def', 'defense') +
    getStatValue(stats, 'spdef', 'spd');
  return (offense * 0.35 + speed * 0.25 + bulk * 0.12) / 3;
}

export function scoreTraitPreviewRows(input: TraitPreviewScoreInput = {}): number {
  let score = 0;
  const traitData = input.traitData || {};
  const traitTierValues = input.traitTierValues || {};

  (input.rows || []).forEach((row) => {
    const text = row.text || '';
    if (!text) return;
    if ((row.className || '').includes('up') || text.includes('new') || text.includes('nuevo'))
      score += 12;
    const countMatch = /(\d+)\s*\/\s*(\d+)/.exec(text);
    if (countMatch) {
      const current = Number.parseInt(countMatch[1], 10);
      const needed = Number.parseInt(countMatch[2], 10);
      const missing = needed - current;
      if (missing <= 0) score += 18;
      else if (missing === 1) score += 9;
    }
    (row.types || []).forEach((type) => {
      const traitInfo = traitData[type];
      score += traitInfo ? (traitTierValues[traitInfo.tier || ''] || 1) * 0.8 : 1;
    });
  });

  return score;
}
