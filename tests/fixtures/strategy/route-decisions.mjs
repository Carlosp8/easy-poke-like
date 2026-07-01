export const routeDecisionConfig = {
  criticalHpThreshold: 30,
  lowHpThreshold: 50,
  centerHealthyPathPenalty: 1450,
  centerStrongCarryPathPenalty: 1250,
  centerAlmostHealthyPathPenalty: 850,
  centerCarrySkipAvgHpThreshold: 78,
  earlyOptionalTeamSize: 4,
  bossLevelPressureCatchPenalty: 120,
  bossLevelPressureItemPenalty: 170,
  bossLevelPressureTrainerBonus: 150,
  bossLevelPressureBuffBonus: 52,
  sinnohCatchNodePenalty: 1150,
  sinnohGrassNodePenalty: 900,
  sinnohTrainingCoreTeamSize: 2,
  sinnohItemNodeBonus: 2600,
  sinnohTmNodeBonus: 3200,
  sinnohTrainerNodeBonus: 3600,
  sinnohBuffNodeBonus: 1050,
  sinnohOffenseBuffNodeBonus: 1200,
  legendaryNodeBaseScore: 3600,
  legendaryNodeRouteBonus: 2400,
  legendaryNodeReadyBonus: 900,
  legendaryNodeLowHpPenalty: 2600,
  legendaryNodeMaxUnderlevelPenalty: 1400,
  legendaryNodeUnderlevelPenalty: 850,
};

export const centerRouteCases = {
  revivesFaintedTeam: {
    avgHP: 72,
    hasFainted: true,
    lowHPCount: 0,
    bossLevelPressure: 0,
    config: routeDecisionConfig,
  },
  avoidsHealthyCenter: {
    avgHP: 96,
    hasFainted: false,
    lowHPCount: 0,
    bossLevelPressure: 0,
    centerNeed: { fullEnough: true },
    config: routeDecisionConfig,
  },
  discountsHealthyBossPressure: {
    avgHP: 84,
    hasFainted: false,
    lowHPCount: 0,
    bossLevelPressure: 3,
    centerNeed: {},
    config: routeDecisionConfig,
  },
};

export const catchRouteCases = {
  buildsCoreTeam: {
    nodeType: 'catch',
    buildingCoreTeam: true,
    openTeamSlot: true,
    aliveCount: 1,
    config: routeDecisionConfig,
  },
  penalizesTrainingPressure: {
    nodeType: 'catch',
    earlyLevelingPriority: true,
    bossLevelPressure: 2,
    prepPressure: 2,
    aliveCount: 4,
    config: routeDecisionConfig,
  },
  sinnohTrainingDeprioritizesCatch: {
    nodeType: 'catch',
    openTeamSlot: true,
    sinnohTrainingActive: true,
    aliveCount: 2,
    config: routeDecisionConfig,
  },
  shinyGrassScoutWithCaptureCap: {
    nodeType: 'grass',
    shinyRoute: {
      tacticActive: true,
      mustTrain: false,
      needsTraining: false,
      safeToScout: true,
    },
    openTeamSlot: false,
    captureCapReached: true,
    duplicateRouteScore: 100,
    aliveCount: 4,
    config: routeDecisionConfig,
  },
};

export const itemRouteCases = {
  prefersCarryHealingItem: {
    carryNeedsHealingItem: true,
    bossLevelPressure: 4,
    config: routeDecisionConfig,
  },
  penalizesGenericItemUnderBossPressure: {
    bossLevelPressure: 2,
    config: routeDecisionConfig,
  },
  prioritizesSinnohTmItem: {
    sinnohTrainingActive: true,
    sinnohNeedsTm: true,
    config: routeDecisionConfig,
  },
};

export const trainerRouteCases = {
  rewardsSinnohLevelingFight: {
    avgHP: 82,
    matchupScore: 90,
    earlyLevelingPriority: true,
    prepPressure: 2,
    bossLevelPressure: 2,
    sinnohTrainingActive: true,
    config: routeDecisionConfig,
  },
  discountsLowHpLeadWithoutItem: {
    avgHP: 42,
    matchupScore: 60,
    leadNeedsItem: true,
    config: routeDecisionConfig,
  },
};

export const bossRouteCases = {
  rewardsReadyBoss: {
    avgHP: 84,
    leadMatchupScore: 120,
    prep: { avgDeficit: 0, leadDeficit: 0, ready: true },
    config: routeDecisionConfig,
  },
  penalizesUnderpreparedBoss: {
    avgHP: 84,
    leadMatchupScore: 80,
    leadNeedsItem: true,
    earlyLevelingPriority: true,
    prep: { avgDeficit: 2, leadDeficit: 3, ready: false },
    config: routeDecisionConfig,
  },
};

export const buffRouteCases = {
  rewardsSinnohOffenseBuff: {
    earlyLevelingPriority: true,
    prepPressure: 2,
    bossLevelPressure: 2,
    sinnohTrainingActive: true,
    sinnohNeedsOffense: true,
    config: routeDecisionConfig,
  },
  baselineBuff: {
    config: routeDecisionConfig,
  },
};

export const legendaryRouteCases = {
  readyMainCarry: {
    avgHP: 88,
    hasFainted: false,
    aliveCount: 4,
    leadCarryScore: 300,
    leadHasItem: true,
    leadIsMainCarry: true,
    leadHasHealingItem: true,
    leadHp: 90,
    prep: { avgDeficit: 0, leadDeficit: 0, ready: true },
    config: routeDecisionConfig,
  },
  riskyUnderleveledTeam: {
    avgHP: 42,
    hasFainted: true,
    aliveCount: 2,
    leadCarryScore: 100,
    leadHasItem: false,
    leadIsMainCarry: false,
    leadHasHealingItem: false,
    leadHp: 40,
    prep: { avgDeficit: 2, leadDeficit: 1, ready: false },
    config: routeDecisionConfig,
  },
};

export const unknownRouteCases = {
  normalUnknown: {},
  shinyMustTrain: {
    shinyRoute: { tacticActive: true, mustTrain: true },
    prepPressure: 2,
    bossLevelPressure: 2,
  },
  shinyScoutAtCaptureCap: {
    shinyRoute: { tacticActive: true, mustTrain: false, needsTraining: false },
    captureCapReached: true,
    bossLevelPressure: 1,
  },
};
