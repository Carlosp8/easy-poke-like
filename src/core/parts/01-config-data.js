    // ║                    ⚙️ CONFIGURATION                         ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Core configuration and static knowledge tables.
    const CONFIG = {
        // --- Timing ---
        LOOP_SPEED_MS: 1000,
        DRAG_SETTLE_MS: 300,

        // --- HP Thresholds ---
        CRITICAL_HP_THRESHOLD: 30,
        LOW_HP_THRESHOLD: 50,

        // --- Early Battle Tower economy ---
        // Avoid filling all 6 slots before the first boss, but do build enough bench to survive boss bursts.
        EARLY_CORE_TEAM_SIZE: 2,
        EARLY_OPTIONAL_TEAM_SIZE: 4,
        EARLY_BOSS_MIN_AVG_LEVEL: 13,
        EARLY_BOSS_MIN_LEAD_LEVEL: 15,
        R1_MAP2_MIN_AVG_LEVEL: 28,
        R1_MAP2_MIN_LEAD_LEVEL: 32,
        EARLY_MAP2_MIN_AVG_LEVEL: 20,
        EARLY_MAP2_MIN_LEAD_LEVEL: 22,
        EARLY_BIG_BOSS_MIN_AVG_LEVEL: 36,
        EARLY_BIG_BOSS_MIN_LEAD_LEVEL: 40,
        R2_MAP1_MIN_AVG_LEVEL: 42,
        R2_MAP1_MIN_LEAD_LEVEL: 46,
        R2_MAP2_MIN_AVG_LEVEL: 52,
        R2_MAP2_MIN_LEAD_LEVEL: 56,
        R2_BIG_BOSS_MIN_AVG_LEVEL: 60,
        R2_BIG_BOSS_MIN_LEAD_LEVEL: 65,
        R3_MAP1_MIN_AVG_LEVEL: 66,
        R3_MAP1_MIN_LEAD_LEVEL: 70,
        R3_MAP2_MIN_AVG_LEVEL: 76,
        R3_MAP2_MIN_LEAD_LEVEL: 82,
        R3_BIG_BOSS_MIN_AVG_LEVEL: 84,
        R3_BIG_BOSS_MIN_LEAD_LEVEL: 90,
        EARLY_EXCEPTIONAL_CATCH_SCORE: 42,
        EARLY_EXPANSION_COUNTER_SCORE: 12,
        EARLY_MAX_CATCH_AVG_LEVEL_DROP: 2.5,
        EARLY_LOW_LEVEL_SWAP_GAP: 5,
        CATCH_REROLL_MIN_ACCEPT_SCORE: 18,
        CATCH_REROLL_ALWAYS_BELOW_SCORE: 22,
        CATCH_REROLL_MAX_ATTEMPTS_PER_STATE: 1,
        CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER: 2,
        CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER: 5,
        CATCH_REROLL_PROTECT_SCORE: 34,
        CATCH_REROLL_XP_FOCUS_SCORE: 24,
        CATCH_REROLL_COOLDOWN_MS: 900,
        EARLY_SHINY_REROLL_MAP_COUNT: 3,
        EARLY_SHINY_REROLL_ATTEMPTS: 5,
        EARLY_NON_SHINY_MIN_ACCEPT_SCORE: 38,
        SETTLED_CATCH_MIN_ACCEPT_SCORE: 32,
        SHINY_TACTIC_NEW_SHINY_BONUS: 180,
        SHINY_TACTIC_OWNED_SHINY_BONUS: 70,
        SHINY_TACTIC_NON_SHINY_PENALTY: 26,
        SHINY_TACTIC_RUN_VALUE_BONUS_CAP: 30,
        SHINY_TACTIC_SCOUT_PRESSURE_LIMIT: 2,
        SHINY_TACTIC_BALANCED_SCOUT_PRESSURE_LIMIT: 8,
        SHINY_TACTIC_TRAINING_PRESSURE_LIMIT: 12,
        SHINY_TACTIC_ROUTE_FUTURE_WEIGHT: 0.72,
        SHINY_TACTIC_CATCH_ROUTE_BONUS: 950,
        SHINY_TACTIC_UNKNOWN_ROUTE_BONUS: 1100,
        SHINY_TACTIC_GRASS_ROUTE_BONUS: 520,
        SHINY_TACTIC_TRAIN_AFTER_SCOUT_BONUS: 360,
        SHINY_TACTIC_SCOUT_STREAK_SOFT_LIMIT: 2,
        CHALLENGE_SHINY_SCOUT_MAP_COUNT: 3,
        CHALLENGE_FIRST_SHINY_NODE_BONUS: 2800,
        CHALLENGE_SHINY_CATCH_BONUS: 220,
        CHALLENGE_NON_SHINY_EARLY_PENALTY: 42,
        CHALLENGE_CATCH_PROTECT_SCORE: 46,
        CHALLENGE_CARRY_MIN_ITEM_SCORE: 58,
        CHALLENGE_CARRY_OFFENSE_TARGET: 105,
        CHALLENGE_CARRY_SPEED_TARGET: 90,
        CHALLENGE_CARRY_MOVE_TIER_TARGET: 2,
        CHALLENGE_CARRY_ITEM_NODE_BONUS: 1150,
        CHALLENGE_CARRY_BUFF_NODE_BONUS: 980,
        CHALLENGE_TRAINER_LEVEL_NODE_BONUS: 780,
        CHALLENGE_PRIORITY_TYPES: ['Fairy','Dragon','Fire','Dark','Ghost','Water','Steel','Grass','Fighting','Ground','Rock','Electric'],
        CHALLENGE_BOSS_PREP_TARGETS: {
            map1: { avgLevel: 14, leadLevel: 17 },
            map2: { avgLevel: 27, leadLevel: 32 },
            map3: { avgLevel: 40, leadLevel: 46 },
            map4: { avgLevel: 54, leadLevel: 60 },
            late: { avgLevel: 66, leadLevel: 72 },
            big: { avgLevel: 78, leadLevel: 84 },
            final: { avgLevel: 88, leadLevel: 94 }
        },
        STORY_TARGET_TEAM_SIZE: 6,
        STORY_CATCH_PROTECT_SCORE: 44,
        STORY_BALANCED_COVERAGE_TARGET: 9,
        STORY_MIN_BST_TARGET: 480,
        STORY_LEAGUE_COVERAGE_BONUS: 72,
        STORY_CURRENT_BOSS_COVERAGE_BONUS: 44,
        STORY_WEAK_STAT_PENALTY: 34,
        STORY_ROUTE_TEAM_BUILD_BONUS: 900,
        STORY_ROUTE_COVERAGE_BONUS: 720,
        STORY_ROUTE_TRAINING_BONUS: 680,
        STORY_PRIORITY_TYPES: ['Fairy','Ice','Dark','Ghost','Dragon','Ground','Fighting','Electric','Grass','Water','Fire','Steel','Rock','Flying','Psychic'],
        STORY_BOSS_PREP_TARGETS: {
            early: { avgLevel: 13, leadLevel: 16 },
            mid: { avgLevel: 30, leadLevel: 34 },
            late: { avgLevel: 48, leadLevel: 54 },
            league: { avgLevel: 68, leadLevel: 74 },
            champion: { avgLevel: 78, leadLevel: 84 }
        },
        TEAM_TARGET_SIZE: 6,
        MAX_CATCHES_PER_MAP: 2,
        PATH_LOOKAHEAD_DEPTH: 99,
        BOSS_LEAD_WEIGHT: 24,
        BOSS_TEAM_WEIGHT: 8,
        TRAINER_LEAD_OFFENSE_WEIGHT: 44,
        TRAINER_TEAM_OFFENSE_WEIGHT: 18,
        TRAINER_DEFENSE_WEIGHT: 16,
        TRAINER_SUPER_EFFECTIVE_LEAD_BONUS: 95,
        TRAINER_LOW_DAMAGE_LEAD_PENALTY: 80,
        TRAINER_CARRY_MATCHUP_MARGIN_REDUCTION: 38,
        ITEM_BAG_RETRY_COOLDOWN_MS: 45000,
        TEAM_REORDER_REPEAT_COOLDOWN_MS: 3500,
        TEAM_REORDER_ATTEMPT_WINDOW_MS: 20000,
        TEAM_REORDER_STALE_BLOCK_MS: 25000,
        TEAM_REORDER_MAX_ATTEMPTS_PER_SIGNATURE: 2,
        TEAM_REORDER_SCORE_TIE_EPSILON: 3,
        TEAM_REORDER_DUPLICATE_EXTRA_MARGIN: 35,
        RUN_HISTORY_STORAGE_KEY: 'Engine_run_history_v1',
        RUN_HISTORY_LEGACY_STORAGE_KEY: 'pokelike_run_history',
        RUN_HISTORY_MAX_ENTRIES: 80,
        RUN_EVENT_LOG_MAX_ENTRIES: 160,
        BOT_CONTROL_STORAGE_KEY: 'Engine_bot_controls_v1',
        BOT_CONTROL_LEGACY_STORAGE_KEY: 'pokelike_bot_controls',
        BOT_CONTROL_LOCK_KEEP_BONUS: 10000,

        // --- Main carry strategy ---
        // These are the sweepers we want to protect as slot 1 unless a matchup is clearly unsafe.
        MAIN_CARRY_NAMES: ['Thundurus', 'Lapras', 'Genesect', 'Dialga'],
        MAIN_CARRY_LEAD_STICKINESS: 170,
        MAIN_CARRY_REORDER_MARGIN: 130,
        MAIN_CARRY_HEAL_ITEM_BONUS: 210,
        MAIN_CARRY_OFFENSE_ITEM_BONUS: 120,
        MAIN_CARRY_CONSUMABLE_BONUS: 70,
        MAIN_CARRY_HEAL_KEEP_MARGIN: 90,
        MAIN_CARRY_ITEM_RESERVE_BONUS: 360,
        MAIN_CARRY_ITEM_RESERVE_PENALTY: 260,
        GRASS_SUPPORT_CATCH_BONUS: 18,
        GRASS_SUPPORT_THRESHOLD_BONUS: 24,
        EARLY_SHINY_CATCH_BONUS: 48,
        SHINY_CATCH_BONUS: 30,
        SHINY_REPLACEMENT_KEEP_BONUS: 72,
        SHINY_TOP_TYPE_BONUS: 18,
        EARLY_NEW_TYPE_COVERAGE_WEIGHT: 2,
        SETTLED_NEW_TYPE_COVERAGE_WEIGHT: 5,
        ALLOW_DUPLICATE_CATCHES: false,
        DUPLICATE_FIRST_PAIR_CATCH_BONUS: 28,
        DUPLICATE_EXTRA_PAIR_CATCH_BONUS: 12,
        DUPLICATE_EXISTING_PAIR_CATCH_BONUS: 10,
        DUPLICATE_PAIR_ROUTE_BONUS: 260,
        DUPLICATE_PAIR_KEEP_BONUS: 34,
        DUPLICATE_PAIR_REVIVE_BONUS: 18,
        DUPLICATE_PAIR_CREATE_SWAP_BONUS: 26,
        DUPLICATE_PAIR_PROTECT_SCORE: 18,
        DUPLICATE_PRIORITY_ROUTE_BONUS: 1400,
        DUPLICATE_PRIORITY_CATCH_BONUS: 900,
        DUPLICATE_PRIORITY_CATCH_NODE_LIMIT: 2,
        DUPLICATE_PRIORITY_INCOMING_SWAP_BONUS: 3800,
        DUPLICATE_PRIORITY_KEEP_BONUS: 12000,
        DUPLICATE_PRIORITY_PAIR_LEAD_BONUS: 9000,
        DUPLICATE_PRIORITY_PAIR_SPACING_BONUS: 1400,
        DUPLICATE_LOW_COVERAGE_PENALTY: 12,
        DUPLICATE_MIN_COVERAGE_TYPES_BEFORE_EXTRA_PAIR: 4,
        PASSIVE_SHINY_CARD_BONUS: 70,
        PASSIVE_SHINY_TYPE_BONUS: 20,
        PASSIVE_WEAK_CORE_SCALING_BONUS: 28,
        PASSIVE_WEAK_CORE_SURVIVAL_BONUS: 20,
        PASSIVE_STRONG_CARRY_TYPE_BONUS: 18,
        PASSIVE_BOSS_COUNTER_BONUS: 26,
        PASSIVE_UNCOVERED_BOSS_TYPE_BONUS: 22,
        PASSIVE_OFF_TEAM_TYPE_PENALTY: 14,
        PASSIVE_WEAK_CORE_BST_THRESHOLD: 500,
        CENTER_AVOID_FULL_HP_AVG_THRESHOLD: 92,
        CENTER_AVOID_ALMOST_FULL_HP_AVG_THRESHOLD: 82,
        CENTER_AVOID_LOWEST_HP_THRESHOLD: 70,
        CENTER_CARRY_SAFE_HP_THRESHOLD: 72,
        CENTER_CARRY_SKIP_AVG_HP_THRESHOLD: 78,
        CENTER_CARRY_SKIP_LOWEST_HP_THRESHOLD: 55,
        CENTER_STRONG_CARRY_SCORE_THRESHOLD: 260,
        CENTER_HEALTHY_PATH_PENALTY: 1450,
        CENTER_ALMOST_HEALTHY_PATH_PENALTY: 850,
        CENTER_STRONG_CARRY_PATH_PENALTY: 1250,
        CENTER_REWARD_ALTERNATE_MARGIN: 1100,
        BOSS_LEVEL_PRESSURE_TRAINER_BONUS: 150,
        BOSS_LEVEL_PRESSURE_BUFF_BONUS: 52,
        BOSS_LEVEL_PRESSURE_ITEM_PENALTY: 170,
        BOSS_LEVEL_PRESSURE_CATCH_PENALTY: 120,

        // --- Sinnoh Battle Tower early carry training ---
        SINNOH_TOWER_EARLY_TRAINING: true,
        SINNOH_ASSUME_TOWER_WHEN_STAGE_UNKNOWN: true,
        SINNOH_TRAINING_MAP_COUNT: 3,
        SINNOH_TRAINING_CORE_TEAM_SIZE: 2,
        SINNOH_TRAINING_MAX_REWARD: 250,
        SINNOH_MAP1_MIN_AVG_LEVEL: 18,
        SINNOH_MAP1_MIN_LEAD_LEVEL: 24,
        SINNOH_MAP2_MIN_AVG_LEVEL: 32,
        SINNOH_MAP2_MIN_LEAD_LEVEL: 40,
        SINNOH_MAP3_MIN_AVG_LEVEL: 48,
        SINNOH_MAP3_MIN_LEAD_LEVEL: 56,
        SINNOH_TM_MAX_MOVE_TIER: 2,
        SINNOH_OFFENSE_TARGET: 145,
        SINNOH_SPEED_TARGET: 105,
        SINNOH_TRAINER_NODE_BONUS: 3600,
        SINNOH_ITEM_NODE_BONUS: 2600,
        SINNOH_TM_NODE_BONUS: 3200,
        SINNOH_BUFF_NODE_BONUS: 1050,
        SINNOH_OFFENSE_BUFF_NODE_BONUS: 1200,
        SINNOH_TM_ITEM_BONUS: 6000,
        SINNOH_TM_TARGET_BONUS: 15000,
        SINNOH_NON_CARRY_TM_TARGET_PENALTY: 900,
        SINNOH_CATCH_NODE_PENALTY: 1150,
        SINNOH_GRASS_NODE_PENALTY: 900,
        SINNOH_CATCH_SCOUT_ATTEMPTS: 3,
        SINNOH_PASSIVE_CATCH_PROTECT_SCORE: 18,
        SINNOH_PASSIVE_PLAN_STRONG_SCORE: 28,
        SINNOH_POWER_CATCH_PROTECT_SCORE: 34,
        SINNOH_PASSIVE_TARGETS: {
            Fire:     { target: 4, stretch: 6, priority: 98, role: 'start-offense' },
            Rock:     { target: 4, stretch: 6, priority: 98, role: 'defense' },
            Dragon:   { target: 4, stretch: 6, priority: 92, role: 'snowball-offense' },
            Water:    { target: 4, stretch: 6, priority: 88, role: 'attack-down' },
            Dark:     { target: 4, stretch: 6, priority: 84, role: 'crit' },
            Ghost:    { target: 4, stretch: 6, priority: 80, role: 'execute' },
            Fairy:    { target: 4, stretch: 6, priority: 94, role: 'attack-control' },
            Grass:    { target: 4, stretch: 4, priority: 72, role: 'sustain' },
            Steel:    { target: 4, stretch: 4, priority: 70, role: 'damage-reduction' },
            Electric: { target: 2, stretch: 4, priority: 62, role: 'extra-hit' },
            Flying:   { target: 2, stretch: 2, priority: 56, role: 'speed' },
            Ground:   { target: 2, stretch: 2, priority: 52, role: 'speed-control' },
            Fighting: { target: 2, stretch: 4, priority: 48, role: 'backup-offense' },
            Normal:   { target: 0, stretch: 2, priority: 34, role: 'bulk' },
            Ice:      { target: 0, stretch: 2, priority: 34, role: 'control' },
            Psychic:  { target: 0, stretch: 2, priority: 32, role: 'splash' },
            Bug:      { target: 0, stretch: 2, priority: 28, role: 'leveling' },
            Poison:   { target: 0, stretch: 0, priority: 14, role: 'low-priority-dot' }
        },

        // --- Legendary/masterball nodes ---
        LEGENDARY_NODE_BASE_SCORE: 3600,
        LEGENDARY_NODE_ROUTE_BONUS: 2400,
        LEGENDARY_NODE_READY_BONUS: 900,
        LEGENDARY_NODE_LOW_HP_PENALTY: 2600,
        LEGENDARY_NODE_MAX_UNDERLEVEL_PENALTY: 1400,
        LEGENDARY_NODE_UNDERLEVEL_PENALTY: 850,
        LEGENDARY_CATCH_SCORE_BONUS: 120,
        LEGENDARY_CATCH_MIN_BST: 540,
        LEGENDARY_POKEMON_NAMES: [
            'Articuno','Zapdos','Moltres','Mewtwo','Mew',
            'Raikou','Entei','Suicune','Lugia','Ho-Oh','Celebi',
            'Regirock','Regice','Registeel','Kyogre','Groudon','Rayquaza',
            'Latias','Latios','Jirachi','Deoxys',
            'Uxie','Mesprit','Azelf','Dialga','Palkia','Giratina','Heatran',
            'Regigigas','Cresselia','Darkrai','Shaymin','Arceus',
            'Victini','Cobalion','Terrakion','Virizion','Tornadus','Thundurus',
            'Landorus','Reshiram','Zekrom','Kyurem','Keldeo','Meloetta','Genesect'
        ],

        // --- Anti-Stuck ---
        STUCK_WARN_THRESHOLD: 5,
        STUCK_FORCE_THRESHOLD: 10,
        STUCK_PANIC_THRESHOLD: 30,

        // --- Eevee Evolution Preference ---
        // Options: 'auto' (picks based on team needs), or a specific name:
        // 'Vaporeon','Jolteon','Flareon','Espeon','Umbreon','Leafeon','Glaceon','Sylveon'
        EEVEE_EVOLUTION_PREFERENCE: 'auto',

        // --- Starter Preference ---
        // Set to a Pokemon name to force that starter when visible. Empty/null keeps current auto scoring.
        //STARTER_PREFERENCE: 'Dialga',

        // --- Auto-Restart ---
        AUTO_RESTART: true,
        AUTO_START_MODES: {
            resumeChallenge: false,
            weeklyChallenges: false,
            challengeMode: false,
            resumeBattleTower: true,
            battleTower: true
        },
        AUTO_START_PRIORITY: [
            'resumeBattleTower',
            'battleTower',
            'resumeChallenge',
            'weeklyChallenges',
            'challengeMode'
        ],
        WEEKLY_CHALLENGE_ORDER: ['lorelei', 'bruno', 'agatha', 'lance'],
        // Legacy alias for users who still toggle Battle Tower with the old flag.
        AUTO_START_BATTLE_TOWER: true,

        // --- Logging ---
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║              📊 TYPE EFFECTIVENESS CHART (18 types)         ║
    // ╚══════════════════════════════════════════════════════════════╝

    const TYPES = [
        'Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
        'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'
    ];

    // Maps attackType -> { superEffective: [...defTypes], notEffective: [...defTypes], immune: [...defTypes] }
    const TYPE_CHART = {
        Normal:   { strong: [],                                         weak: ['Rock','Steel'],                        immune: ['Ghost'] },
        Fire:     { strong: ['Grass','Ice','Bug','Steel'],              weak: ['Fire','Water','Rock','Dragon'],         immune: [] },
        Water:    { strong: ['Fire','Ground','Rock'],                   weak: ['Water','Grass','Dragon'],               immune: [] },
        Electric: { strong: ['Water','Flying'],                         weak: ['Electric','Grass','Dragon'],            immune: ['Ground'] },
        Grass:    { strong: ['Water','Ground','Rock'],                  weak: ['Fire','Grass','Poison','Flying','Bug','Dragon','Steel'], immune: [] },
        Ice:      { strong: ['Grass','Ground','Flying','Dragon'],       weak: ['Fire','Water','Ice','Steel'],           immune: [] },
        Fighting: { strong: ['Normal','Ice','Rock','Dark','Steel'],     weak: ['Poison','Flying','Psychic','Bug','Fairy'], immune: ['Ghost'] },
        Poison:   { strong: ['Grass','Fairy'],                          weak: ['Poison','Ground','Rock','Ghost'],       immune: ['Steel'] },
        Ground:   { strong: ['Fire','Electric','Poison','Rock','Steel'],weak: ['Grass','Bug'],                          immune: ['Flying'] },
        Flying:   { strong: ['Grass','Fighting','Bug'],                 weak: ['Electric','Rock','Steel'],              immune: [] },
        Psychic:  { strong: ['Fighting','Poison'],                      weak: ['Psychic','Steel'],                      immune: ['Dark'] },
        Bug:      { strong: ['Grass','Psychic','Dark'],                 weak: ['Fire','Fighting','Poison','Flying','Ghost','Steel','Fairy'], immune: [] },
        Rock:     { strong: ['Fire','Ice','Flying','Bug'],              weak: ['Fighting','Ground','Steel'],            immune: [] },
        Ghost:    { strong: ['Psychic','Ghost'],                        weak: ['Dark'],                                 immune: ['Normal'] },
        Dragon:   { strong: ['Dragon'],                                 weak: ['Steel'],                                immune: ['Fairy'] },
        Dark:     { strong: ['Psychic','Ghost'],                        weak: ['Fighting','Dark','Fairy'],              immune: [] },
        Steel:    { strong: ['Ice','Rock','Fairy'],                     weak: ['Fire','Water','Electric','Steel'],       immune: [] },
        Fairy:    { strong: ['Fighting','Dragon','Dark'],               weak: ['Fire','Poison','Steel'],                immune: [] },
    };

    // Defensive weaknesses: what types deal super-effective damage to this type
    const DEFENSIVE_WEAKNESSES = {
        Normal:   ['Fighting'],
        Fire:     ['Water','Ground','Rock'],
        Water:    ['Electric','Grass'],
        Electric: ['Ground'],
        Grass:    ['Fire','Ice','Poison','Flying','Bug'],
        Ice:      ['Fire','Fighting','Rock','Steel'],
        Fighting: ['Psychic','Flying','Fairy'],
        Poison:   ['Ground','Psychic'],
        Ground:   ['Water','Grass','Ice'],
        Flying:   ['Electric','Ice','Rock'],
        Psychic:  ['Bug','Ghost','Dark'],
        Bug:      ['Fire','Flying','Rock'],
        Rock:     ['Water','Grass','Fighting','Ground','Steel'],
        Ghost:    ['Ghost','Dark'],
        Dragon:   ['Ice','Dragon','Fairy'],
        Dark:     ['Fighting','Bug','Fairy'],
        Steel:    ['Fire','Fighting','Ground'],
        Fairy:    ['Poison','Steel'],
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║           🧬 TRAIT SYSTEM (18 types × 3 tiers)              ║
    // ╚══════════════════════════════════════════════════════════════╝

    const TRAIT_DATA = {
        Bug:      { tier: 'B', desc: ['Lvl+10% post-fight','Lvl+20%','Lvl+30%'] },
        Dark:     { tier: 'S', desc: ['+25% crit','+50% crit','+75% crit'] },
        Dragon:   { tier: 'S', desc: ['+1 Atk/SpA on KO','+2 Atk/SpA','+3 Atk/SpA'] },
        Electric: { tier: 'B', desc: ['+20% extra attack','+40%','+60%'] },
        Fairy:    { tier: 'S', desc: ['+1 Atk/SpA start','-2 enemy Atk/SpA','-3 enemy Atk/SpA'] },
        Flying:   { tier: 'B', desc: ['+1 Speed start','+2 Speed','+3 Speed'] },
        Fire:     { tier: 'S', desc: ['+1 Atk/SpA start','+2 Atk/SpA','+3 Atk/SpA'] },
        Fighting: { tier: 'A', desc: ['+1 Atk/SpA ally KO','+2 Atk/SpA','+3 Atk/SpA'] },
        Grass:    { tier: 'A', desc: ['Heal 15% dealt','Heal 30%','Heal 45%'] },
        Ghost:    { tier: 'S', desc: ['Execute <15% HP','Execute <30%','Execute <45%'] },
        Ground:   { tier: 'B', desc: ['-1 enemy Speed','-2 Speed','-3 Speed'] },
        Ice:      { tier: 'B', desc: ['12% Freeze +8% HP','24% +16% HP','36% +24% HP'] },
        Normal:   { tier: 'A', desc: ['+25% max HP','+50% max HP','+75% max HP'] },
        Poison:   { tier: 'C', desc: ['1x Poison 5%/stack','2x Poison','3x Poison'] },
        Psychic:  { tier: 'A', desc: ['10% Splash on death','20% Splash','30% Splash'] },
        Rock:     { tier: 'B', desc: ['+1 Def/SpDef 33%','+2 66%','+3 100%'] },
        Steel:    { tier: 'A', desc: ['15% dmg reduced','30% reduced','45% reduced'] },
        Water:    { tier: 'A', desc: ['-1 Atk/SpA/Spd 33%','-2 66%','-3 100%'] },
    };

    // Synergy value multipliers for drafting AI
    const TRAIT_TIER_VALUE = { 'S': 10, 'A': 7, 'B': 4, 'C': 2 };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║        🏟️ BOSS DATABASE (Kanto + Johto + Tower + E4)        ║
    // ╚══════════════════════════════════════════════════════════════╝

    const BOSS_TYPE_MAP = {
        // Kanto Gym Leaders
        'brock': 'Rock', 'misty': 'Water', 'surge': 'Electric', 'lt. surge': 'Electric',
        'erika': 'Grass', 'koga': 'Poison', 'sabrina': 'Psychic',
        'blaine': 'Fire', 'giovanni': 'Ground',
        // Johto Gym Leaders
        'falkner': 'Flying', 'bugsy': 'Bug', 'whitney': 'Normal',
        'morty': 'Ghost', 'chuck': 'Fighting', 'jasmine': 'Steel',
        'pryce': 'Ice', 'clair': 'Dragon',
        // Kanto Elite Four
        'lorelei': 'Ice', 'bruno': 'Fighting', 'agatha': 'Ghost', 'lance': 'Dragon',
        // Johto Elite Four
        'will': 'Psychic', 'karen': 'Dark',
        // Hoenn
        'roxanne': 'Rock', 'brawly': 'Fighting', 'wattson': 'Electric',
        'flannery': 'Fire', 'norman': 'Normal', 'winona': 'Flying',
        'tate': 'Psychic', 'liza': 'Psychic', 'wallace': 'Water',
        // Hoenn E4
        'sidney': 'Dark', 'phoebe': 'Ghost', 'glacia': 'Ice', 'drake': 'Dragon',
        'steven': 'Steel',
        // Sinnoh
        'roark': 'Rock', 'gardenia': 'Grass', 'maylene': 'Fighting',
        'crasher wake': 'Water', 'fantina': 'Ghost', 'byron': 'Steel',
        'candice': 'Ice', 'volkner': 'Electric',
        // Sinnoh E4
        'aaron': 'Bug', 'bertha': 'Ground', 'flint': 'Fire', 'lucian': 'Psychic',
        'cynthia': 'Dragon', 'arceus': 'Normal',
        // Unova
        'cilan': 'Grass', 'chili': 'Fire', 'chilli': 'Fire', 'cress': 'Water',
        'lenora': 'Normal', 'burgh': 'Bug', 'elesa': 'Electric', 'clay': 'Ground',
        'skyla': 'Flying', 'brycen': 'Ice', 'drayden': 'Dragon', 'iris': 'Dragon',
        'roxie': 'Poison', 'marlon': 'Water', 'cheren': 'Normal',
        // Unova E4 / rivals / champions
        'shauntal': 'Ghost', 'marshal': 'Fighting', 'grimsley': 'Dark', 'caitlin': 'Psychic',
        'alder': 'Bug', 'n': 'Dragon', 'ghetsis': 'Dark', 'colress': 'Steel',
        // Generic fallbacks
        'blue': 'Normal', 'gary': 'Normal', 'red': 'Fire',
    };

    const BOSS_TEAM_DB = {
        bruno: {
            name: 'Bruno',
            types: ['Fighting'],
            team: [
                { name: 'onix', types: ['Rock','Ground'] },
                { name: 'hitmonchan', types: ['Fighting'] },
                { name: 'hitmonlee', types: ['Fighting'] },
                { name: 'machamp', types: ['Fighting'] },
                { name: 'hariyama', types: ['Fighting'] },
            ]
        },
        agatha: {
            name: 'Agatha',
            types: ['Ghost'],
            team: [
                { name: 'gengar', types: ['Ghost','Poison'] },
                { name: 'golbat', types: ['Poison','Flying'] },
                { name: 'haunter', types: ['Ghost','Poison'] },
                { name: 'arbok', types: ['Poison'] },
                { name: 'gengar', types: ['Ghost','Poison'] },
            ]
        },
        lance: {
            name: 'Lance',
            types: ['Dragon'],
            team: [
                { name: 'gyarados', types: ['Water','Flying'] },
                { name: 'dragonair', types: ['Dragon'] },
                { name: 'dragonair', types: ['Dragon'] },
                { name: 'aerodactyl', types: ['Rock','Flying'] },
                { name: 'dragonite', types: ['Dragon','Flying'] },
            ]
        },
        blue: {
            name: 'Blue',
            types: ['Normal'],
            team: [
                { name: 'pidgeot', types: ['Normal','Flying'] },
                { name: 'alakazam', types: ['Psychic'] },
                { name: 'rhydon', types: ['Ground','Rock'] },
                { name: 'arcanine', types: ['Fire'] },
                { name: 'gyarados', types: ['Water','Flying'] },
                { name: 'exeggutor', types: ['Grass','Psychic'] },
            ]
        },
        will: {
            name: 'Will',
            types: ['Psychic'],
            team: [
                { name: 'xatu', types: ['Psychic','Flying'] },
                { name: 'jynx', types: ['Ice','Psychic'] },
                { name: 'exeggutor', types: ['Grass','Psychic'] },
                { name: 'slowbro', types: ['Water','Psychic'] },
                { name: 'xatu', types: ['Psychic','Flying'] },
            ]
        },
        koga: {
            name: 'Koga',
            types: ['Poison'],
            team: [
                { name: 'ariados', types: ['Bug','Poison'] },
                { name: 'forretress', types: ['Bug','Steel'] },
                { name: 'muk', types: ['Poison'] },
                { name: 'venomoth', types: ['Bug','Poison'] },
                { name: 'crobat', types: ['Poison','Flying'] },
            ]
        },
        karen: {
            name: 'Karen',
            types: ['Dark'],
            team: [
                { name: 'umbreon', types: ['Dark'] },
                { name: 'vileplume', types: ['Grass','Poison'] },
                { name: 'murkrow', types: ['Dark','Flying'] },
                { name: 'gengar', types: ['Ghost','Poison'] },
                { name: 'houndoom', types: ['Dark','Fire'] },
            ]
        },
        sidney: {
            name: 'Sidney',
            types: ['Dark'],
            team: [
                { name: 'mightyena', types: ['Dark'] },
                { name: 'shiftry', types: ['Grass','Dark'] },
                { name: 'cacturne', types: ['Grass','Dark'] },
                { name: 'sharpedo', types: ['Water','Dark'] },
                { name: 'absol', types: ['Dark'] },
            ]
        },
        phoebe: {
            name: 'Phoebe',
            types: ['Ghost'],
            team: [
                { name: 'dusclops', types: ['Ghost'] },
                { name: 'banette', types: ['Ghost'] },
                { name: 'sableye', types: ['Dark','Ghost'] },
                { name: 'banette', types: ['Ghost'] },
                { name: 'dusclops', types: ['Ghost'] },
            ]
        },
        drake: {
            name: 'Drake',
            types: ['Dragon'],
            team: [
                { name: 'shelgon', types: ['Dragon'] },
                { name: 'altaria', types: ['Dragon','Flying'] },
                { name: 'flygon', types: ['Ground','Dragon'] },
                { name: 'flygon', types: ['Ground','Dragon'] },
                { name: 'salamence', types: ['Dragon','Flying'] },
            ]
        },
        wallace: {
            name: 'Wallace',
            types: ['Water'],
            team: [
                { name: 'wailord', types: ['Water'] },
                { name: 'tentacruel', types: ['Water','Poison'] },
                { name: 'milotic', types: ['Water'] },
                { name: 'gyarados', types: ['Water','Flying'] },
                { name: 'whiscash', types: ['Water','Ground'] },
                { name: 'ludicolo', types: ['Water','Grass'] },
            ]
        },
        pryce: {
            name: 'Pryce',
            types: ['Ice'],
            team: [
                { name: 'lapras', types: ['Water','Ice'] },
                { name: 'dewgong', types: ['Water','Ice'] },
                { name: 'piloswine', types: ['Ice','Ground'] },
                { name: 'jynx', types: ['Ice','Psychic'] },
                { name: 'abomasnow', types: ['Grass','Ice'] },
            ]
        },
        lorelei: {
            name: 'Lorelei',
            types: ['Ice'],
            team: [
                { name: 'lapras', types: ['Water','Ice'] },
                { name: 'weavile', types: ['Dark','Ice'] },
                { name: 'mamoswine', types: ['Ice','Ground'] },
                { name: 'drifblim', types: ['Ghost','Flying'] },
                { name: 'milotic', types: ['Water'] },
            ]
        },
        glacia: {
            name: 'Glacia',
            types: ['Ice'],
            team: [
                { name: 'walrein', types: ['Ice','Water'] },
                { name: 'glalie', types: ['Ice'] },
                { name: 'froslass', types: ['Ice','Ghost'] },
                { name: 'mamoswine', types: ['Ice','Ground'] },
            ]
        },
        steven: {
            name: 'Steven Stone',
            types: ['Steel'],
            team: [
                { name: 'metagross', types: ['Steel','Psychic'] },
                { name: 'metagross', types: ['Steel','Psychic'] },
                { name: 'aggron', types: ['Steel','Rock'] },
                { name: 'skarmory', types: ['Steel','Flying'] },
                { name: 'claydol', types: ['Ground','Psychic'] },
                { name: 'armaldo', types: ['Rock','Bug'] },
            ]
        },
        roark: {
            name: 'Roark',
            types: ['Rock'],
            team: [
                { name: 'geodude', types: ['Rock','Ground'] },
                { name: 'onix', types: ['Rock','Ground'] },
                { name: 'cranidos', types: ['Rock'] },
            ]
        },
        gardenia: {
            name: 'Gardenia',
            types: ['Grass'],
            team: [
                { name: 'cherubi', types: ['Grass'] },
                { name: 'turtwig', types: ['Grass'] },
                { name: 'roserade', types: ['Grass','Poison'] },
            ]
        },
        maylene: {
            name: 'Maylene',
            types: ['Fighting'],
            team: [
                { name: 'meditite', types: ['Fighting','Psychic'] },
                { name: 'machoke', types: ['Fighting'] },
                { name: 'lucario', types: ['Fighting','Steel'] },
            ]
        },
        'crasher wake': {
            name: 'Crasher Wake',
            types: ['Water'],
            team: [
                { name: 'gyarados', types: ['Water','Flying'] },
                { name: 'quagsire', types: ['Water','Ground'] },
                { name: 'floatzel', types: ['Water'] },
            ]
        },
        fantina: {
            name: 'Fantina',
            types: ['Ghost'],
            team: [
                { name: 'drifblim', types: ['Ghost','Flying'] },
                { name: 'gengar', types: ['Ghost','Poison'] },
                { name: 'mismagius', types: ['Ghost'] },
            ]
        },
        byron: {
            name: 'Byron',
            types: ['Steel'],
            team: [
                { name: 'bronzor', types: ['Steel','Psychic'] },
                { name: 'steelix', types: ['Steel','Ground'] },
                { name: 'bastiodon', types: ['Rock','Steel'] },
            ]
        },
        candice: {
            name: 'Candice',
            types: ['Ice'],
            team: [
                { name: 'sneasel', types: ['Dark','Ice'] },
                { name: 'piloswine', types: ['Ice','Ground'] },
                { name: 'abomasnow', types: ['Grass','Ice'] },
                { name: 'froslass', types: ['Ice','Ghost'] },
            ]
        },
        volkner: {
            name: 'Volkner',
            types: ['Electric'],
            team: [
                { name: 'raichu', types: ['Electric'] },
                { name: 'ambipom', types: ['Normal'] },
                { name: 'octillery', types: ['Water'] },
                { name: 'luxray', types: ['Electric'] },
            ]
        },
        aaron: {
            name: 'Aaron',
            types: ['Bug'],
            team: [
                { name: 'dustox', types: ['Bug','Poison'] },
                { name: 'heracross', types: ['Bug','Fighting'] },
                { name: 'vespiquen', types: ['Bug','Flying'] },
                { name: 'drapion', types: ['Poison','Dark'] },
                { name: 'yanmega', types: ['Bug','Flying'] },
            ]
        },
        bertha: {
            name: 'Bertha',
            types: ['Ground'],
            team: [
                { name: 'quagsire', types: ['Water','Ground'] },
                { name: 'sudowoodo', types: ['Rock'] },
                { name: 'golem', types: ['Rock','Ground'] },
                { name: 'whiscash', types: ['Water','Ground'] },
                { name: 'hippowdon', types: ['Ground'] },
            ]
        },
        flint: {
            name: 'Flint',
            types: ['Fire'],
            team: [
                { name: 'rapidash', types: ['Fire'] },
                { name: 'infernape', types: ['Fire','Fighting'] },
                { name: 'steelix', types: ['Steel','Ground'] },
                { name: 'drifblim', types: ['Ghost','Flying'] },
                { name: 'lopunny', types: ['Normal'] },
            ]
        },
        lucian: {
            name: 'Lucian',
            types: ['Psychic'],
            team: [
                { name: 'mr. mime', types: ['Psychic','Fairy'] },
                { name: 'girafarig', types: ['Normal','Psychic'] },
                { name: 'medicham', types: ['Fighting','Psychic'] },
                { name: 'alakazam', types: ['Psychic'] },
                { name: 'bronzong', types: ['Steel','Psychic'] },
            ]
        },
        cynthia: {
            name: 'Cynthia',
            types: ['Dragon'],
            team: [
                { name: 'spiritomb', types: ['Ghost','Dark'] },
                { name: 'roserade', types: ['Grass','Poison'] },
                { name: 'gastrodon', types: ['Water','Ground'] },
                { name: 'lucario', types: ['Fighting','Steel'] },
                { name: 'milotic', types: ['Water'] },
                { name: 'garchomp', types: ['Dragon','Ground'] },
            ]
        },
        cilan: {
            name: 'Cilan',
            types: ['Grass'],
            team: [
                { name: 'lillipup', types: ['Normal'] },
                { name: 'pansage', types: ['Grass'] },
                { name: 'simisage', types: ['Grass'] },
            ]
        },
        chili: {
            name: 'Chili',
            types: ['Fire'],
            team: [
                { name: 'lillipup', types: ['Normal'] },
                { name: 'pansear', types: ['Fire'] },
                { name: 'simisear', types: ['Fire'] },
            ]
        },
        chilli: {
            name: 'Chili',
            types: ['Fire'],
            team: [
                { name: 'lillipup', types: ['Normal'] },
                { name: 'pansear', types: ['Fire'] },
                { name: 'simisear', types: ['Fire'] },
            ]
        },
        cress: {
            name: 'Cress',
            types: ['Water'],
            team: [
                { name: 'lillipup', types: ['Normal'] },
                { name: 'panpour', types: ['Water'] },
                { name: 'simipour', types: ['Water'] },
            ]
        },
        lenora: {
            name: 'Lenora',
            types: ['Normal'],
            team: [
                { name: 'herdier', types: ['Normal'] },
                { name: 'watchog', types: ['Normal'] },
                { name: 'stoutland', types: ['Normal'] },
            ]
        },
        burgh: {
            name: 'Burgh',
            types: ['Bug'],
            team: [
                { name: 'whirlipede', types: ['Bug','Poison'] },
                { name: 'dwebble', types: ['Bug','Rock'] },
                { name: 'leavanny', types: ['Bug','Grass'] },
                { name: 'escavalier', types: ['Bug','Steel'] },
            ]
        },
        elesa: {
            name: 'Elesa',
            types: ['Electric'],
            team: [
                { name: 'emolga', types: ['Electric','Flying'] },
                { name: 'emolga', types: ['Electric','Flying'] },
                { name: 'zebstrika', types: ['Electric'] },
                { name: 'eelektross', types: ['Electric'] },
            ]
        },
        clay: {
            name: 'Clay',
            types: ['Ground'],
            team: [
                { name: 'krokorok', types: ['Ground','Dark'] },
                { name: 'palpitoad', types: ['Water','Ground'] },
                { name: 'excadrill', types: ['Ground','Steel'] },
                { name: 'krookodile', types: ['Ground','Dark'] },
            ]
        },
        skyla: {
            name: 'Skyla',
            types: ['Flying'],
            team: [
                { name: 'swoobat', types: ['Psychic','Flying'] },
                { name: 'unfezant', types: ['Normal','Flying'] },
                { name: 'swanna', types: ['Water','Flying'] },
                { name: 'braviary', types: ['Normal','Flying'] },
            ]
        },
        brycen: {
            name: 'Brycen',
            types: ['Ice'],
            team: [
                { name: 'vanillish', types: ['Ice'] },
                { name: 'cryogonal', types: ['Ice'] },
                { name: 'beartic', types: ['Ice'] },
                { name: 'vanilluxe', types: ['Ice'] },
            ]
        },
        drayden: {
            name: 'Drayden',
            types: ['Dragon'],
            team: [
                { name: 'fraxure', types: ['Dragon'] },
                { name: 'druddigon', types: ['Dragon'] },
                { name: 'haxorus', types: ['Dragon'] },
                { name: 'hydreigon', types: ['Dark','Dragon'] },
            ]
        },
        iris: {
            name: 'Iris',
            types: ['Dragon'],
            team: [
                { name: 'fraxure', types: ['Dragon'] },
                { name: 'druddigon', types: ['Dragon'] },
                { name: 'haxorus', types: ['Dragon'] },
                { name: 'lapras', types: ['Water','Ice'] },
                { name: 'hydreigon', types: ['Dark','Dragon'] },
            ]
        },
        roxie: {
            name: 'Roxie',
            types: ['Poison'],
            team: [
                { name: 'koffing', types: ['Poison'] },
                { name: 'whirlipede', types: ['Bug','Poison'] },
                { name: 'scolipede', types: ['Bug','Poison'] },
                { name: 'garbodor', types: ['Poison'] },
            ]
        },
        marlon: {
            name: 'Marlon',
            types: ['Water'],
            team: [
                { name: 'carracosta', types: ['Water','Rock'] },
                { name: 'wailord', types: ['Water'] },
                { name: 'jellicent', types: ['Water','Ghost'] },
                { name: 'samurott', types: ['Water'] },
            ]
        },
        cheren: {
            name: 'Cheren',
            types: ['Normal'],
            team: [
                { name: 'patrat', types: ['Normal'] },
                { name: 'lillipup', types: ['Normal'] },
                { name: 'stoutland', types: ['Normal'] },
                { name: 'cinccino', types: ['Normal'] },
            ]
        },
        shauntal: {
            name: 'Shauntal',
            types: ['Ghost'],
            team: [
                { name: 'cofagrigus', types: ['Ghost'] },
                { name: 'jellicent', types: ['Water','Ghost'] },
                { name: 'golurk', types: ['Ground','Ghost'] },
                { name: 'chandelure', types: ['Ghost','Fire'] },
            ]
        },
        marshal: {
            name: 'Marshal',
            types: ['Fighting'],
            team: [
                { name: 'throh', types: ['Fighting'] },
                { name: 'sawk', types: ['Fighting'] },
                { name: 'mienshao', types: ['Fighting'] },
                { name: 'conkeldurr', types: ['Fighting'] },
            ]
        },
        grimsley: {
            name: 'Grimsley',
            types: ['Dark'],
            team: [
                { name: 'scrafty', types: ['Dark','Fighting'] },
                { name: 'liepard', types: ['Dark'] },
                { name: 'krookodile', types: ['Ground','Dark'] },
                { name: 'bisharp', types: ['Dark','Steel'] },
            ]
        },
        caitlin: {
            name: 'Caitlin',
            types: ['Psychic'],
            team: [
                { name: 'reuniclus', types: ['Psychic'] },
                { name: 'musharna', types: ['Psychic'] },
                { name: 'sigilyph', types: ['Psychic','Flying'] },
                { name: 'gothitelle', types: ['Psychic'] },
            ]
        },
        alder: {
            name: 'Alder',
            types: ['Bug'],
            team: [
                { name: 'accelgor', types: ['Bug'] },
                { name: 'bouffalant', types: ['Normal'] },
                { name: 'druddigon', types: ['Dragon'] },
                { name: 'escavalier', types: ['Bug','Steel'] },
                { name: 'vanilluxe', types: ['Ice'] },
                { name: 'volcarona', types: ['Bug','Fire'] },
            ]
        },
        n: {
            name: 'N',
            types: ['Dragon'],
            team: [
                { name: 'zekrom', types: ['Dragon','Electric'] },
                { name: 'reshiram', types: ['Dragon','Fire'] },
                { name: 'carracosta', types: ['Water','Rock'] },
                { name: 'archeops', types: ['Rock','Flying'] },
                { name: 'vanilluxe', types: ['Ice'] },
                { name: 'zoroark', types: ['Dark'] },
            ]
        },
        ghetsis: {
            name: 'Ghetsis',
            types: ['Dark'],
            team: [
                { name: 'cofagrigus', types: ['Ghost'] },
                { name: 'bouffalant', types: ['Normal'] },
                { name: 'seismitoad', types: ['Water','Ground'] },
                { name: 'bisharp', types: ['Dark','Steel'] },
                { name: 'eelektross', types: ['Electric'] },
                { name: 'hydreigon', types: ['Dark','Dragon'] },
            ]
        },
        colress: {
            name: 'Colress',
            types: ['Steel'],
            team: [
                { name: 'magneton', types: ['Electric','Steel'] },
                { name: 'magnezone', types: ['Electric','Steel'] },
                { name: 'metang', types: ['Steel','Psychic'] },
                { name: 'beheeyem', types: ['Psychic'] },
                { name: 'klinklang', types: ['Steel'] },
                { name: 'genesect', types: ['Bug','Steel'] },
            ]
        },
        arceus: {
            name: 'Arceus',
            types: ['Normal'],
            team: [
                { name: 'arceus', types: ['Normal'], passiveTier: 1, passives: TYPES },
            ]
        },
    };

    const STORY_LEAGUE_FINALS = {
        kanto: ['lorelei', 'bruno', 'agatha', 'lance', 'blue'],
        johto: ['will', 'koga', 'bruno', 'karen', 'lance'],
        hoenn: ['sidney', 'phoebe', 'glacia', 'drake', 'steven'],
        sinnoh: ['aaron', 'bertha', 'flint', 'lucian', 'cynthia'],
        unova: ['shauntal', 'marshal', 'grimsley', 'caitlin', 'alder']
    };

    const SINNOH_BOSS_RUN_PLAN = {
        roark:          { attackTypes: ['Water','Grass','Fighting','Ground','Steel'], passiveTypes: ['Water','Grass','Fighting','Steel','Rock'], pressure: 'bulk-break' },
        gardenia:      { attackTypes: ['Fire','Flying','Ice','Bug','Poison'], passiveTypes: ['Fire','Flying','Dark','Dragon','Grass'], pressure: 'early-offense' },
        maylene:       { attackTypes: ['Flying','Psychic','Fairy'], passiveTypes: ['Flying','Fairy','Water','Rock','Steel'], pressure: 'speed-offense' },
        'crasher wake': { attackTypes: ['Electric','Grass'], passiveTypes: ['Water','Grass','Electric','Rock','Steel'], pressure: 'water-bulk' },
        fantina:       { attackTypes: ['Dark','Ghost'], passiveTypes: ['Dark','Ghost','Normal','Water'], pressure: 'ghost-burst' },
        byron:         { attackTypes: ['Fire','Fighting','Ground'], passiveTypes: ['Fire','Fighting','Ground','Steel','Water'], pressure: 'steel-wall' },
        candice:       { attackTypes: ['Fire','Fighting','Rock','Steel'], passiveTypes: ['Fire','Fighting','Rock','Steel','Water'], pressure: 'ice-burst' },
        volkner:       { attackTypes: ['Ground'], passiveTypes: ['Ground','Water','Rock','Steel','Dragon'], pressure: 'speed-control' },
        aaron:         { attackTypes: ['Fire','Flying','Rock'], passiveTypes: ['Fire','Flying','Rock','Dark','Dragon'], pressure: 'elite-offense' },
        bertha:        { attackTypes: ['Water','Grass','Ice'], passiveTypes: ['Water','Grass','Ice','Rock','Steel'], pressure: 'ground-bulk' },
        flint:         { attackTypes: ['Water','Ground','Rock'], passiveTypes: ['Water','Ground','Rock','Dragon','Steel'], pressure: 'fire-burst' },
        lucian:        { attackTypes: ['Dark','Ghost','Bug'], passiveTypes: ['Dark','Ghost','Bug','Water','Steel'], pressure: 'psychic-burst' },
        cynthia:       { attackTypes: ['Ice','Fairy','Dragon','Fighting','Electric','Grass'], passiveTypes: ['Dragon','Fairy','Water','Rock','Steel','Fire','Dark','Ghost'], pressure: 'post-arceus-final-trainer' },
        arceus:        { attackTypes: ['Fighting'], passiveTypes: ['Fire','Dragon','Dark','Ghost','Water','Fairy','Rock','Steel','Grass','Flying','Ground'], pressure: 'arceus-checkpoint' }
    };

    const SINNOH_BOSS_ORDER = [
        'roark',
        'gardenia',
        'maylene',
        'crasher wake',
        'fantina',
        'byron',
        'candice',
        'arceus',
        'cynthia'
    ];
    const SINNOH_ARCEUS_BATTLE_INDEX = SINNOH_BOSS_ORDER.indexOf('arceus') + 1;
    const SINNOH_POST_ARCEUS_BOSS_KEY = 'cynthia';

    // Estima el tipo dominante de los entrenadores por el nombre de su clase/sprite
    const TRAINER_TYPE_ESTIMATION = {
        'hiker': ['Rock', 'Ground'],
        'swimmer': ['Water'],
        'bug': ['Bug'],
        'blackbelt': ['Fighting'],
        'black_belt': ['Fighting'],
        'psychic': ['Psychic'],
        'fisherman': ['Water'],
        'bird': ['Flying'],
        'sailor': ['Water', 'Fighting'],
        'camper': ['Normal', 'Grass', 'Ground'],
        'picnic': ['Normal', 'Grass', 'Water'],
        'juggler': ['Psychic'],
        'burglar': ['Fire'],
        'channeler': ['Ghost'],
        'engineer': ['Electric'],
        'rocker': ['Electric'],
        'tamer': ['Normal'],
        'beauty': ['Normal', 'Grass', 'Water'],
        'cue_ball': ['Fighting', 'Poison'],
        'lass': ['Normal', 'Grass'],
        'youngster': ['Normal'],
        'cooltrainer': ['Dragon', 'Steel', 'Normal'],
        'ace': ['Dragon', 'Steel', 'Normal'],
        'gentleman': ['Normal', 'Electric'],
        'super_nerd': ['Fire', 'Poison'],
        'nerd': ['Fire', 'Poison'],
        'biker': ['Poison'],
        'gambler': ['Water', 'Fire', 'Electric']
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║       🐾 POKÉMON DATABASE (Gen 1+2 core, ~251 entries)      ║
    // ╚══════════════════════════════════════════════════════════════╝

    const POKEMON_DB = {
        // --- Gen 1 Starters ---
        'bulbasaur':['Grass','Poison'],'ivysaur':['Grass','Poison'],'venusaur':['Grass','Poison'],
        'charmander':['Fire'],'charmeleon':['Fire'],'charizard':['Fire','Flying'],
        'squirtle':['Water'],'wartortle':['Water'],'blastoise':['Water'],
        // --- Gen 1 Bugs ---
        'caterpie':['Bug'],'metapod':['Bug'],'butterfree':['Bug','Flying'],
        'weedle':['Bug','Poison'],'kakuna':['Bug','Poison'],'beedrill':['Bug','Poison'],
        // --- Gen 1 Birds ---
        'pidgey':['Normal','Flying'],'pidgeotto':['Normal','Flying'],'pidgeot':['Normal','Flying'],
        'spearow':['Normal','Flying'],'fearow':['Normal','Flying'],
        // --- Gen 1 Rodents ---
        'rattata':['Normal'],'raticate':['Normal'],
        // --- Gen 1 Electric ---
        'pikachu':['Electric'],'raichu':['Electric'],'voltorb':['Electric'],'electrode':['Electric'],
        'electabuzz':['Electric'],'magnemite':['Electric','Steel'],'magneton':['Electric','Steel'],
        // --- Gen 1 Poison ---
        'ekans':['Poison'],'arbok':['Poison'],'nidoran-f':['Poison'],'nidorina':['Poison'],
        'nidoqueen':['Poison','Ground'],'nidoran-m':['Poison'],'nidorino':['Poison'],
        'nidoking':['Poison','Ground'],'zubat':['Poison','Flying'],'golbat':['Poison','Flying'],
        'oddish':['Grass','Poison'],'gloom':['Grass','Poison'],'vileplume':['Grass','Poison'],
        'venonat':['Bug','Poison'],'venomoth':['Bug','Poison'],'bellsprout':['Grass','Poison'],
        'weepinbell':['Grass','Poison'],'victreebel':['Grass','Poison'],'grimer':['Poison'],
        'muk':['Poison'],'koffing':['Poison'],'weezing':['Poison'],'tentacool':['Water','Poison'],
        'tentacruel':['Water','Poison'],
        // --- Gen 1 Fairy ---
        'clefairy':['Fairy'],'clefable':['Fairy'],'jigglypuff':['Normal','Fairy'],
        'wigglytuff':['Normal','Fairy'],
        // --- Gen 1 Fire ---
        'vulpix':['Fire'],'ninetales':['Fire'],'growlithe':['Fire'],'arcanine':['Fire'],
        'ponyta':['Fire'],'rapidash':['Fire'],'magmar':['Fire'],'flareon':['Fire'],
        // --- Gen 1 Water ---
        'psyduck':['Water'],'golduck':['Water'],'poliwag':['Water'],'poliwhirl':['Water'],
        'poliwrath':['Water','Fighting'],'slowpoke':['Water','Psychic'],'slowbro':['Water','Psychic'],
        'seel':['Water'],'dewgong':['Water','Ice'],'shellder':['Water'],'cloyster':['Water','Ice'],
        'krabby':['Water'],'kingler':['Water'],'horsea':['Water'],'seadra':['Water'],
        'goldeen':['Water'],'seaking':['Water'],'staryu':['Water'],'starmie':['Water','Psychic'],
        'magikarp':['Water'],'gyarados':['Water','Flying'],'lapras':['Water','Ice'],
        'vaporeon':['Water'],'omanyte':['Rock','Water'],'omastar':['Rock','Water'],
        'kabuto':['Rock','Water'],'kabutops':['Rock','Water'],
        // --- Gen 1 Grass ---
        'paras':['Bug','Grass'],'parasect':['Bug','Grass'],'tangela':['Grass'],
        'exeggcute':['Grass','Psychic'],'exeggutor':['Grass','Psychic'],
        // --- Gen 1 Ground ---
        'sandshrew':['Ground'],'sandslash':['Ground'],'diglett':['Ground'],'dugtrio':['Ground'],
        'geodude':['Rock','Ground'],'graveler':['Rock','Ground'],'golem':['Rock','Ground'],
        'cubone':['Ground'],'marowak':['Ground'],'rhyhorn':['Ground','Rock'],'rhydon':['Ground','Rock'],
        // --- Gen 1 Normal ---
        'meowth':['Normal'],'persian':['Normal'],'farfetchd':['Normal','Flying'],
        'doduo':['Normal','Flying'],'dodrio':['Normal','Flying'],'lickitung':['Normal'],
        'chansey':['Normal'],'kangaskhan':['Normal'],'tauros':['Normal'],'ditto':['Normal'],
        'eevee':['Normal'],'porygon':['Normal'],'snorlax':['Normal'],
        // --- Gen 1 Psychic ---
        'abra':['Psychic'],'kadabra':['Psychic'],'alakazam':['Psychic'],
        'drowzee':['Psychic'],'hypno':['Psychic'],'mr. mime':['Psychic','Fairy'],
        'jynx':['Ice','Psychic'],'espeon':['Psychic'],
        // --- Gen 1 Fighting ---
        'mankey':['Fighting'],'primeape':['Fighting'],'machop':['Fighting'],
        'machoke':['Fighting'],'machamp':['Fighting'],'hitmonlee':['Fighting'],
        'hitmonchan':['Fighting'],
        // --- Gen 1 Ghost ---
        'gastly':['Ghost','Poison'],'haunter':['Ghost','Poison'],'gengar':['Ghost','Poison'],
        // --- Gen 1 Rock ---
        'onix':['Rock','Ground'],'aerodactyl':['Rock','Flying'],
        // --- Gen 1 Dragon ---
        'dratini':['Dragon'],'dragonair':['Dragon'],'dragonite':['Dragon','Flying'],
        // --- Gen 1 Ice ---
        'articuno':['Ice','Flying'],'jolteon':['Electric'],
        // --- Gen 1 Steel (retcon) ---
        'scyther':['Bug','Flying'],
        // --- Gen 1 Dark ---
        'umbreon':['Dark'],
        // --- Gen 1 Misc ---
        'mew':['Psychic'],'mewtwo':['Psychic'],'zapdos':['Electric','Flying'],
        'moltres':['Fire','Flying'],
        // --- Gen 2 Starters ---
        'chikorita':['Grass'],'bayleef':['Grass'],'meganium':['Grass'],
        'cyndaquil':['Fire'],'quilava':['Fire'],'typhlosion':['Fire'],
        'totodile':['Water'],'croconaw':['Water'],'feraligatr':['Water'],
        // --- Gen 2 Normal ---
        'sentret':['Normal'],'furret':['Normal'],'aipom':['Normal'],
        'dunsparce':['Normal'],'teddiursa':['Normal'],'ursaring':['Normal'],
        'stantler':['Normal'],'smeargle':['Normal'],'miltank':['Normal'],
        'blissey':['Normal'],'porygon2':['Normal'],
        // --- Gen 2 Flying ---
        'hoothoot':['Normal','Flying'],'noctowl':['Normal','Flying'],
        'togetic':['Fairy','Flying'],'togekiss':['Fairy','Flying'],
        'murkrow':['Dark','Flying'],'honchkrow':['Dark','Flying'],
        'natu':['Psychic','Flying'],'xatu':['Psychic','Flying'],
        // --- Gen 2 Bug ---
        'ledyba':['Bug','Flying'],'ledian':['Bug','Flying'],
        'spinarak':['Bug','Poison'],'ariados':['Bug','Poison'],
        'yanma':['Bug','Flying'],'pineco':['Bug'],'forretress':['Bug','Steel'],
        'scizor':['Bug','Steel'],'shuckle':['Bug','Rock'],'heracross':['Bug','Fighting'],
        // --- Gen 2 Poison ---
        'crobat':['Poison','Flying'],'qwilfish':['Water','Poison'],
        // --- Gen 2 Electric ---
        'chinchou':['Water','Electric'],'lanturn':['Water','Electric'],
        'mareep':['Electric'],'flaaffy':['Electric'],'ampharos':['Electric'],
        'elekid':['Electric'],
        // --- Gen 2 Water ---
        'marill':['Water','Fairy'],'azumarill':['Water','Fairy'],
        'wooper':['Water','Ground'],'quagsire':['Water','Ground'],
        'politoed':['Water'],'corsola':['Water','Rock'],'remoraid':['Water'],
        'octillery':['Water'],'mantine':['Water','Flying'],'kingdra':['Water','Dragon'],
        'suicune':['Water'],'raikou':['Electric'],
        // --- Gen 2 Grass ---
        'bellossom':['Grass'],'hoppip':['Grass','Flying'],'skiploom':['Grass','Flying'],
        'jumpluff':['Grass','Flying'],'sunkern':['Grass'],'sunflora':['Grass'],
        'celebi':['Psychic','Grass'],
        // --- Gen 2 Fire ---
        'magby':['Fire'],'slugma':['Fire'],'magcargo':['Fire','Rock'],
        'houndour':['Dark','Fire'],'houndoom':['Dark','Fire'],'entei':['Fire'],
        'ho-oh':['Fire','Flying'],
        // --- Gen 2 Fighting ---
        'tyrogue':['Fighting'],'hitmontop':['Fighting'],
        // --- Gen 2 Psychic ---
        'slowking':['Water','Psychic'],'unown':['Psychic'],'wobbuffet':['Psychic'],
        'girafarig':['Normal','Psychic'],'smoochum':['Ice','Psychic'],
        'lugia':['Psychic','Flying'],
        // --- Gen 2 Ghost ---
        'misdreavus':['Ghost'],
        // --- Gen 2 Dark ---
        'sneasel':['Dark','Ice'],'weavile':['Dark','Ice'],
        // --- Gen 2 Steel ---
        'skarmory':['Steel','Flying'],'steelix':['Steel','Ground'],
        // --- Gen 2 Ice ---
        'sneasel':['Dark','Ice'],'swinub':['Ice','Ground'],'piloswine':['Ice','Ground'],
        'delibird':['Ice','Flying'],'snorunt':['Ice'],'glalie':['Ice'],
        // --- Gen 2 Rock ---
        'sudowoodo':['Rock'],'larvitar':['Rock','Ground'],'pupitar':['Rock','Ground'],
        'tyranitar':['Rock','Dark'],
        // --- Gen 2 Dragon ---
        'kingdra':['Water','Dragon'],
        // --- Gen 2 Fairy ---
        'togepi':['Fairy'],'snubbull':['Fairy'],'granbull':['Fairy'],
        // --- Gen 2 Ground ---
        'phanpy':['Ground'],'donphan':['Ground'],'gligar':['Ground','Flying'],
        // --- Gen 3 (common in tower) ---
        'torchic':['Fire'],'combusken':['Fire','Fighting'],'blaziken':['Fire','Fighting'],
        'mudkip':['Water'],'marshtomp':['Water','Ground'],'swampert':['Water','Ground'],
        'treecko':['Grass'],'grovyle':['Grass'],'sceptile':['Grass'],
        'ralts':['Psychic','Fairy'],'kirlia':['Psychic','Fairy'],'gardevoir':['Psychic','Fairy'],
        'gallade':['Psychic','Fighting'],
        'poochyena':['Dark'],'mightyena':['Dark'],
        'seedot':['Grass'],'nuzleaf':['Grass','Dark'],'shiftry':['Grass','Dark'],
        'lotad':['Water','Grass'],'lombre':['Water','Grass'],'ludicolo':['Water','Grass'],
        'zigzagoon':['Normal'],'linoone':['Normal'],'slakoth':['Normal'],
        'vigoroth':['Normal'],'slaking':['Normal'],
        'makuhita':['Fighting'],'hariyama':['Fighting'],
        'sableye':['Dark','Ghost'],
        'aron':['Steel','Rock'],'lairon':['Steel','Rock'],'aggron':['Steel','Rock'],
        'meditite':['Fighting','Psychic'],'medicham':['Fighting','Psychic'],
        'electrike':['Electric'],'manectric':['Electric'],
        'gulpin':['Poison'],'swalot':['Poison'],
        'carvanha':['Water','Dark'],'sharpedo':['Water','Dark'],
        'wailmer':['Water'],'wailord':['Water'],
        'numel':['Fire','Ground'],'camerupt':['Fire','Ground'],
        'spinda':['Normal'],'trapinch':['Ground'],'vibrava':['Ground','Dragon'],
        'flygon':['Ground','Dragon'],
        'cacnea':['Grass'],'cacturne':['Grass','Dark'],
        'swablu':['Normal','Flying'],'altaria':['Dragon','Flying'],
        'zangoose':['Normal'],'seviper':['Poison'],
        'solrock':['Rock','Psychic'],'lunatone':['Rock','Psychic'],
        'barboach':['Water','Ground'],'whiscash':['Water','Ground'],
        'baltoy':['Ground','Psychic'],'claydol':['Ground','Psychic'],
        'lileep':['Rock','Grass'],'cradily':['Rock','Grass'],
        'anorith':['Rock','Bug'],'armaldo':['Rock','Bug'],
        'feebas':['Water'],'milotic':['Water'],
        'shuppet':['Ghost'],'banette':['Ghost'],
        'duskull':['Ghost'],'dusclops':['Ghost'],
        'absol':['Dark'],
        'snorunt':['Ice'],'glalie':['Ice'],
        'spheal':['Ice','Water'],'sealeo':['Ice','Water'],'walrein':['Ice','Water'],
        'bagon':['Dragon'],'shelgon':['Dragon'],'salamence':['Dragon','Flying'],
        'beldum':['Steel','Psychic'],'metang':['Steel','Psychic'],'metagross':['Steel','Psychic'],
        'drifloon':['Ghost','Flying'],'drifblim':['Ghost','Flying'],
        'snover':['Grass','Ice'],'abomasnow':['Grass','Ice'],
        'mamoswine':['Ice','Ground'],'froslass':['Ice','Ghost'],
        'regirock':['Rock'],'regice':['Ice'],'registeel':['Steel'],
        'latias':['Dragon','Psychic'],'latios':['Dragon','Psychic'],
        'kyogre':['Water'],'groudon':['Ground'],'rayquaza':['Dragon','Flying'],
        'jirachi':['Steel','Psychic'],'deoxys':['Psychic'],
        'uxie':['Psychic'],'mesprit':['Psychic'],'azelf':['Psychic'],
        'dialga':['Steel','Dragon'],'palkia':['Water','Dragon'],'giratina':['Ghost','Dragon'],
        'heatran':['Fire','Steel'],'regigigas':['Normal'],'cresselia':['Psychic'],
        'darkrai':['Dark'],'shaymin':['Grass'],'arceus':['Normal'],
        // --- Gen 5 Unova ---
        'victini':['Psychic','Fire'],
        'snivy':['Grass'],'servine':['Grass'],'serperior':['Grass'],
        'tepig':['Fire'],'pignite':['Fire','Fighting'],'emboar':['Fire','Fighting'],
        'oshawott':['Water'],'dewott':['Water'],'samurott':['Water'],
        'patrat':['Normal'],'watchog':['Normal'],
        'lillipup':['Normal'],'herdier':['Normal'],'stoutland':['Normal'],
        'purrloin':['Dark'],'liepard':['Dark'],
        'pansage':['Grass'],'simisage':['Grass'],
        'pansear':['Fire'],'simisear':['Fire'],
        'panpour':['Water'],'simipour':['Water'],
        'munna':['Psychic'],'musharna':['Psychic'],
        'pidove':['Normal','Flying'],'tranquill':['Normal','Flying'],'unfezant':['Normal','Flying'],
        'blitzle':['Electric'],'zebstrika':['Electric'],
        'roggenrola':['Rock'],'boldore':['Rock'],'gigalith':['Rock'],
        'woobat':['Psychic','Flying'],'swoobat':['Psychic','Flying'],
        'drilbur':['Ground'],'excadrill':['Ground','Steel'],
        'audino':['Normal'],
        'timburr':['Fighting'],'gurdurr':['Fighting'],'conkeldurr':['Fighting'],
        'tympole':['Water'],'palpitoad':['Water','Ground'],'seismitoad':['Water','Ground'],
        'throh':['Fighting'],'sawk':['Fighting'],
        'sewaddle':['Bug','Grass'],'swadloon':['Bug','Grass'],'leavanny':['Bug','Grass'],
        'venipede':['Bug','Poison'],'whirlipede':['Bug','Poison'],'scolipede':['Bug','Poison'],
        'cottonee':['Grass','Fairy'],'whimsicott':['Grass','Fairy'],
        'petilil':['Grass'],'lilligant':['Grass'],
        'basculin':['Water'],'basculin-red-striped':['Water'],'basculin-blue-striped':['Water'],
        'sandile':['Ground','Dark'],'krokorok':['Ground','Dark'],'krookodile':['Ground','Dark'],
        'darumaka':['Fire'],'darmanitan':['Fire'],
        'maractus':['Grass'],
        'dwebble':['Bug','Rock'],'crustle':['Bug','Rock'],
        'scraggy':['Dark','Fighting'],'scrafty':['Dark','Fighting'],
        'sigilyph':['Psychic','Flying'],
        'yamask':['Ghost'],'cofagrigus':['Ghost'],
        'tirtouga':['Water','Rock'],'carracosta':['Water','Rock'],
        'archen':['Rock','Flying'],'archeops':['Rock','Flying'],
        'trubbish':['Poison'],'garbodor':['Poison'],
        'zorua':['Dark'],'zoroark':['Dark'],
        'minccino':['Normal'],'cinccino':['Normal'],
        'gothita':['Psychic'],'gothorita':['Psychic'],'gothitelle':['Psychic'],
        'solosis':['Psychic'],'duosion':['Psychic'],'reuniclus':['Psychic'],
        'ducklett':['Water','Flying'],'swanna':['Water','Flying'],
        'vanillite':['Ice'],'vanillish':['Ice'],'vanilluxe':['Ice'],
        'deerling':['Normal','Grass'],'sawsbuck':['Normal','Grass'],
        'emolga':['Electric','Flying'],
        'karrablast':['Bug'],'escavalier':['Bug','Steel'],
        'foongus':['Grass','Poison'],'amoonguss':['Grass','Poison'],
        'frillish':['Water','Ghost'],'jellicent':['Water','Ghost'],
        'alomomola':['Water'],
        'joltik':['Bug','Electric'],'galvantula':['Bug','Electric'],
        'ferroseed':['Grass','Steel'],'ferrothorn':['Grass','Steel'],
        'klink':['Steel'],'klang':['Steel'],'klinklang':['Steel'],
        'tynamo':['Electric'],'eelektrik':['Electric'],'eelektross':['Electric'],
        'elgyem':['Psychic'],'beheeyem':['Psychic'],
        'litwick':['Ghost','Fire'],'lampent':['Ghost','Fire'],'chandelure':['Ghost','Fire'],
        'axew':['Dragon'],'fraxure':['Dragon'],'haxorus':['Dragon'],
        'cubchoo':['Ice'],'beartic':['Ice'],
        'cryogonal':['Ice'],
        'shelmet':['Bug'],'accelgor':['Bug'],
        'stunfisk':['Ground','Electric'],
        'mienfoo':['Fighting'],'mienshao':['Fighting'],
        'druddigon':['Dragon'],
        'golett':['Ground','Ghost'],'golurk':['Ground','Ghost'],
        'pawniard':['Dark','Steel'],'bisharp':['Dark','Steel'],
        'bouffalant':['Normal'],
        'rufflet':['Normal','Flying'],'braviary':['Normal','Flying'],
        'vullaby':['Dark','Flying'],'mandibuzz':['Dark','Flying'],
        'heatmor':['Fire'],'durant':['Bug','Steel'],
        'deino':['Dark','Dragon'],'zweilous':['Dark','Dragon'],'hydreigon':['Dark','Dragon'],
        'larvesta':['Bug','Fire'],'volcarona':['Bug','Fire'],
        'cobalion':['Steel','Fighting'],'terrakion':['Rock','Fighting'],'virizion':['Grass','Fighting'],
        'tornadus':['Flying'],'tornadus-incarnate':['Flying'],'tornadus-therian':['Flying'],
        'thundurus':['Electric','Flying'],'thundurus-incarnate':['Electric','Flying'],'thundurus-therian':['Electric','Flying'],
        'landorus':['Ground','Flying'],'landorus-incarnate':['Ground','Flying'],'landorus-therian':['Ground','Flying'],
        'reshiram':['Dragon','Fire'],'zekrom':['Dragon','Electric'],
        'kyurem':['Dragon','Ice'],'kyurem-black':['Dragon','Ice'],'kyurem-white':['Dragon','Ice'],
        'keldeo':['Water','Fighting'],'keldeo-ordinary':['Water','Fighting'],'keldeo-resolute':['Water','Fighting'],
        'meloetta':['Normal','Psychic'],'meloetta-aria':['Normal','Psychic'],'meloetta-pirouette':['Normal','Fighting'],
        'genesect':['Bug','Steel'],
        // --- Gen 4 Starters ---
        'turtwig':['Grass'],'grotle':['Grass'],'torterra':['Grass','Ground'],
        'chimchar':['Fire'],'monferno':['Fire','Fighting'],'infernape':['Fire','Fighting'],
        'piplup':['Water'],'prinplup':['Water'],'empoleon':['Water','Steel'],
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║               🎒 ITEM TIER RANKINGS                         ║
    // ╚══════════════════════════════════════════════════════════════╝

    const ITEM_TIERS = {
        // S-Tier
        'shell bell': 'S', 'lucky egg': 'S', 'leftovers': 'S',
        'loaded dice': 'S', 'sacred ash': 'S',
        // A-Tier
        'assault vest': 'A', 'rocky helmet': 'A', 'choice band': 'A',
        'choice specs': 'A', 'rare candy': 'A', 'expert belt': 'A',
        'scope lens': 'A', 'quick claw': 'A', 'red card': 'A',
        'razor claw': 'A', 'life orb': 'A', 'power bracer': 'A',
        'tm normal': 'A', 'moon stone': 'A',
        // B-Tier
        'wide lens': 'B', 'choice scarf': 'B',
        'metronome': 'B',
        'spa specs': 'B', 'atk band': 'B',
        'charcoal': 'B', 'mystic water': 'B', 'magnet': 'B',
        'miracle seed': 'B', 'never melt ice': 'B', 'never-melt ice': 'B', 'black belt': 'B',
        'poison barb': 'B', 'soft sand': 'B', 'sharp beak': 'B',
        'twisted spoon': 'B', 'silver powder': 'B', 'hard stone': 'B',
        'spell tag': 'B', 'dragon fang': 'B', 'black glasses': 'B',
        'metal coat': 'B', 'silk scarf': 'B', 'pixie plate': 'B',
        // C-Tier
        // D-Tier
        'muscle band': 'D', 'wise glasses': 'D',
        'air balloon': 'D', 'focus sash': 'D',
        // F-Tier
        'lagging tail': 'F', 'kings rock': 'F', "king's rock": 'F',
        'eviolite': 'F', 'focus band': 'F',
    };

    const TIER_SCORE = { 'S': 100, 'A': 80, 'B': 60, 'C': 40, 'D': 20, 'F': 5 };

    const ITEM_TRANSLATIONS = {
        // v2.0 additions / ids
        'loaded dice': 'loaded dice', 'dados cargados': 'loaded dice',
        'sacred ash': 'sacred ash', 'ceniza sagrada': 'sacred ash', 'cenizas sagradas': 'sacred ash',
        'quick claw': 'quick claw', 'garra rapida': 'quick claw',
        'red card': 'red card', 'tarjeta roja': 'red card',
        'lagging tail': 'lagging tail', 'cola lastrada': 'lagging tail', 'cola rezagada': 'lagging tail', 'cola plumbea': 'lagging tail',
        'razor claw': 'razor claw', 'garra afilada': 'razor claw',
        'power bracer': 'power bracer', 'brazal firme': 'power bracer',
        'spa specs': 'spa specs', 'gafas esp': 'spa specs',
        'atk band': 'atk band', 'banda atk': 'atk band',
        'tm normal': 'tm normal', 'tmnormal': 'tm normal', 'mt normal': 'tm normal', 'mtnormal': 'tm normal',
        'tm': 'tm normal', 'mt': 'tm normal', 'move tutor': 'tm normal', 'movetutor': 'tm normal',
        'tutor': 'tm normal', 'tutor move': 'tm normal', 'tutor moves': 'tm normal',
        'tutor de movimientos': 'tm normal', 'tutor movimientos': 'tm normal',
        // S-Tier
        'concha cascabel': 'shell bell', 'conchacascabel': 'shell bell',
        'huevo suerte': 'lucky egg', 'huevosuerte': 'lucky egg',
        'restos': 'leftovers', 'leftlovers': 'leftovers', 'left over': 'leftovers',
        
        // A-Tier
        'chaleco asalto': 'assault vest', 'chalecoasalto': 'assault vest',
        'casco dentado': 'rocky helmet', 'cascodentado': 'rocky helmet',
        'cinta elección': 'choice band', 'cinta eleccion': 'choice band', 'cinta elegida': 'choice band',
        'gafas elección': 'choice specs', 'gafas eleccion': 'choice specs', 'gafas elegidas': 'choice specs',
        'caramelo raro': 'rare candy', 'carameloraro': 'rare candy',
        
        // B-Tier
        'periscopio': 'scope lens',
        'lupa': 'wide lens',
        'pañuelo elección': 'choice scarf', 'pañuelo eleccion': 'choice scarf', 'pañuelo elegido': 'choice scarf',
        'carbón': 'charcoal', 'carbon': 'charcoal',
        'agua mística': 'mystic water', 'agua mistica': 'mystic water',
        'imán': 'magnet', 'iman': 'magnet',
        'semilla milagro': 'miracle seed',
        'antiderretidor': 'never-melt ice', 'nunca derretir hielo': 'never-melt ice',
        'cinturón negro': 'black belt', 'cinturon negro': 'black belt',
        'colmillo veneno': 'poison barb', 'veneno afilado': 'poison barb', 'pua venenosa': 'poison barb', 'púa venenosa': 'poison barb',
        'arena fina': 'soft sand',
        'pico afilado': 'sharp beak',
        'cuchara torcida': 'twisted spoon',
        'polvo plata': 'silver powder', 'polvo de plata': 'silver powder',
        'piedra dura': 'hard stone',
        'hechizo': 'spell tag',
        'colmillo dragón': 'dragon fang', 'colmillo dragon': 'dragon fang',
        'gafas de sol': 'black glasses', 'gafas negras': 'black glasses',
        'revestimiento metálico': 'metal coat', 'revestimiento metalico': 'metal coat',
        'pañuelo seda': 'silk scarf', 'pañuelo de seda': 'silk scarf',
        'tabla duendecillo': 'pixie plate',
        
        // C-Tier
        'mineral evolutivo': 'eviolite', 'mineral evolución': 'eviolite', 'mineral evolucion': 'eviolite',
        'vidaesfera': 'life orb', 'esfera de vida': 'life orb', 'vidasfera': 'life orb',
        'cinturón experto': 'expert belt', 'cinturon experto': 'expert belt',
        'cinta focus': 'focus band', 'cinta de enfoque': 'focus band', 'banda de enfoque': 'focus band',
        'piedra lunar': 'moon stone', 'piedra de luna': 'moon stone',
        'roca del rey': 'kings rock', 'roca rey': 'kings rock', 'corona': 'kings rock',
        
        // D-Tier
        'banda focus': 'focus sash', 'banda de enfoque': 'focus sash', 'cinta de focus': 'focus sash',
        'cinta fuerte': 'muscle band',
        'gafas especiales': 'wise glasses', 'gafas de sabio': 'wise glasses',
        'globo helio': 'air balloon', 'globo de helio': 'air balloon',
        
        // F-Tier
        'metrónomo': 'metronome', 'metronomo': 'metronome',
    };

    function foldText(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeItemName(name) {
        if (!name) return '';
        let clean = name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        if (ITEM_TRANSLATIONS[clean]) {
            clean = ITEM_TRANSLATIONS[clean];
        } else {
            const folded = foldText(clean);
            if (ITEM_TRANSLATIONS[folded]) {
                clean = ITEM_TRANSLATIONS[folded];
            }
        }
        return clean;
    }

    function getItemNameFromElement(element) {
        if (!element) return '';
        const textName = element.querySelector?.('.item-name, [class*="item-name"], [class*="name"]')?.innerText || '';
        if (textName) return normalizeItemName(textName);

        const img = element.tagName === 'IMG' ? element : element.querySelector?.('img[src*="items/"], img');
        const imageName = img ? (img.alt || img.title || '') : '';
        if (imageName) return normalizeItemName(imageName);

        const src = img ? (img.src || img.getAttribute('src') || '') : '';
        const match = src.match(/\/items\/([^\/\.]+)/);
        if (match) return normalizeItemName(match[1]);

        return normalizeItemName(element.innerText || element.getAttribute?.('aria-label') || element.getAttribute?.('title') || '');
    }

    function getItemNameFromModal(modal, fallbackName = '') {
        if (!modal) return normalizeItemName(fallbackName || '');
        const candidates = [];
        const itemImage = modal.querySelector('img[src*="items/"]');
        if (itemImage) {
            const src = itemImage.src || itemImage.getAttribute('src') || '';
            const match = src.match(/\/items\/([^\/\.]+)/);
            if (match) candidates.push(match[1]);
            candidates.push(itemImage.alt || '', itemImage.title || '');
        }

        modal.querySelectorAll('.equip-item-name, [class*="item-name"]').forEach(el => {
            candidates.push(el.innerText || el.textContent || '');
        });
        if (fallbackName) candidates.push(fallbackName);
        modal.querySelectorAll('.modal-title, [class*="modal-title"], [class*="title"]').forEach(el => {
            candidates.push(el.innerText || el.textContent || '');
        });

        for (const candidate of candidates) {
            const normalized = normalizeItemName(candidate);
            if (isKnownItemName(normalized)) return normalized;
        }

        return normalizeItemName(fallbackName || '');
    }

    const ITEM_TYPE_MATCH = {
        'charcoal': 'Fire',
        'mystic water': 'Water',
        'magnet': 'Electric',
        'miracle seed': 'Grass',
        'never melt ice': 'Ice',
        'never-melt ice': 'Ice',
        'black belt': 'Fighting',
        'poison barb': 'Poison',
        'soft sand': 'Ground',
        'sharp beak': 'Flying',
        'twisted spoon': 'Psychic',
        'silver powder': 'Bug',
        'hard stone': 'Rock',
        'spell tag': 'Ghost',
        'dragon fang': 'Dragon',
        'black glasses': 'Dark',
        'metal coat': 'Steel',
        'silk scarf': 'Normal',
        'pixie plate': 'Fairy',
    };

    const USABLE_ITEMS = new Set(['rare candy', 'moon stone', 'sacred ash', 'tm normal']);
    const LOW_VALUE_HELD_ITEMS = new Set([
        'lagging tail', 'kings rock', "king's rock", 'eviolite',
        'focus band', 'focus sash', 'air balloon'
    ]);

    function isKnownItemName(itemName) {
        itemName = normalizeItemName(itemName);
        return Boolean(
            itemName &&
            itemName !== 'unknown item' &&
            (
                ITEM_TIERS[itemName] ||
                USABLE_ITEMS.has(itemName) ||
                LOW_VALUE_HELD_ITEMS.has(itemName) ||
                ITEM_TYPE_MATCH[itemName]
            )
        );
    }

    const MAIN_CARRY_SUSTAIN_ITEMS = new Set(['leftovers', 'shell bell']);
    const MAIN_CARRY_OFFENSE_ITEMS = new Set(['choice band', 'choice specs', 'atk band', 'spa specs', 'life orb']);
    const SWEEPER_TYPES = ['Fire','Dragon','Dark','Psychic','Fighting','Electric','Ghost','Flying'];
    const TANK_TYPES = ['Steel','Rock','Normal','Water','Grass','Poison'];
    const PHYSICAL_TYPES = ['Normal','Fighting','Ground','Rock','Bug','Steel','Flying','Poison','Dark'];
    const SPECIAL_TYPES = ['Fire','Water','Electric','Grass','Ice','Psychic','Ghost','Dragon','Fairy'];

    // Verified from Pokelike's current MOVE_POOL bundle data.
    const POKELIKE_MOVE_POOL = {
        Normal:   { physical: [['Tackle',40],['Body Slam',85],['Giga Impact',150]], special: [['Swift',60],['Hyper Voice',90],['Boomburst',140]] },
        Fire:     { physical: [['Ember',60],['Fire Punch',75],['Flare Blitz',120]], special: [['Incinerate',60],['Flamethrower',90],['Fire Blast',110]] },
        Water:    { physical: [['Water Gun',50],['Waterfall',80],['Aqua Tail',110]], special: [['Bubble',50],['Surf',80],['Hydro Pump',110]] },
        Electric: { physical: [['Spark',40],['Thunder Punch',75],['Bolt Strike',130]], special: [['Thunder Shock',40],['Thunderbolt',90],['Thunder',110]] },
        Grass:    { physical: [['Vine Whip',40],['Razor Leaf',65],['Power Whip',120]], special: [['Magical Leaf',40],['Energy Ball',90],['Solar Beam',120]] },
        Ice:      { physical: [['Powder Snow',40],['Ice Punch',75],['Icicle Crash',110]], special: [['Icy Wind',40],['Ice Beam',90],['Blizzard',110]] },
        Fighting: { physical: [['Karate Chop',50],['Cross Chop',100],['Close Combat',120]], special: [['Force Palm',60],['Aura Sphere',80],['Focus Blast',120]] },
        Poison:   { physical: [['Poison Sting',40],['Poison Jab',90],['Gunk Shot',130]], special: [['Acid',40],['Sludge Bomb',100],['Acid Spray',120]] },
        Ground:   { physical: [['Mud Shot',55],['Earthquake',100],['Precipice Blades',120]], special: [['Bulldoze',60],['Earth Power',90],["Land's Wrath",110]] },
        Flying:   { physical: [['Peck',50],['Aerial Ace',60],['Sky Attack',140]], special: [['Gust',40],['Air Slash',75],['Hurricane',110]] },
        Psychic:  { physical: [['Confusion',50],['Zen Headbutt',80],['Psycho Boost',140]], special: [['Psybeam',65],['Psychic',90],['Psystrike',100]] },
        Bug:      { physical: [['Bug Bite',60],['X-Scissor',80],['Megahorn',120]], special: [['Struggle Bug',50],['Bug Buzz',90],['Pollen Puff',110]] },
        Rock:     { physical: [['Rock Throw',50],['Rock Slide',75],['Stone Edge',100]], special: [['Smack Down',50],['Power Gem',80],['Rock Wrecker',150]] },
        Ghost:    { physical: [['Astonish',40],['Shadow Claw',70],['Phantom Force',90]], special: [['Lick',40],['Shadow Ball',80],['Shadow Force',100]] },
        Dragon:   { physical: [['Twister',40],['Dragon Claw',80],['Outrage',120]], special: [['Dragon Breath',60],['Dragon Pulse',85],['Draco Meteor',130]] },
        Dark:     { physical: [['Bite',40],['Crunch',80],['Knock Off',120]], special: [['Snarl',40],['Dark Pulse',80],['Night Daze',110]] },
        Steel:    { physical: [['Metal Claw',50],['Iron Tail',100],['Heavy Slam',130]], special: [['Steel Wing',60],['Flash Cannon',90],['Doom Desire',140]] },
        Fairy:    { physical: [['Fairy Wind',40],['Play Rough',90],['Spirit Break',130]], special: [['Disarming Voice',40],['Dazzling Gleam',80],['Moonblast',130]] },
    };

    const POKEMON_STAT_OVERRIDES = {
        turtwig: { hp: 55, atk: 68, def: 64, speed: 31, special: 45, spdef: 55 },
        grotle: { hp: 75, atk: 89, def: 85, speed: 36, special: 55, spdef: 65 },
        torterra: { hp: 95, atk: 109, def: 105, speed: 56, special: 75, spdef: 85 },
        chimchar: { hp: 44, atk: 58, def: 44, speed: 61, special: 58, spdef: 44 },
        monferno: { hp: 64, atk: 78, def: 52, speed: 81, special: 78, spdef: 52 },
        infernape: { hp: 76, atk: 104, def: 71, speed: 108, special: 104, spdef: 71 },
        piplup: { hp: 53, atk: 51, def: 53, speed: 40, special: 61, spdef: 56 },
        prinplup: { hp: 64, atk: 66, def: 68, speed: 50, special: 81, spdef: 76 },
        empoleon: { hp: 84, atk: 86, def: 88, speed: 60, special: 111, spdef: 101 },
        genesect: { hp: 71, atk: 120, def: 95, speed: 99, special: 120, spdef: 95 },
        thundurus: { hp: 79, atk: 115, def: 70, speed: 111, special: 125, spdef: 80 },
        'thundurus-incarnate': { hp: 79, atk: 115, def: 70, speed: 111, special: 125, spdef: 80 },
        'thundurus-therian': { hp: 79, atk: 105, def: 70, speed: 101, special: 145, spdef: 80 },
        serperior: { hp: 75, atk: 75, def: 95, speed: 113, special: 75, spdef: 95 },
        emboar: { hp: 110, atk: 123, def: 65, speed: 65, special: 100, spdef: 65 },
        samurott: { hp: 95, atk: 100, def: 85, speed: 70, special: 108, spdef: 70 },
        stoutland: { hp: 85, atk: 110, def: 90, speed: 80, special: 45, spdef: 90 },
        excadrill: { hp: 110, atk: 135, def: 60, speed: 88, special: 50, spdef: 65 },
        conkeldurr: { hp: 105, atk: 140, def: 95, speed: 45, special: 55, spdef: 65 },
        seismitoad: { hp: 105, atk: 95, def: 75, speed: 74, special: 85, spdef: 75 },
        scolipede: { hp: 60, atk: 100, def: 89, speed: 112, special: 55, spdef: 69 },
        krookodile: { hp: 95, atk: 117, def: 80, speed: 92, special: 65, spdef: 70 },
        darmanitan: { hp: 105, atk: 140, def: 55, speed: 95, special: 30, spdef: 55 },
        scrafty: { hp: 65, atk: 90, def: 115, speed: 58, special: 45, spdef: 115 },
        archeops: { hp: 75, atk: 140, def: 65, speed: 110, special: 112, spdef: 65 },
        zoroark: { hp: 60, atk: 105, def: 60, speed: 105, special: 120, spdef: 60 },
        reuniclus: { hp: 110, atk: 65, def: 75, speed: 30, special: 125, spdef: 85 },
        chandelure: { hp: 60, atk: 55, def: 90, speed: 80, special: 145, spdef: 90 },
        haxorus: { hp: 76, atk: 147, def: 90, speed: 97, special: 60, spdef: 70 },
        mienshao: { hp: 65, atk: 125, def: 60, speed: 105, special: 95, spdef: 60 },
        bisharp: { hp: 65, atk: 125, def: 100, speed: 70, special: 60, spdef: 70 },
        braviary: { hp: 100, atk: 123, def: 75, speed: 80, special: 57, spdef: 75 },
        mandibuzz: { hp: 110, atk: 65, def: 105, speed: 80, special: 55, spdef: 95 },
        hydreigon: { hp: 92, atk: 105, def: 90, speed: 98, special: 125, spdef: 90 },
        volcarona: { hp: 85, atk: 60, def: 65, speed: 100, special: 135, spdef: 105 },
        landorus: { hp: 89, atk: 125, def: 90, speed: 101, special: 115, spdef: 80 },
        reshiram: { hp: 100, atk: 120, def: 100, speed: 90, special: 150, spdef: 120 },
        zekrom: { hp: 100, atk: 150, def: 120, speed: 90, special: 120, spdef: 100 },
        kyurem: { hp: 125, atk: 130, def: 90, speed: 95, special: 130, spdef: 90 },
    };

    const POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES = {
        thundurus: 'Electric',
        'thundurus-incarnate': 'Electric',
        'thundurus-therian': 'Electric',
        serperior: 'Grass',
        emboar: 'Fire',
        samurott: 'Water',
        excadrill: 'Ground',
        conkeldurr: 'Fighting',
        seismitoad: 'Water',
        krookodile: 'Ground',
        darmanitan: 'Fire',
        archeops: 'Rock',
        zoroark: 'Dark',
        chandelure: 'Ghost',
        haxorus: 'Dragon',
        mienshao: 'Fighting',
        bisharp: 'Dark',
        hydreigon: 'Dark',
        volcarona: 'Fire',
        reshiram: 'Fire',
        zekrom: 'Electric',
        kyurem: 'Ice',
        sharpedo: 'Water',
    };

    const PASSIVE_TYPE_TERMS = {
        normal: 'Normal', fire: 'Fire', fuego: 'Fire', water: 'Water', agua: 'Water',
        electric: 'Electric', electrico: 'Electric', grass: 'Grass', planta: 'Grass',
        ice: 'Ice', hielo: 'Ice', fighting: 'Fighting', lucha: 'Fighting',
        poison: 'Poison', veneno: 'Poison', ground: 'Ground', tierra: 'Ground',
        flying: 'Flying', volador: 'Flying', psychic: 'Psychic', psiquico: 'Psychic',
        bug: 'Bug', bicho: 'Bug', rock: 'Rock', roca: 'Rock',
        ghost: 'Ghost', fantasma: 'Ghost', dragon: 'Dragon', dark: 'Dark',
        siniestro: 'Dark', steel: 'Steel', acero: 'Steel', fairy: 'Fairy', hada: 'Fairy'
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║           🦊 EEVEE EVOLUTION DATA                           ║
    // ╚══════════════════════════════════════════════════════════════╝

    const EEVEE_EVOLUTIONS = {
        'Vaporeon':  'Water',
        'Jolteon':   'Electric',
        'Flareon':   'Fire',
        'Espeon':    'Psychic',
        'Umbreon':   'Dark',
        'Leafeon':   'Grass',
        'Glaceon':   'Ice',
        'Sylveon':   'Fairy',
    };

    // ╔══════════════════════════════════════════════════════════════╗
