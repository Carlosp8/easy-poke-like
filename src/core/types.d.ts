export type RunMode =
  'battleTower' | 'story' | 'weeklyChallenges' | 'challengeMode' | 'auto' | 'manual';

export type BotTactic = 'auto' | 'boss' | 'capture' | 'shiny' | 'xp' | 'duplicate';

export type StarterMode = 'auto' | 'preferred' | 'manual';

export interface BotControlState {
  paused: boolean;
  collapsed: boolean;
  tactic: BotTactic;
  runMode: RunMode;
  mapPreference: string;
  mainCarryKey: string;
  starterMode: StarterMode;
  starterPreference: string;
  autoRestart: boolean;
  lockedKeys: string[];
  duplicateCatches: boolean;
  panel: {
    x: number;
    y: number;
  };
}

export interface PokemonUnit {
  index?: number;
  name: string;
  level?: number;
  hp?: number;
  hpPercent?: number;
  currentHp?: number;
  maxHp?: number;
  isFainted?: boolean;
  isShiny?: boolean;
  types?: string[];
  attackTypes?: string[];
  heldItem?: string;
}

export type MapNodeType =
  | 'start'
  | 'battle'
  | 'catch'
  | 'item'
  | 'question'
  | 'boss'
  | 'pokecenter'
  | 'trainer'
  | 'legendary'
  | 'move_tutor'
  | 'trade'
  | 'silver'
  | 'magma'
  | 'aqua'
  | 'unknown';

export interface MapNode {
  index: number;
  layer?: number;
  type: MapNodeType;
  element?: Element;
  score?: number;
}

export interface RuntimeState {
  lastLoggedState: string;
  stuckCounter: number;
  currentMapKey: string;
  capturesThisMap: number;
  activeAutoRunMode: RunMode | null;
  activeChallengeContext: unknown;
  engineStats: EngineStats;
}

export interface EngineStats {
  loops: number;
  screens: Record<string, number>;
  catches: number;
  items: number;
  swaps: number;
  rerolls: number;
}

export interface ScoredDecision<TDetails = Record<string, unknown>> {
  id: string;
  score: number;
  reason: string;
  details: TDetails;
}

export interface OpponentProfile {
  name: string;
  leadTypes: string[];
  teamTypes: string[];
  sourceConfidence: string;
}

export interface RunProgressSnapshot {
  at: string;
  reason: string;
  screen: string;
  labels: string[];
  mapKey: string;
  capturesThisMap: number;
  teamSize: number;
  aliveCount: number;
  avgHP: number;
  avgLevel: number;
  leadLevel: number;
  opponent: OpponentProfile | null;
  bossPrep: unknown;
  team: PokemonUnit[];
}

export interface GeneratedBundleMeta {
  sourceBundle: string;
  sourcePath: string;
  sha256: string;
  extractedAt: string;
  counts: {
    pokedex: number;
    moves: number;
    items: number;
    passives: number;
    challenges: number;
    nodeTypes: number;
  };
  warnings: string[];
}
