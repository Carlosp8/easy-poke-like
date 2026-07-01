export { foldText, normalizeItemName } from './text-utils.ts';
export {
  decideCatchDraftAction,
  scoreNewTypeCoverage,
  scoreCatchDraftSignals,
  scoreChallengeCatchBonus,
  scoreStoryCatchBonus,
  scoreStoryLeagueCoverage,
  scoreTraitSynergy,
} from './strategy/catch-scoring.ts';
export {
  getPokemonBaseStatTotal,
  getStatValue,
  parseHpSnapshotFromText,
  parseLevelFromText,
  parseStatsFromTooltips,
  scorePokemonStats,
  scoreTraitPreviewRows,
} from './strategy/card-scoring.ts';
export type {
  CardHpSnapshot,
  PokemonStatsLike,
  TraitPreviewRow,
  TraitPreviewScoreInput,
} from './strategy/card-scoring.ts';
export type {
  CatchDraftDecision,
  CatchDraftDecisionInput,
  CatchDraftInput,
  ChallengeCatchScoreInput,
  StatScoreSnapshot,
  StoryCatchScoreInput,
  StoryLeagueCoverageInput,
  TraitSynergyScoreInput,
  TypeCoverageScoreInput,
} from './strategy/catch-scoring.ts';
export {
  scoreBossRouteNode,
  scoreBotTacticRouteBonus,
  scoreBuffRouteNode,
  scoreCatchRouteNode,
  scoreCenterRouteNode,
  scoreChallengeRouteBonus,
  scoreItemRouteNode,
  scoreLegendaryRouteNode,
  scoreRouteLookahead,
  scoreStoryRouteBonus,
  scoreTrainerRouteNode,
  scoreUnknownRouteNode,
} from './strategy/route-scoring.ts';
export type {
  BossRouteNodeInput,
  BotTacticRouteBonusInput,
  BuffRouteNodeInput,
  CatchRouteNodeInput,
  CenterRouteNodeInput,
  ChallengeRouteBonusInput,
  ItemRouteNodeInput,
  LegendaryRouteNodeInput,
  RouteNode,
  ScoutRouteBalance,
  StoryRouteBonusInput,
  TrainerRouteNodeInput,
  UnknownRouteNodeInput,
} from './strategy/route-scoring.ts';
export { scoreChallengeStarterFit, scoreStoryStarterFit } from './strategy/starter-scoring.ts';
export type { ChallengeStarterFitInput, StoryStarterFitInput } from './strategy/starter-scoring.ts';
export {
  buildPassiveTeamProfileSnapshot,
  detectPassiveTextSignals,
  scoreChallengePassiveCardPurpose,
  scoreGeneralPassiveCardFit,
  scorePassiveTypeContext,
  scoreSinnohPassiveCardPurpose,
  scoreStoryPassiveCardPurpose,
} from './strategy/passive-scoring.ts';
export type {
  ChallengePassiveCardPurposeInput,
  GeneralPassiveCardScoreInput,
  PassiveProfileInput,
  PassiveProfileSnapshot,
  PassiveScoreConfig,
  PassiveTextSignals,
  PassiveTypeContextInput,
  SinnohPassiveCardPurposeInput,
  StoryPassiveCardPurposeInput,
} from './strategy/passive-scoring.ts';
export {
  getItemBoostType,
  hasMatchingAttackForItem,
  isHealingItem,
  isLowValueHeldItem,
  isTypeBoostItemUsefulForTeam,
  scoreChallengeItemBonus,
  scoreHeldItemFit,
  scoreStoryItemBonus,
} from './strategy/item-scoring.ts';
export type {
  ChallengeItemScoreInput,
  ItemMatchOptions,
  ItemNameCollection,
  ItemTypeMatch,
  StoryItemScoreInput,
} from './strategy/item-scoring.ts';
export {
  getChallengeBossPrepTargets,
  getChallengeMapOrdinal,
  getStoryBossPrepTargets,
  getStoryLeagueBossKeys,
  getStoryRegionKeyFromLabels,
} from './strategy/progress-strategy.ts';
export type {
  BossPrepTargetTable,
  ChallengeBossPrepInput,
  StoryBossPrepInput,
  TowerProgressSnapshot,
} from './strategy/progress-strategy.ts';
export {
  getAttackCoverageScore,
  getAttackTypeScoreAgainstDefenders,
  getDefensiveMatchupScore,
  getDefensiveScoreAgainstAttack,
  normalizeTypeList,
  POKELIKE_TYPES,
  scoreCatchBossCounter,
  scorePriorityTypes,
  TYPE_CHART,
} from './type-matchups.ts';
export type {
  PokelikeType,
  PriorityTypeScoreInput,
  TypeChart,
  TypeChartEntry,
} from './type-matchups.ts';
export {
  getAliveTeam,
  getCenterNeedStatus,
  getEarlyCatchAllowance,
  getLeadLevel,
  getProjectedAverageLevelAfterCatch,
  getTeamAverageHP,
  getTeamAverageLevel,
  hasOpenTeamSlot,
  shouldBuildCoreTeam,
  shouldPrioritizeEarlyTraining,
} from './team-utils.ts';
export type {
  BossPrepTargets,
  CenterNeedOptions,
  EarlyCatchAllowanceConfig,
  TrainingPriorityConfig,
} from './team-utils.ts';
