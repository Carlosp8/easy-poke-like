export type RunMode =
  | 'battleTower'
  | 'story'
  | 'weeklyChallenges'
  | 'challengeMode'
  | 'auto'
  | 'manual';

export type BotTactic =
  | 'auto'
  | 'boss'
  | 'capture'
  | 'shiny'
  | 'xp'
  | 'duplicate';

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
  lockedPokemonKeys: string[];
  panel: {
    x: number;
    y: number;
  };
}

export interface PokemonUnit {
  index?: number;
  name: string;
  level?: number;
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
