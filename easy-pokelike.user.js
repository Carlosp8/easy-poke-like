// ==UserScript==
// @name         Pokelike.xyz Tower Engine 8.7 (Sinnoh Run AI)
// @namespace    http://tampermonkey.net/
// @version      8.7
// @description  Motor de automatización completo para Battle Tower: carry protegido, counters anti-Metagross, final boss prep, masterball scouting, traits, items, y auto-restart.
// @match        *://*.pokelike.xyz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- Hook setPointerCapture/releasePointerCapture to swallow NotFoundError from synthetic events ---
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function(pointerId) {
        try {
            if (originalSetPointerCapture) {
                originalSetPointerCapture.call(this, pointerId);
            }
        } catch (e) {
            if (e.name === 'NotFoundError') {
                console.warn('[Engine7] Swallowed setPointerCapture NotFoundError for pointerId:', pointerId);
            } else {
                throw e;
            }
        }
    };

    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.releasePointerCapture = function(pointerId) {
        try {
            if (originalReleasePointerCapture) {
                originalReleasePointerCapture.call(this, pointerId);
            }
        } catch (e) {
            if (e.name === 'NotFoundError') {
                console.warn('[Engine7] Swallowed releasePointerCapture NotFoundError for pointerId:', pointerId);
            } else {
                throw e;
            }
        }
    };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║                    ⚙️ CONFIGURATION                         ║
    // ╚══════════════════════════════════════════════════════════════╝

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
        RUN_HISTORY_STORAGE_KEY: 'engine7_run_history_v1',
        RUN_HISTORY_MAX_ENTRIES: 80,
        RUN_EVENT_LOG_MAX_ENTRIES: 160,
        BOT_CONTROL_STORAGE_KEY: 'engine7_bot_controls_v1',
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
        DUPLICATE_FIRST_PAIR_CATCH_BONUS: 28,
        DUPLICATE_EXTRA_PAIR_CATCH_BONUS: 12,
        DUPLICATE_EXISTING_PAIR_CATCH_BONUS: 10,
        DUPLICATE_PAIR_ROUTE_BONUS: 260,
        DUPLICATE_PAIR_KEEP_BONUS: 34,
        DUPLICATE_PAIR_REVIVE_BONUS: 18,
        DUPLICATE_PAIR_CREATE_SWAP_BONUS: 26,
        DUPLICATE_PAIR_PROTECT_SCORE: 18,
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
        // Generic fallbacks
        'blue': 'Normal', 'gary': 'Normal', 'red': 'Fire',
    };

    const BOSS_TEAM_DB = {
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
        arceus: {
            name: 'Arceus',
            types: ['Normal'],
            team: [
                { name: 'arceus', types: ['Normal'], passiveTier: 1, passives: TYPES },
            ]
        },
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
        'seedot':['Grass'],'nuzleaf':['Grass','Dark'],'shiftry':['Grass','Dark'],
        'zigzagoon':['Normal'],'linoone':['Normal'],'slakoth':['Normal'],
        'vigoroth':['Normal'],'slaking':['Normal'],
        'makuhita':['Fighting'],'hariyama':['Fighting'],
        'aron':['Steel','Rock'],'lairon':['Steel','Rock'],'aggron':['Steel','Rock'],
        'meditite':['Fighting','Psychic'],'medicham':['Fighting','Psychic'],
        'electrike':['Electric'],'manectric':['Electric'],
        'gulpin':['Poison'],'swalot':['Poison'],
        'carvanha':['Water','Dark'],'sharpedo':['Water','Dark'],
        'wailmer':['Water'],'wailord':['Water'],
        'numel':['Fire','Ground'],'camerupt':['Fire','Ground'],
        'spinda':['Normal'],'trapinch':['Ground'],'vibrava':['Ground','Dragon'],
        'flygon':['Ground','Dragon'],
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
        'victini':['Psychic','Fire'],'cobalion':['Steel','Fighting'],'terrakion':['Rock','Fighting'],
        'virizion':['Grass','Fighting'],'tornadus':['Flying'],'landorus':['Ground','Flying'],
        'reshiram':['Dragon','Fire'],'zekrom':['Dragon','Electric'],'kyurem':['Dragon','Ice'],
        'keldeo':['Water','Fighting'],'meloetta':['Normal','Psychic'],
        'thundurus':['Electric','Flying'],'thundurus-incarnate':['Electric','Flying'],'thundurus-therian':['Electric','Flying'],
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
        'tm normal': 'A',
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
        'moon stone': 'C',
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
        'tm normal': 'tm normal', 'tmnormal': 'tm normal', 'mt normal': 'tm normal', 'mtnormal': 'tm normal', 'tm': 'tm normal', 'mt': 'tm normal',
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
    };

    const POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES = {
        thundurus: 'Electric',
        'thundurus-incarnate': 'Electric',
        'thundurus-therian': 'Electric',
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
    // ║             🔧 ENGINE STATE                                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    let lastLoggedState = '';
    let stuckCounter = 0;
    let lastStateForStuck = '';
    let lastMapDecisionFingerprint = '';
    let lastCatchRerollSignature = '';
    let lastCatchRerollAt = 0;
    let catchRerollAttemptsBySignature = {};
    let catchScreenSessionActive = false;
    let catchRerollsThisEncounter = 0;
    let sinnohCarryKnownTmTiers = {};
    let lastChosenItemName = '';
    let baggedItemCooldowns = {};
    let pokemonRuntimeInfoCache = {};
    let currentRunTelemetry = null;
    let lastRunFinalizedAt = 0;
    let currentMapKey = '';
    let capturesThisMap = 0;
    let lastMapClickSignature = '';
    let repeatedMapClickCount = 0;
    let activeAutoRunMode = null;
    let activeChallengeContext = null;
    let lastTeamReorderSignature = '';
    let lastTeamReorderAt = 0;
    let teamReorderAttemptsBySignature = {};
    const BOT_CONTROL_TACTICS = {
        auto: 'Auto',
        boss: 'Boss prep',
        capture: 'Captura',
        xp: 'XP',
        duplicate: 'Duplicados'
    };
    const BOT_CONTROL_RUN_MODES = {
        battleTower: 'Torre batalla',
        story: 'Historia',
        weeklyChallenges: 'Desafio semanal',
        challengeMode: 'Desafio',
        auto: 'Auto config',
        manual: 'Manual'
    };
    const BOT_CONTROL_DEFAULT_STATE = {
        paused: false,
        tactic: 'auto',
        runMode: 'battleTower',
        mapPreference: '',
        mainCarryKey: '',
        lockedKeys: [],
        panel: { x: 16, y: 128 },
        collapsed: false,
        starterMode: 'auto',
        autoRestart: CONFIG.AUTO_RESTART,
        starterPreference: ''
    };
    let botControlState = null;
    let botControlPanel = null;
    let botControlLastRenderSignature = '';
    let engineStats = { loops: 0, screens: {}, catches: 0, items: 0, swaps: 0, rerolls: 0 };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║         📢 LOGGING SYSTEM                                   ║
    // ╚══════════════════════════════════════════════════════════════╝

    const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

    function log(level, emoji, msg) {
        if (LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.LOG_LEVEL]) {
            console.log(`${emoji} [Engine7] ${msg}`);
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║    🎛️ PHYSICS ENGINE (Click Simulation & Drag/Drop)         ║
    // ╚══════════════════════════════════════════════════════════════╝

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeBotControlState(raw = {}) {
        raw = raw && typeof raw === 'object' ? raw : {};
        return {
            ...BOT_CONTROL_DEFAULT_STATE,
            ...raw,
            tactic: BOT_CONTROL_TACTICS[raw.tactic] ? raw.tactic : BOT_CONTROL_DEFAULT_STATE.tactic,
            runMode: BOT_CONTROL_RUN_MODES[raw.runMode] ? raw.runMode : BOT_CONTROL_DEFAULT_STATE.runMode,
            mapPreference: raw.mapPreference || '',
            mainCarryKey: raw.mainCarryKey || '',
            lockedKeys: Array.isArray(raw.lockedKeys) ? [...new Set(raw.lockedKeys.filter(Boolean))] : [],
            panel: {
                x: Number.isFinite(raw?.panel?.x) ? raw.panel.x : BOT_CONTROL_DEFAULT_STATE.panel.x,
                y: Number.isFinite(raw?.panel?.y) ? raw.panel.y : BOT_CONTROL_DEFAULT_STATE.panel.y
            },
            collapsed: Boolean(raw.collapsed),
            paused: Boolean(raw.paused),
            starterMode: ['auto', 'manual', 'preferred'].includes(raw.starterMode)
                ? raw.starterMode
                : (raw.starterPreference ? 'preferred' : BOT_CONTROL_DEFAULT_STATE.starterMode),
            autoRestart: raw.autoRestart === undefined ? CONFIG.AUTO_RESTART : Boolean(raw.autoRestart),
            starterPreference: raw.starterPreference || ''
        };
    }

    function getBotControlState() {
        if (botControlState) return botControlState;
        try {
            botControlState = normalizeBotControlState(JSON.parse(localStorage.getItem(CONFIG.BOT_CONTROL_STORAGE_KEY) || '{}'));
        } catch (e) {
            botControlState = normalizeBotControlState();
        }
        return botControlState;
    }

    function saveBotControlState() {
        try {
            localStorage.setItem(CONFIG.BOT_CONTROL_STORAGE_KEY, JSON.stringify(getBotControlState()));
        } catch (e) {
            log('warn', 'controls', `Could not save controls: ${e.message}`);
        }
    }

    function updateBotControlState(patch = {}) {
        botControlState = normalizeBotControlState({ ...getBotControlState(), ...patch });
        saveBotControlState();
        botControlLastRenderSignature = '';
    }

    function getBotControlTactic() {
        return getBotControlState().tactic || 'auto';
    }

    function getBotControlRunMode() {
        return getBotControlState().runMode || BOT_CONTROL_DEFAULT_STATE.runMode;
    }

    function getBotControlMapPreference() {
        return foldText(getBotControlState().mapPreference || '');
    }

    function isBotPaused() {
        return Boolean(getBotControlState().paused);
    }

    function getBotControlSelectedMainKey() {
        return getBotControlState().mainCarryKey || '';
    }

    function getBotControlAutoRestartEnabled() {
        return Boolean(getBotControlState().autoRestart);
    }

    function isBotControlLockedKey(key) {
        return Boolean(key && getBotControlState().lockedKeys.includes(key));
    }

    function isBotControlLockedUnit(unit) {
        return Boolean(unit && isBotControlLockedKey(getPokemonIdentityKey(unit.name)));
    }

    function toggleBotControlLockedKey(key) {
        if (!key) return;
        const state = getBotControlState();
        const locked = new Set(state.lockedKeys || []);
        if (locked.has(key)) locked.delete(key);
        else locked.add(key);
        updateBotControlState({ lockedKeys: [...locked] });
    }

    function getBotControlTeamSignature(team) {
        return (team || []).map(unit => [
            unit.index,
            getPokemonIdentityKey(unit.name),
            unit.name,
            unit.hp || 0,
            unit.level || 0,
            unit.isFainted ? 'F' : 'A',
            unit.heldItem || ''
        ].join(':')).join('|');
    }

    function getPokemonSpriteSrcFromUnit(unit) {
        const img = unit?.element?.querySelector('img.poke-sprite, .poke-sprite-wrap img, img');
        return img ? (img.src || img.getAttribute('src') || '') : '';
    }

    function getBotControlPanelHtml(team) {
        const state = getBotControlState();
        const mainKey = state.mainCarryKey || '';
        const locked = new Set(state.lockedKeys || []);
        const tacticOptions = Object.entries(BOT_CONTROL_TACTICS).map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.tactic === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const runModeOptions = Object.entries(BOT_CONTROL_RUN_MODES).map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.runMode === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const starterModeOptions = [
            ['auto', 'Auto IA'],
            ['preferred', 'Forzar nombre'],
            ['manual', 'Jugador']
        ].map(([key, label]) => {
            return `<option value="${escapeHtml(key)}"${state.starterMode === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
        const mainOptions = [
            `<option value=""${!mainKey ? ' selected' : ''}>Auto</option>`,
            ...(team || []).map(unit => {
                const key = getPokemonIdentityKey(unit.name);
                const label = `${unit.name || 'slot'} Lv${unit.level || 0}`;
                return `<option value="${escapeHtml(key)}"${mainKey === key ? ' selected' : ''}>${escapeHtml(label)}</option>`;
            })
        ].join('');
        const slots = (team || []).map(unit => {
            const key = getPokemonIdentityKey(unit.name);
            const sprite = getPokemonSpriteSrcFromUnit(unit);
            const isMain = mainKey ? mainKey === key : isMainCarryUnit(unit);
            const isLocked = locked.has(key);
            const hp = Math.max(0, Math.min(100, unit.hp || 0));
            const spriteHtml = sprite
                ? `<img class="e7c-slot-img" src="${escapeHtml(sprite)}" alt="">`
                : `<span class="e7c-slot-fallback">${escapeHtml((unit.name || '?').slice(0, 2).toUpperCase())}</span>`;
            return `
                <div class="e7c-slot${isMain ? ' is-main' : ''}${isLocked ? ' is-locked' : ''}" data-key="${escapeHtml(key)}">
                    <button class="e7c-icon-btn e7c-main-btn" data-action="main" data-key="${escapeHtml(key)}" title="Principal">${isMain ? 'M' : '+'}</button>
                    <div class="e7c-avatar">${spriteHtml}</div>
                    <div class="e7c-slot-meta">
                        <div class="e7c-name">${escapeHtml(unit.name || 'unknown')}</div>
                        <div class="e7c-sub">Lv${unit.level || 0} / ${hp}%</div>
                        <div class="e7c-hp"><span style="width:${hp}%"></span></div>
                    </div>
                    <button class="e7c-icon-btn e7c-lock-btn" data-action="lock" data-key="${escapeHtml(key)}" title="No reemplazar">${isLocked ? 'Lock' : 'Free'}</button>
                </div>
            `;
        }).join('') || '<div class="e7c-empty">Sin equipo visible</div>';

        return `
            <div class="e7c-head" data-drag-handle="true">
                <button class="e7c-icon-btn e7c-play" data-action="pause" data-short="${state.paused ? '>' : '||'}" title="${state.paused ? 'Reanudar' : 'Pausar'}">${state.paused ? 'Play' : 'Pause'}</button>
                <strong>Engine 7</strong>
                <button class="e7c-icon-btn" data-action="collapse" title="Plegar">${state.collapsed ? '+' : '-'}</button>
            </div>
            <div class="e7c-body"${state.collapsed ? ' hidden' : ''}>
                <label class="e7c-field">Modo run
                    <select data-action="run-mode">${runModeOptions}</select>
                </label>
                <label class="e7c-field">Mapa/region
                    <input type="text" data-action="map-input" value="${escapeHtml(state.mapPreference || '')}" placeholder="Auto o texto (ej: Sinnoh/Lorelei)" style="width:100%;min-height:30px;color:#f8fafc;background:#111827;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 8px;">
                </label>
                <label class="e7c-field">Tactica
                    <select data-action="tactic">${tacticOptions}</select>
                </label>
                <label class="e7c-field">Principal
                    <select data-action="main-select">${mainOptions}</select>
                </label>
                <label class="e7c-field">Starter
                    <select data-action="starter-mode">${starterModeOptions}</select>
                </label>
                <label class="e7c-field">Nombre starter
                    <input type="text" data-action="starter-input" value="${escapeHtml(state.starterPreference || '')}" placeholder="Nombre (ej: Dialga)" style="width:100%;min-height:30px;color:#f8fafc;background:#111827;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 8px;">
                </label>
                <label class="e7c-check">
                    <input type="checkbox" data-action="auto-restart"${state.autoRestart ? ' checked' : ''}>
                    <span>Restart automatico</span>
                </label>
                <div class="e7c-team">${slots}</div>
            </div>
        `;
    }

    function injectBotControlStyles() {
        if (document.getElementById('engine7-control-style')) return;
        const style = document.createElement('style');
        style.id = 'engine7-control-style';
        style.textContent = `
            #engine7-control-panel { position: fixed; z-index: 2147483647; width: min(330px, calc(100vw - 24px)); max-height: min(620px, calc(100vh - 24px)); overflow: hidden; background: rgba(18,24,31,.94); color: #f7fafc; border: 1px solid rgba(255,255,255,.18); box-shadow: 0 14px 36px rgba(0,0,0,.35); border-radius: 8px; font: 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
            #engine7-control-panel.is-collapsed { width: auto; max-width: calc(100vw - 12px); max-height: 42px; }
            #engine7-control-panel * { box-sizing: border-box; }
            .e7c-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 8px; cursor: move; background: rgba(255,255,255,.08); user-select: none; }
            #engine7-control-panel.is-collapsed .e7c-head { grid-template-columns: auto auto; gap: 6px; padding: 6px; }
            .e7c-head strong { font-size: 13px; letter-spacing: 0; }
            #engine7-control-panel.is-collapsed .e7c-head strong { display: none; }
            .e7c-body { display: grid; gap: 8px; padding: 8px; overflow: auto; max-height: 560px; }
            .e7c-field { display: grid; gap: 4px; color: #cbd5e1; }
            .e7c-field select { width: 100%; min-height: 30px; color: #f8fafc; background: #111827; border: 1px solid rgba(255,255,255,.2); border-radius: 6px; padding: 4px 8px; }
            .e7c-check { display: flex; align-items: center; gap: 8px; min-height: 28px; color: #cbd5e1; }
            .e7c-check input { width: 16px; height: 16px; accent-color: #74d680; }
            .e7c-team { display: grid; gap: 6px; }
            .e7c-slot { display: grid; grid-template-columns: 32px 38px minmax(0,1fr) 50px; gap: 6px; align-items: center; padding: 6px; border: 1px solid rgba(255,255,255,.12); border-radius: 7px; background: rgba(255,255,255,.05); }
            .e7c-slot.is-main { border-color: #74d680; background: rgba(43,138,62,.18); }
            .e7c-slot.is-locked { box-shadow: inset 3px 0 0 #facc15; }
            .e7c-avatar { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 6px; background: rgba(255,255,255,.08); overflow: hidden; }
            .e7c-slot-img { max-width: 36px; max-height: 36px; object-fit: contain; }
            .e7c-slot-fallback { font-weight: 700; color: #e2e8f0; }
            .e7c-slot-meta { min-width: 0; }
            .e7c-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f8fafc; }
            .e7c-sub { color: #a7b4c4; font-size: 11px; }
            .e7c-hp { height: 4px; margin-top: 4px; border-radius: 4px; background: rgba(255,255,255,.14); overflow: hidden; }
            .e7c-hp span { display: block; height: 100%; background: #4ade80; }
            .e7c-icon-btn { min-width: 30px; min-height: 28px; border: 1px solid rgba(255,255,255,.18); border-radius: 6px; color: #f8fafc; background: rgba(255,255,255,.08); cursor: pointer; font: inherit; }
            .e7c-icon-btn:hover { background: rgba(255,255,255,.16); }
            #engine7-control-panel.is-collapsed .e7c-icon-btn { width: 32px; min-width: 32px; padding: 0; overflow: hidden; white-space: nowrap; }
            #engine7-control-panel.is-collapsed .e7c-play { font-size: 0; }
            #engine7-control-panel.is-collapsed .e7c-play::after { content: attr(data-short); font-size: 12px; }
            .e7c-lock-btn { width: 50px; }
            .e7c-empty { color: #a7b4c4; padding: 10px; text-align: center; }
            @media (max-width: 520px) {
                #engine7-control-panel { width: min(330px, calc(100vw - 12px)); max-height: calc(100vh - 12px); }
                .e7c-body { max-height: calc(100vh - 58px); }
            }
        `;
        document.head?.appendChild(style);
    }

    function attachBotControlHandlers(panel) {
        panel.onclick = event => {
            const button = event.target.closest('[data-action]');
            if (!button || !panel.contains(button)) return;
            const action = button.getAttribute('data-action');
            if (action === 'pause') {
                updateBotControlState({ paused: !getBotControlState().paused });
            } else if (action === 'collapse') {
                updateBotControlState({ collapsed: !getBotControlState().collapsed });
            } else if (action === 'lock') {
                toggleBotControlLockedKey(button.getAttribute('data-key'));
            } else if (action === 'main') {
                const key = button.getAttribute('data-key') || '';
                updateBotControlState({ mainCarryKey: getBotControlState().mainCarryKey === key ? '' : key });
            }
            renderBotControlPanel(true);
        };
        panel.onchange = event => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'run-mode') updateBotControlState({ runMode: target.value || 'battleTower' });
            else if (action === 'tactic') updateBotControlState({ tactic: target.value });
            else if (action === 'main-select') updateBotControlState({ mainCarryKey: target.value || '' });
            else if (action === 'starter-mode') updateBotControlState({ starterMode: target.value || 'auto' });
            else if (action === 'auto-restart') updateBotControlState({ autoRestart: Boolean(target.checked) });
            else if (action === 'starter-input') updateBotControlState({ starterPreference: target.value });
            else if (action === 'map-input') updateBotControlState({ mapPreference: target.value });
            renderBotControlPanel(true);
        };
        panel.addEventListener('input', event => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            if (action === 'starter-input') updateBotControlState({ starterPreference: target.value });
            else if (action === 'map-input') updateBotControlState({ mapPreference: target.value });
        });

        const handle = panel.querySelector('[data-drag-handle]');
        if (!handle) return;
        handle.onpointerdown = event => {
            if (event.target.closest('button, select, input, label')) return;
            const state = getBotControlState();
            const startX = event.clientX;
            const startY = event.clientY;
            const startLeft = state.panel.x;
            const startTop = state.panel.y;
            handle.setPointerCapture?.(event.pointerId);
            const move = moveEvent => {
                const nextX = Math.max(4, Math.min(window.innerWidth - panel.offsetWidth - 4, startLeft + moveEvent.clientX - startX));
                const nextY = Math.max(4, Math.min(window.innerHeight - panel.offsetHeight - 4, startTop + moveEvent.clientY - startY));
                panel.style.left = `${nextX}px`;
                panel.style.top = `${nextY}px`;
                state.panel = { x: nextX, y: nextY };
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                saveBotControlState();
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        };
    }

    function renderBotControlPanel(force = false) {
        if (!botControlPanel || !document.body) return;

        const isInteracting = botControlPanel.contains(document.activeElement) &&
                              ['INPUT', 'SELECT'].includes(document.activeElement?.tagName);

        if (!force && isInteracting) return;

        const team = parseTeamStatus();
        const state = getBotControlState();
        const signature = JSON.stringify({ state, team: getBotControlTeamSignature(team) });
        if (!force && signature === botControlLastRenderSignature) return;

        const activeAction = isInteracting ? document.activeElement.getAttribute('data-action') : null;
        const activeIsTextInput = activeAction &&
                                  document.activeElement.tagName === 'INPUT' &&
                                  ['text', 'search', ''].includes(document.activeElement.type || '');
        const activeSelStart = activeIsTextInput ? document.activeElement.selectionStart : null;
        const activeSelEnd = activeIsTextInput ? document.activeElement.selectionEnd : null;

        botControlLastRenderSignature = signature;
        botControlPanel.style.left = `${state.panel.x}px`;
        botControlPanel.style.top = `${state.panel.y}px`;
        botControlPanel.classList.toggle('is-collapsed', Boolean(state.collapsed));
        botControlPanel.innerHTML = getBotControlPanelHtml(team);
        attachBotControlHandlers(botControlPanel);

        if (force && activeAction) {
            const toFocus = botControlPanel.querySelector(`[data-action="${activeAction}"]`);
            if (toFocus) {
                toFocus.focus();
                if (toFocus.tagName === 'INPUT' && activeSelStart !== null) {
                    toFocus.setSelectionRange(activeSelStart, activeSelEnd);
                }
            }
        }
    }

    function ensureBotControlPanel() {
        if (!document.body) return;
        injectBotControlStyles();
        if (!botControlPanel) {
            botControlPanel = document.createElement('div');
            botControlPanel.id = 'engine7-control-panel';
            document.body.appendChild(botControlPanel);
        }
        renderBotControlPanel();
    }

    function triggerRealClick(element) {
        if (!element) return false;
        const target = element.querySelector('rect') || element.querySelector('image') || element;
        const rect = target.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) return false;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pointerOpts = { view: window, bubbles: true, cancelable: true, buttons: 1, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true };
        const mouseOpts = { view: window, bubbles: true, cancelable: true, buttons: 1, clientX: cx, clientY: cy };
        const dispatchTargets = [
            target,
            element,
            document.elementFromPoint(cx, cy)
        ].filter(Boolean);
        [...new Set(dispatchTargets)].forEach(clickTarget => {
            clickTarget.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
            clickTarget.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
            clickTarget.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
            clickTarget.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
            clickTarget.dispatchEvent(new MouseEvent('click', mouseOpts));
        });
        return true;
    }

    function simulateDragAndDrop(sourceElem, targetElem) {
        if (!sourceElem || !targetElem || sourceElem === targetElem) return false;

        const srcRect = sourceElem.getBoundingClientRect();
        const tgtRect = targetElem.getBoundingClientRect();
        const srcX = srcRect.left + srcRect.width / 2;
        const srcY = srcRect.top + srcRect.height / 2;
        const tgtX = tgtRect.left + tgtRect.width / 2;
        const tgtY = tgtRect.top + tgtRect.height / 2;

        const downOpts = { clientX: srcX, clientY: srcY, bubbles: true, cancelable: true, view: window, buttons: 1, pointerId: 1, isPrimary: true };
        sourceElem.dispatchEvent(new PointerEvent('pointerdown', downOpts));
        sourceElem.dispatchEvent(new MouseEvent('mousedown', downOpts));

        // Simulate intermediate move steps for smoother gesture detection
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            const ratio = i / steps;
            const mx = srcX + (tgtX - srcX) * ratio;
            const my = srcY + (tgtY - srcY) * ratio;
            const moveOpts = { clientX: mx, clientY: my, bubbles: true, cancelable: true, view: window, buttons: 1, pointerId: 1, isPrimary: true };
            sourceElem.dispatchEvent(new PointerEvent('pointermove', moveOpts));
            sourceElem.dispatchEvent(new MouseEvent('mousemove', moveOpts));
            document.dispatchEvent(new PointerEvent('pointermove', moveOpts));
            document.dispatchEvent(new MouseEvent('mousemove', moveOpts));
            window.dispatchEvent(new PointerEvent('pointermove', moveOpts));
        }

        const upOpts = { clientX: tgtX, clientY: tgtY, bubbles: true, cancelable: true, view: window, button: 0, buttons: 0, pointerId: 1, isPrimary: true };
        
        // Dispatch pointerup and mouseup on both target and source elements to cover capture listeners
        targetElem.dispatchEvent(new PointerEvent('pointerup', upOpts));
        targetElem.dispatchEvent(new MouseEvent('mouseup', upOpts));
        sourceElem.dispatchEvent(new PointerEvent('pointerup', upOpts));
        sourceElem.dispatchEvent(new MouseEvent('mouseup', upOpts));

        // Dispatch lostpointercapture on source element to cleanly terminate synthetic capture
        sourceElem.dispatchEvent(new PointerEvent('lostpointercapture', { clientX: tgtX, clientY: tgtY, bubbles: true, cancelable: true, view: window, pointerId: 1, isPrimary: true }));

        // Dispatch on document and window for global listeners
        document.dispatchEvent(new PointerEvent('pointerup', upOpts));
        document.dispatchEvent(new MouseEvent('mouseup', upOpts));
        window.dispatchEvent(new PointerEvent('pointerup', upOpts));
        window.dispatchEvent(new MouseEvent('mouseup', upOpts));

        log('info', '🫴', `Drag ${sourceElem.className} → ${targetElem.className}`);
        return true;
    }

    function getTeamUnitStableKey(unit) {
        if (!unit) return '';
        const name = foldText(unit.name || '');
        if (!name) return '';
        const types = normalizeTypeList(unit.types || []).join('/');
        const attacks = normalizeTypeList(unit.attackTypes || getUnitAttackTypes(unit) || []).join('/');
        return [
            name,
            unit.level || 0,
            unit.hp || 0,
            unit.isFainted ? 'fainted' : 'alive',
            normalizeItemName(unit.heldItem || ''),
            types,
            attacks
        ].join(':');
    }

    function getElementUnitStableKey(element) {
        if (!element) return '';
        const info = parsePokemonInfoFromCard(element, 'reorder-key');
        const name = info?.name || getPokemonNameFromCard(element);
        if (!name) return '';
        const hp = info?.hp?.percent ?? parseCardHp(element)?.percent ?? 0;
        const heldItem = getHeldItem(element) || '';
        const types = normalizeTypeList(info?.types || getKnownPokemonTypes(name)).join('/');
        const attacks = normalizeTypeList(info?.attackTypes || getAttackTypesFromElement(element, info?.types || [])).join('/');
        return [
            foldText(name),
            info?.level || parseLevelText(element.innerText || ''),
            hp,
            hp === 0 ? 'fainted' : 'alive',
            normalizeItemName(heldItem),
            types,
            attacks
        ].join(':');
    }

    function getReorderKey(unit, element) {
        return getTeamUnitStableKey(unit) || getElementUnitStableKey(element);
    }

    function getReorderIdentityKey(unit, element) {
        const name = unit?.name || getPokemonNameFromCard(element);
        return getPokemonIdentityKey(name);
    }

    function areSameReorderIdentity(sourceUnit, targetUnit, sourceElem, targetElem) {
        const sourceIdentity = getReorderIdentityKey(sourceUnit, sourceElem);
        const targetIdentity = getReorderIdentityKey(targetUnit, targetElem);
        return Boolean(sourceIdentity && targetIdentity && sourceIdentity === targetIdentity);
    }

    function shouldSkipLowValueDuplicateReorder(sourceUnit, targetUnit, sourceElem, targetElem, reason) {
        if (!areSameReorderIdentity(sourceUnit, targetUnit, sourceElem, targetElem)) return false;
        if (reason === 'fainted-lead' || reason === 'lead-level-correction' || reason === 'lead-item-holder') return false;
        if (!sourceUnit || !targetUnit) return false;
        if (sourceUnit.isFainted !== targetUnit.isFainted) return false;

        const levelGap = Math.abs((sourceUnit.level || 0) - (targetUnit.level || 0));
        const hpGap = Math.abs((sourceUnit.hp || 0) - (targetUnit.hp || 0));
        const itemDiffers = normalizeItemName(sourceUnit.heldItem || '') !== normalizeItemName(targetUnit.heldItem || '');
        return !itemDiffers && levelGap <= 3 && hpGap <= 30;
    }

    function tryTeamReorder(sourceElem, targetElem, sourceUnit = null, targetUnit = null, reason = 'team-order') {
        if (!sourceElem || !targetElem || sourceElem === targetElem) return false;

        const sourceKey = getReorderKey(sourceUnit, sourceElem);
        const targetKey = getReorderKey(targetUnit, targetElem);
        if (sourceKey && targetKey && sourceKey === targetKey) {
            log('debug', '🎯', `Skipping reorder of equivalent duplicate [${sourceKey.split(':')[0]}].`);
            return false;
        }

        if (shouldSkipLowValueDuplicateReorder(sourceUnit, targetUnit, sourceElem, targetElem, reason)) {
            log('debug', 'team-order', `Skipping low-value duplicate reorder [${sourceUnit.name}] (${reason}).`);
            return false;
        }

        const signature = `${reason}:${sourceKey || sourceElem.className}->${targetKey || targetElem.className}`;
        const now = Date.now();
        if (signature === lastTeamReorderSignature && now - lastTeamReorderAt < CONFIG.TEAM_REORDER_REPEAT_COOLDOWN_MS) {
            log('warn', '🎯', `Skipping repeated reorder (${reason}); keeping current order and continuing.`);
            return false;
        }

        const attempts = teamReorderAttemptsBySignature[signature] || { count: 0, firstAt: now, lastAt: 0, blockedUntil: 0 };
        if (attempts.blockedUntil > now) {
            log('warn', 'team-order', `Reorder signature blocked after repeated failed attempts (${reason}); waiting ${Math.ceil((attempts.blockedUntil - now) / 1000)}s.`);
            return false;
        }
        if (now - attempts.firstAt > CONFIG.TEAM_REORDER_ATTEMPT_WINDOW_MS) {
            attempts.count = 0;
            attempts.firstAt = now;
            attempts.blockedUntil = 0;
        }
        if (attempts.count >= CONFIG.TEAM_REORDER_MAX_ATTEMPTS_PER_SIGNATURE) {
            attempts.blockedUntil = now + CONFIG.TEAM_REORDER_STALE_BLOCK_MS;
            attempts.lastAt = now;
            teamReorderAttemptsBySignature[signature] = attempts;
            log('warn', 'team-order', `Blocking stale reorder (${reason}) after ${attempts.count} attempts.`);
            return false;
        }

        lastTeamReorderSignature = signature;
        lastTeamReorderAt = now;
        attempts.count++;
        attempts.lastAt = now;
        teamReorderAttemptsBySignature[signature] = attempts;
        return simulateDragAndDrop(sourceElem, targetElem);
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║         🔍 STATE DETECTION (Priority-based)                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function getActiveItemModal() {
        const modals = [
            document.getElementById('item-equip-modal'),
            document.getElementById('usable-item-modal')
        ];
        return modals.find(modal => modal && isVisible(modal));
    }

    function getPokemonRowActionTarget(row) {
        if (!row || !isVisible(row)) return null;

        const button = row.querySelector('button:not([disabled])');
        if (button && isVisible(button)) return button;

        if (row.matches('[disabled], [aria-disabled="true"]')) return null;

        const style = window.getComputedStyle(row);
        if (style.pointerEvents === 'none') return null;

        const opacity = Number.parseFloat(style.opacity);
        if (!Number.isNaN(opacity) && opacity < 0.5) return null;

        return row;
    }

    function parseLevelText(text) {
        const match = (text || '').match(/(?:lv|lvl|nivel|nv\.?)\s*(\d+)/i);
        return match ? Number.parseInt(match[1], 10) : 0;
    }

    function getCachedPokemonInfo(name) {
        for (const key of getPokemonLookupKeys(name)) {
            if (pokemonRuntimeInfoCache[key]) return pokemonRuntimeInfoCache[key];
        }
        return null;
    }

    function getTypeListFromElements(elements) {
        const found = [];
        Array.from(elements || []).forEach(el => {
            [
                el.getAttribute('data-type'),
                el.getAttribute('data-poke-type'),
                el.getAttribute('data-move-type'),
                el.getAttribute('data-attack-type'),
                el.title,
                el.alt,
                el.innerText,
                el.getAttribute('class')
            ].forEach(value => detectTypesInText(value || '').forEach(type => found.push(type)));
        });
        return normalizeTypeList(found);
    }

    function getPokemonNameFromCard(card) {
        if (!card) return '';
        const nameEl = card.querySelector('.poke-name, .poke-card-name, .team-slot-name, .equip-poke-name');
        if (nameEl && nameEl.innerText) return foldText(nameEl.innerText);

        const sprite = card.querySelector('img.poke-sprite[alt], .poke-sprite-wrap img[alt]');
        if (sprite && sprite.alt && !foldText(sprite.alt).match(/caught|captur|item|shiny/)) {
            return foldText(sprite.alt);
        }

        return '';
    }

    function parseMoveInfoFromCard(card) {
        if (!card) return [];
        return Array.from(card.querySelectorAll('.poke-move, .move-row, [class*="poke-move"]'))
            .map((moveEl, index) => {
                const nameEl = moveEl.querySelector('.move-name, [class*="move-name"]');
                const name = nameEl ? (nameEl.getAttribute('title') || nameEl.innerText || '').trim() : '';
                let type = getTypeListFromElements(moveEl.querySelectorAll(
                    '.move-type-badge, .move-type, [data-move-type], [data-attack-type], .type-badge'
                ))[0] || null;
                if (!type) {
                    type = detectTypesInText(moveEl.innerText || moveEl.getAttribute('class') || '')[0] || null;
                }

                const categoryText = foldText([
                    moveEl.querySelector('.move-cat-icon')?.alt || '',
                    moveEl.querySelector('.move-cat-icon')?.title || '',
                    moveEl.querySelector('.move-cat-icon')?.src || '',
                    moveEl.innerText || ''
                ].join(' '));
                const category = categoryText.match(/physical|fisic/) ? 'physical' :
                                 categoryText.match(/special|especial/) ? 'special' : null;
                const powerText = moveEl.querySelector('.move-power-badge')?.innerText || moveEl.innerText || '';
                const powerMatch = powerText.match(/(\d+)\s*(?:pwr|power|poder)?/i);
                const power = powerMatch ? Number.parseInt(powerMatch[1], 10) : 0;

                return { index, name, type, category, power };
            })
            .filter(move => move.name || move.type);
    }

    function parseCardHp(card) {
        const hpText = card?.querySelector('.hp-text')?.innerText || '';
        const hpMatch = hpText.match(/(\d+)\s*\/\s*(\d+)/);
        if (!hpMatch) return null;
        const current = Number.parseInt(hpMatch[1], 10);
        const max = Number.parseInt(hpMatch[2], 10);
        return {
            current,
            max,
            percent: max > 0 ? Math.round((current / max) * 100) : 0
        };
    }

    function parsePokemonInfoFromCard(card, source = 'poke-card') {
        const name = getPokemonNameFromCard(card);
        if (!name) return null;

        let types = getTypeListFromElements(card.querySelectorAll('.poke-types .type-badge, [data-poke-type]'));
        if (types.length === 0) {
            const manualTypes = getManualPokemonTypes(name);
            const pokedexEntry = getPokelikePokedexEntry(name);
            types = manualTypes.length > 0 ? manualTypes : normalizeTypeList(pokedexEntry?.types || []);
        }

        const moves = parseMoveInfoFromCard(card);
        const primaryMove = moves
            .filter(move => move.type)
            .sort((a, b) => ((b.power || 0) - (a.power || 0)) || (a.index - b.index))[0] || null;
        const attackTypes = normalizeTypeList(moves.map(move => move.type).filter(Boolean));
        const currentStats = parseCardStats(card);

        return {
            name,
            source,
            types,
            level: parseLevelText(card.querySelector('.poke-level, .team-slot-lv, [class*="level"]')?.innerText || card.innerText || ''),
            hp: parseCardHp(card),
            currentStats,
            moves,
            attackTypes,
            primaryAttackType: primaryMove ? primaryMove.type : null,
            updatedAt: Date.now()
        };
    }

    function mergePokemonRuntimeInfo(info) {
        if (!info || !info.name) return null;
        const keys = getPokemonLookupKeys(info.name);
        if (keys.length === 0) return null;

        const existing = keys.map(key => pokemonRuntimeInfoCache[key]).find(Boolean) || {};
        const merged = {
            ...existing,
            name: info.name || existing.name,
            updatedAt: info.updatedAt || Date.now(),
            source: info.source || existing.source || 'unknown'
        };

        if (info.types && info.types.length > 0) merged.types = normalizeTypeList(info.types);
        if (info.attackTypes && info.attackTypes.length > 0) merged.attackTypes = normalizeTypeList(info.attackTypes);
        if (info.primaryAttackType) merged.primaryAttackType = info.primaryAttackType;
        if (info.moves && info.moves.length > 0) merged.moves = info.moves;
        if (info.currentStats && Object.keys(info.currentStats).length > 0) merged.currentStats = info.currentStats;
        if (info.level) merged.level = info.level;
        if (info.hp) merged.hp = info.hp;

        keys.forEach(key => {
            pokemonRuntimeInfoCache[key] = merged;
        });

        return merged;
    }

    function learnPokemonInfoFromCard(card, source = 'poke-card') {
        return mergePokemonRuntimeInfo(parsePokemonInfoFromCard(card, source));
    }

    function refreshVisiblePokemonInfoCache() {
        const selectors = [
            '#team-hover-card .poke-card',
            '#catch-choices .poke-choice-wrap .poke-card',
            '#starter-choices .poke-card',
            '#swap-incoming .poke-card',
            '#swap-choices .poke-card',
            '#gameover-team .poke-card',
            '#elite-prep-player-side .poke-card',
            '#elite-prep-enemy-side .poke-card',
            '#battle-enemy-side .poke-card',
            '.screen.active .poke-card'
        ].join(', ');

        const seen = new Set();
        let learned = 0;
        document.querySelectorAll(selectors).forEach(card => {
            if (!card || seen.has(card)) return;
            seen.add(card);
            if (learnPokemonInfoFromCard(card, 'visible-card')) learned++;
        });

        if (learned > 0) {
            log('debug', '📚', `Learned/updated ${learned} Pokémon card(s) from visible DOM.`);
        }
        return learned;
    }

    function getAttackTypesFromElement(element, fallbackTypes = []) {
        const found = new Set();
        if (element) {
            const moveTypeSelectors = [
                '[data-move-type]', '[data-attack-type]',
                '.move-type', '.move-type-badge', '.attack-type',
                '.move-row [class*="type"]', '[class*="move"] [class*="type"]',
                '[class*="attack"] [class*="type"]'
            ].join(', ');

            element.querySelectorAll(moveTypeSelectors).forEach(el => {
                const attrs = [
                    el.getAttribute('data-move-type'),
                    el.getAttribute('data-attack-type'),
                    el.getAttribute('data-type'),
                    el.title,
                    el.alt,
                    el.innerText
                ];
                attrs.forEach(value => detectTypesInText(value || '').forEach(type => found.add(type)));
            });

            (element.innerText || '').split(/\n+/).forEach(line => {
                const folded = foldText(line);
                if (folded.match(/move|attack|ataque|movimiento|power|poder|base/)) {
                    detectTypesInText(line).forEach(type => found.add(type));
                }
            });
        }

        if (found.size === 0) {
            fallbackTypes.forEach(type => found.add(type));
        }

        return [...found].filter(type => TYPES.includes(type));
    }

    function parseModalRowUnit(row, index) {
        const nameEl = row.querySelector('.equip-poke-name, .team-slot-name');
        const name = nameEl ? nameEl.innerText.toLowerCase().trim() : `slot ${index + 1}`;
        const levelEl = row.querySelector('.equip-poke-lv, .team-slot-lv');
        const hpText = levelEl ? levelEl.innerText.replace(/\s+/g, ' ') : '';
        const level = parseLevelText(hpText);
        const hpMatch = hpText.match(/(\d+)\s*\/\s*(\d+)\s*HP/i);
        const hpCurrent = hpMatch ? Number.parseInt(hpMatch[1], 10) : 100;
        const hpMax = hpMatch ? Number.parseInt(hpMatch[2], 10) : 100;
        const hp = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 100;
        const types = getKnownPokemonTypes(name);
        const cachedInfo = getCachedPokemonInfo(name);
        const baseStats = getPokemonBaseStats(name);

        return {
            index,
            name,
            level,
            hp,
            isFainted: hp === 0,
            types,
            attackTypes: getAttackTypesFromElement(row, cachedInfo?.attackTypes || types),
            moves: cachedInfo?.moves || [],
            baseStats,
            currentStats: cachedInfo?.currentStats || null,
            heldItem: null,
            element: row
        };
    }

    function getActiveScreen() {
        // Priority 1: Eevee choice overlay (highest z-index: 201)
        const eeveeOverlay = document.getElementById('eevee-choice-overlay');
        if (eeveeOverlay && isVisible(eeveeOverlay)) return 'EEVEE_CHOICE';

        // Priority 2: Evolution overlay (z-index: 200)
        const evoOverlay = document.getElementById('evo-overlay');
        if (evoOverlay && isVisible(evoOverlay)) return 'EVO_OVERLAY';

        // Priority 3: Item equip/use modal (floating)
        const equipModal = getActiveItemModal();
        if (equipModal && isVisible(equipModal)) return 'ITEM_EQUIP_MODAL';

        // Priority 4: Active screen by class. Challenge mode may use a variant id
        // for elite prep, but the FIGHT button must belong to the active screen.
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const activeFightBtn = activeScreen.querySelector('#btn-elite-prep-continue, .elite-prep-fight-btn');
            if (activeFightBtn && isVisible(activeFightBtn)) return 'elite-prep-screen';
            return activeScreen.id;
        }

        // Fallback for transient DOM states with no active screen yet.
        const elitePrepFightBtn = document.getElementById('btn-elite-prep-continue') || document.querySelector('.elite-prep-fight-btn');
        const fightScreen = elitePrepFightBtn ? elitePrepFightBtn.closest('.screen') : null;
        if (elitePrepFightBtn && isVisible(elitePrepFightBtn) && (!fightScreen || isVisible(fightScreen))) {
            return 'elite-prep-screen';
        }

        return 'IDLE_TRANSITION';
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║          📋 TEAM STATUS PARSER & ITEM DETECTION              ║
    // ╚══════════════════════════════════════════════════════════════╝

    function getHeldItem(slotElement) {
        const img = slotElement.querySelector('img[src*="items/"]');
        if (!img) return null;

        // Try alt or title
        let name = img.alt || img.title;
        if (name) return normalizeItemName(name);

        // Fallback to URL parsing
        const src = img.src || '';
        const match = src.match(/\/items\/([^\/\.]+)/);
        if (match) {
            return normalizeItemName(match[1]);
        }

        return 'unknown item';
    }

    function parseTeamStatus() {
        let slots = document.querySelectorAll('.screen.active .screen-team-bar .team-slot');
        if (slots.length === 0) {
            slots = document.querySelectorAll('#team-bar .team-slot');
        }
        const units = [];
        slots.forEach((slot, index) => {
            const nameEl = slot.querySelector('.team-slot-name');
            const hpFill = slot.querySelector('.hp-bar-fill');
            if (nameEl) {
                const name = nameEl.innerText.toLowerCase().trim();
                const levelEl = slot.querySelector('.team-slot-lv, [class*="lv"]');
                const level = levelEl ? parseLevelText(levelEl.innerText) : 0;
                const hpPercent = hpFill ? (parseInt(hpFill.style.width) || 0) : 100;
                const types = getKnownPokemonTypes(name);
                const baseStats = getPokemonBaseStats(name);
                const cachedInfo = getCachedPokemonInfo(name);
                const isShiny = slot.classList.contains('shiny') ||
                                slot.querySelector('.shiny-icon') !== null ||
                                slot.querySelector('[class*="shiny"]') !== null;
                const heldItem = getHeldItem(slot);
                units.push({
                    index, name, hp: hpPercent,
                    level,
                    isFainted: hpPercent === 0,
                    types,
                    attackTypes: getAttackTypesFromElement(slot, cachedInfo?.attackTypes || types),
                    moves: cachedInfo?.moves || [],
                    baseStats,
                    currentStats: cachedInfo?.currentStats || null,
                    isShiny, heldItem, element: slot
                });
            }
        });
        return units;
    }

    function getBagItems() {
        const badges = document.querySelectorAll(
            '#item-bar .item-badge, #item-bar span img, ' +
            '#elite-prep-items .item-badge, #elite-prep-items span img, #elite-prep-items img[src*="items/"]'
        );
        const items = [];
        const seenElements = new Set();
        badges.forEach(badge => {
            const img = badge.tagName === 'IMG' ? badge : badge.querySelector('img');
            if (!img) return;
            const element = badge.tagName === 'IMG' ? badge.parentElement : badge;
            if (!element || seenElements.has(element)) return;
            seenElements.add(element);

            let name = img.alt || img.title;
            if (!name) {
                const src = img.src || '';
                const match = src.match(/\/items\/([^\/\.]+)/);
                if (match) {
                    name = match[1];
                }
            }

            if (name) {
                items.push({
                    name: normalizeItemName(name),
                    element
                });
            }
        });
        return items;
    }

    function isItemOnBagCooldown(itemName) {
        itemName = normalizeItemName(itemName);
        const retryAt = baggedItemCooldowns[itemName] || 0;
        if (retryAt <= Date.now()) return false;
        log('debug', '🎒', `Skipping recently bagged item [${itemName}] for ${Math.ceil((retryAt - Date.now()) / 1000)}s.`);
        return true;
    }

    function markItemKeptInBag(itemName) {
        itemName = normalizeItemName(itemName);
        if (!itemName) return;
        baggedItemCooldowns[itemName] = Date.now() + CONFIG.ITEM_BAG_RETRY_COOLDOWN_MS;
    }

    function shouldEquipBagItem(bagItemName, team, bossType = null) {
        bagItemName = normalizeItemName(bagItemName);
        if (isItemOnBagCooldown(bagItemName)) return false;
        const bagItemScore = scoreItemForTeam(bagItemName, team, bossType);
        if (bagItemName === 'tm normal') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            if (sinnohTraining.active && !sinnohTraining.needsTm) return false;
        }

        if (USABLE_ITEMS.has(bagItemName)) return true;
        if (isLowValueHeldItem(bagItemName)) return false;
        if (!isTypeBoostItemUsefulForTeam(bagItemName, team)) return false;

        // Try to fill empty slots of alive units first
        const hasUnequipped = team.some(p => !p.isFainted && !p.heldItem);
        if (hasUnequipped) return bagItemScore > 35;

        // Upgrade if bag item is better than what any alive unit currently holds
        const canUpgrade = team.some(p => {
            if (p.isFainted || !p.heldItem) return false;
            return scoreHeldItemForPokemon(p, bagItemName, bossType) > scoreHeldItemForPokemon(p, p.heldItem, bossType) + 12;
        });

        return canUpgrade;
    }

    function getTeamAverageHP(team) {
        const alive = team.filter(p => !p.isFainted);
        if (alive.length === 0) return 0;
        return alive.reduce((sum, p) => sum + p.hp, 0) / alive.length;
    }

    function getAliveTeam(team) {
        return team.filter(p => !p.isFainted);
    }

    function hasOpenTeamSlot(team) {
        return (team || []).length < CONFIG.TEAM_TARGET_SIZE;
    }

    function getTeamAverageLevel(team) {
        const leveled = getAliveTeam(team).filter(p => p.level > 0);
        if (leveled.length === 0) return 0;
        return leveled.reduce((sum, p) => sum + p.level, 0) / leveled.length;
    }

    function getCenterNeedStatus(team, opponentProfile = null, prepStatus = null) {
        const alive = getAliveTeam(team || []);
        const avgHP = getTeamAverageHP(team || []);
        const lowestHP = alive.length > 0 ? Math.min(...alive.map(p => p.hp || 0)) : 0;
        const hasFainted = (team || []).some(p => p.isFainted);
        const lowHPCount = alive.filter(p => (p.hp || 0) < CONFIG.LOW_HP_THRESHOLD).length;
        const criticalHPCount = alive.filter(p => (p.hp || 0) < CONFIG.CRITICAL_HP_THRESHOLD).length;
        const fullEnough = alive.length > 0 &&
                           avgHP >= CONFIG.CENTER_AVOID_FULL_HP_AVG_THRESHOLD &&
                           lowestHP >= CONFIG.CENTER_AVOID_LOWEST_HP_THRESHOLD;
        const almostFull = alive.length > 0 &&
                           avgHP >= CONFIG.CENTER_AVOID_ALMOST_FULL_HP_AVG_THRESHOLD &&
                           lowestHP >= CONFIG.CENTER_AVOID_LOWEST_HP_THRESHOLD &&
                           lowHPCount === 0;
        const primaryCarry = getPrimaryCarry(team || []);
        const carryHP = primaryCarry ? (primaryCarry.hp || 0) : 0;
        const prep = prepStatus || getBossPrepStatus(team || [], opponentProfile);
        const avgDeficit = prep?.avgDeficit || 0;
        const leadDeficit = prep?.leadDeficit || 0;
        const prepPressure = avgDeficit + leadDeficit;
        const carryBossScore = opponentProfile && primaryCarry
            ? scoreLeadCandidate(primaryCarry, opponentProfile, { ignoreHeldItem: true })
            : 0;
        const carryPowerScore = primaryCarry ? getPokemonCarryScore(primaryCarry) : 0;
        const carryOverpowersBoss = Boolean(
            primaryCarry &&
            !primaryCarry.isFainted &&
            leadDeficit <= 0 &&
            (
                avgDeficit <= 3 ||
                !opponentProfile ||
                carryBossScore >= CONFIG.CENTER_STRONG_CARRY_SCORE_THRESHOLD ||
                carryPowerScore >= CONFIG.CENTER_STRONG_CARRY_SCORE_THRESHOLD ||
                isMainCarryUnit(primaryCarry)
            )
        );
        const healthyCarryCanSkip = Boolean(
            carryOverpowersBoss &&
            carryHP >= CONFIG.CENTER_CARRY_SAFE_HP_THRESHOLD &&
            avgHP >= CONFIG.CENTER_CARRY_SKIP_AVG_HP_THRESHOLD &&
            lowestHP >= CONFIG.CENTER_CARRY_SKIP_LOWEST_HP_THRESHOLD &&
            lowHPCount <= 1
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
            canSkipCenter: !hasFainted && criticalHPCount === 0 && (fullEnough || almostFull || healthyCarryCanSkip)
        };
    }

    function getLeadLevel(team) {
        const lead = getAliveTeam(team)[0];
        return lead ? (lead.level || 0) : 0;
    }

    function shouldBuildCoreTeam(team) {
        return getAliveTeam(team).length < CONFIG.EARLY_CORE_TEAM_SIZE;
    }

    function getBossPrepTargets(opponentProfile = null) {
        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(opponentProfile?.name || '');
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const isArceusCheckpoint = opponentName === 'arceus' || (!opponentName && labelText.includes('arceus'));
        const isFinalBoss = !isArceusCheckpoint && Boolean(
            labelText.match(/stage final boss|final boss|champion|campeon/) ||
            reward >= 400 ||
            ['steven', 'cynthia', 'red'].includes(opponentName)
        );
        const isBigBoss = isFinalBoss || isArceusCheckpoint || labelText.includes('big boss') || opponentName === 'brawly';
        const isMap2 = labelText.includes('map 2/2') || ['glacia', 'lorelei', 'pryce', 'phoebe'].includes(opponentName);
        const roundMatch = labelText.match(/\br\s*(\d+)/);
        const labelRound = roundMatch ? Number.parseInt(roundMatch[1], 10) : 1;
        const rewardRound = reward >= 300 ? 3 : reward >= 150 ? 2 : 1;
        const round = Math.max(labelRound || 1, rewardRound);
        const progress = getTowerProgressContext();
        const sinnohMapOrdinal = progress.mapOrdinal ||
            (round === 1 && isMap2 ? 2 : (round === 2 && !isMap2 ? 3 : null));

        if (progress.isSinnoh && isArceusCheckpoint) {
            return {
                avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                reason: `sinnoh-arceus-battle-${SINNOH_ARCEUS_BATTLE_INDEX}-checkpoint`
            };
        }

        if (CONFIG.SINNOH_TOWER_EARLY_TRAINING &&
            progress.isSinnoh &&
            sinnohMapOrdinal &&
            sinnohMapOrdinal <= CONFIG.SINNOH_TRAINING_MAP_COUNT &&
            !isFinalBoss) {
            if (sinnohMapOrdinal <= 1) {
                return {
                    avgLevel: CONFIG.SINNOH_MAP1_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.SINNOH_MAP1_MIN_LEAD_LEVEL,
                    reason: 'sinnoh-map-1-carry-training'
                };
            }
            if (sinnohMapOrdinal === 2) {
                return {
                    avgLevel: CONFIG.SINNOH_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.SINNOH_MAP2_MIN_LEAD_LEVEL,
                    reason: 'sinnoh-map-2-carry-training'
                };
            }
            return {
                avgLevel: CONFIG.SINNOH_MAP3_MIN_AVG_LEVEL,
                leadLevel: CONFIG.SINNOH_MAP3_MIN_LEAD_LEVEL,
                reason: 'sinnoh-map-3-carry-training'
            };
        }

        if (round >= 3) {
            if (isFinalBoss) {
                return {
                    avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r3-final-boss'
                };
            }
            if (isBigBoss) {
                return {
                    avgLevel: CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r3-big-boss'
                };
            }
            if (isMap2) {
                return {
                    avgLevel: CONFIG.R3_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R3_MAP2_MIN_LEAD_LEVEL,
                    reason: 'r3-map-2'
                };
            }
            return {
                avgLevel: CONFIG.R3_MAP1_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R3_MAP1_MIN_LEAD_LEVEL,
                reason: 'r3-map-1'
            };
        }

        if (round === 2) {
            if (isBigBoss || reward >= 250) {
                return {
                    avgLevel: CONFIG.R2_BIG_BOSS_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R2_BIG_BOSS_MIN_LEAD_LEVEL,
                    reason: 'r2-big-boss'
                };
            }
            if (isMap2 || reward >= 200) {
                return {
                    avgLevel: CONFIG.R2_MAP2_MIN_AVG_LEVEL,
                    leadLevel: CONFIG.R2_MAP2_MIN_LEAD_LEVEL,
                    reason: 'r2-map-2'
                };
            }
            return {
                avgLevel: CONFIG.R2_MAP1_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R2_MAP1_MIN_LEAD_LEVEL,
                reason: 'r2-map-1'
            };
        }

        if (isBigBoss) {
            return {
                avgLevel: CONFIG.EARLY_BIG_BOSS_MIN_AVG_LEVEL,
                leadLevel: CONFIG.EARLY_BIG_BOSS_MIN_LEAD_LEVEL,
                reason: 'big-boss'
            };
        }

        if (isMap2) {
            return {
                avgLevel: CONFIG.R1_MAP2_MIN_AVG_LEVEL,
                leadLevel: CONFIG.R1_MAP2_MIN_LEAD_LEVEL,
                reason: 'r1-map-2'
            };
        }

        return {
            avgLevel: CONFIG.EARLY_BOSS_MIN_AVG_LEVEL,
            leadLevel: CONFIG.EARLY_BOSS_MIN_LEAD_LEVEL,
            reason: 'early'
        };
    }

    function shouldPrioritizeEarlyTraining(team, opponentProfile = null) {
        const aliveCount = getAliveTeam(team).length;
        if (aliveCount < CONFIG.EARLY_CORE_TEAM_SIZE) return false;

        const avgLevel = getTeamAverageLevel(team);
        const leadLevel = getLeadLevel(team);
        const targets = getBossPrepTargets(opponentProfile);
        if (avgLevel === 0 && leadLevel === 0) {
            return aliveCount >= CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
        }

        return avgLevel < targets.avgLevel ||
               leadLevel < targets.leadLevel;
    }

    function getBossPrepStatus(team, opponentProfile = null) {
        const targets = getBossPrepTargets(opponentProfile);
        const avgLevel = getTeamAverageLevel(team);
        const leadLevel = getLeadLevel(team);
        const avgDeficit = Math.max(0, targets.avgLevel - avgLevel);
        const leadDeficit = Math.max(0, targets.leadLevel - leadLevel);

        return {
            targets,
            avgLevel: Number(avgLevel.toFixed(1)),
            leadLevel,
            avgDeficit: Number(avgDeficit.toFixed(1)),
            leadDeficit: Number(leadDeficit.toFixed(1)),
            ready: avgDeficit <= 0 && leadDeficit <= 0
        };
    }

    function getProjectedAverageLevelAfterCatch(team, candidateLevel) {
        const alive = getAliveTeam(team);
        const leveled = alive.filter(p => p.level > 0);
        if (!Number.isFinite(candidateLevel) || candidateLevel <= 0 || leveled.length === 0) return null;
        const total = leveled.reduce((sum, p) => sum + (p.level || 0), 0) + candidateLevel;
        return total / (leveled.length + 1);
    }

    function shouldStopEarlyExpansion(team, opponentProfile = null) {
        if (getAliveTeam(team).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE) return false;

        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(opponentProfile?.name || '');
        return labelText.includes('r1') ||
               ['gardenia', 'glacia', 'brawly'].includes(opponentName);
    }

    function getEarlyCatchAllowance(team, score = 0, isShiny = false) {
        const aliveCount = getAliveTeam(team).length;
        if (aliveCount < CONFIG.EARLY_CORE_TEAM_SIZE) return 'core';
        if (isShiny || score >= CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE) return 'exceptional';
        if (aliveCount < CONFIG.EARLY_OPTIONAL_TEAM_SIZE && score >= CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE) return 'optional';
        return 'skip';
    }

    function isEarlyShinyRerollWindow(team = []) {
        const progress = getTowerProgressContext();
        if (progress.mapOrdinal !== null) {
            return progress.mapOrdinal <= CONFIG.EARLY_SHINY_REROLL_MAP_COUNT;
        }
        if (progress.reward > 0) {
            return progress.reward < CONFIG.EARLY_SHINY_REROLL_MAP_COUNT * 100;
        }
        return getAliveTeam(team || []).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
    }

    function isSettledCatchDecisionWindow(team = []) {
        const progress = getTowerProgressContext();
        if (progress.mapOrdinal !== null) {
            return progress.mapOrdinal > CONFIG.EARLY_SHINY_REROLL_MAP_COUNT;
        }
        if (progress.reward > 0) {
            return progress.reward >= CONFIG.EARLY_SHINY_REROLL_MAP_COUNT * 100;
        }
        return getAliveTeam(team || []).length >= CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
    }

    function getTeamTypes(team) {
        const typeSet = new Set();
        team.forEach(p => p.types.forEach(t => typeSet.add(t)));
        return [...typeSet];
    }

    function getTeamTraitCounts(team) {
        const counts = {};
        team.forEach(p => {
            const multiplier = p.isShiny ? 2 : 1;
            p.types.forEach(t => {
                counts[t] = (counts[t] || 0) + multiplier;
            });
        });
        return counts;
    }

    function isTopTraitType(type) {
        const trait = TRAIT_DATA[type];
        return Boolean(trait && ['S', 'A'].includes(trait.tier));
    }

    function getShinyDraftScore(candidateTypes, team, isShiny = false) {
        if (!isShiny) return 0;
        const aliveCount = getAliveTeam(team || []).length;
        const types = normalizeTypeList(candidateTypes || []);
        let score = aliveCount < CONFIG.EARLY_OPTIONAL_TEAM_SIZE
            ? CONFIG.EARLY_SHINY_CATCH_BONUS
            : CONFIG.SHINY_CATCH_BONUS;

        if (!(team || []).some(p => p.isShiny)) score += 12;
        types.forEach(type => {
            if (isTopTraitType(type)) score += CONFIG.SHINY_TOP_TYPE_BONUS;
            if (['Fairy', 'Water', 'Fire', 'Dragon', 'Dark'].includes(type)) score += 10;
        });

        return score;
    }

    function getShinyReplacementKeepScore(unit, team) {
        if (!unit?.isShiny) return 0;
        const aliveCount = getAliveTeam(team || []).length;
        const types = normalizeTypeList(unit.types || []);
        let score = CONFIG.SHINY_REPLACEMENT_KEEP_BONUS;
        if (aliveCount <= CONFIG.EARLY_OPTIONAL_TEAM_SIZE) score += 34;
        types.forEach(type => {
            if (isTopTraitType(type)) score += CONFIG.SHINY_TOP_TYPE_BONUS;
            if (['Fairy', 'Water', 'Fire', 'Dragon', 'Dark'].includes(type)) score += 8;
        });
        return score;
    }

    function getTowerProgressContext(labels = getProgressLabels()) {
        const labelText = foldText([
            ...(labels || []),
            currentMapKey || '',
            activeAutoRunMode || ''
        ].join(' '));
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const roundMatch = labelText.match(/\b(?:r|round|ronda)\s*\.?\s*(\d+)/);
        const round = roundMatch ? Number.parseInt(roundMatch[1], 10) : 1;
        const mapMatch = labelText.match(/\b(?:map|mapa)\s*\.?\s*(\d+)\s*\/\s*(\d+)/);
        const mapNumber = mapMatch ? Number.parseInt(mapMatch[1], 10) : null;
        const mapTotal = mapMatch ? Number.parseInt(mapMatch[2], 10) : null;
        let mapOrdinal = null;

        if (mapNumber && mapTotal) {
            mapOrdinal = Math.max(1, ((round || 1) - 1) * mapTotal + mapNumber);
        } else if (reward > 0) {
            mapOrdinal = reward >= 200 ? 3 : reward >= 100 ? 2 : 1;
        }

        const nonSinnohRegionSignal = Boolean(labelText.match(/\b(?:kanto|johto|hoenn|unova|kalos|alola|galar|paldea)\b/));
        const nonSinnohStageSignal = Boolean(labelText.match(/\b(?:stage|region|tower|torre)\s*[123]\b|\b[123]\s*(?:stage|region|tower|torre)\b|\b(?:primera|segunda|tercera)\b/));
        const towerSignal = activeAutoRunMode === 'battle-tower' || Boolean(labelText.match(/\b(?:battle tower|tower|torre)\b/));
        const sinnohBossSignal = Boolean(labelText.match(/\b(?:roark|gardenia|maylene|crasher wake|fantina|byron|candice|volkner|aaron|bertha|flint|lucian|cynthia|arceus)\b/));
        const assumedTowerSinnoh = Boolean(
            CONFIG.SINNOH_ASSUME_TOWER_WHEN_STAGE_UNKNOWN &&
            towerSignal &&
            !nonSinnohRegionSignal &&
            !nonSinnohStageSignal
        );

        return {
            labelText,
            isSinnoh: Boolean(
                labelText.match(/\b(?:sinnoh|shinnoh)\b/) ||
                labelText.match(/\b(?:stage|region|tower|torre)\s*4\b|\b4\s*(?:stage|region|tower|torre)\b|\bcuarta\b/) ||
                sinnohBossSignal ||
                assumedTowerSinnoh
            ),
            assumedTowerSinnoh,
            reward,
            round: round || 1,
            mapNumber,
            mapTotal,
            mapOrdinal
        };
    }

    function normalizeMoveNameKey(name) {
        return foldText(name || '').replace(/[^a-z0-9]+/g, '');
    }

    function getMovePoolTierForMove(move) {
        if (!move) return -1;
        const moveKey = normalizeMoveNameKey(move.name);
        const movePower = Number.parseInt(move.power || 0, 10) || 0;
        const moveTypes = normalizeTypeList(move.type ? [move.type] : []);
        const poolEntries = moveTypes.length > 0
            ? moveTypes.map(type => [type, POKELIKE_MOVE_POOL[type]]).filter(([, pool]) => pool)
            : Object.entries(POKELIKE_MOVE_POOL);
        const preferredCategories = [...new Set([move.category, 'physical', 'special'].filter(category => category === 'physical' || category === 'special'))];
        let bestTier = -1;

        poolEntries.forEach(([, pool]) => {
            preferredCategories.forEach(category => {
                (pool[category] || []).forEach(([poolName, poolPower], tier) => {
                    const nameMatches = moveKey && moveKey === normalizeMoveNameKey(poolName);
                    const powerMatches = !moveKey && movePower > 0 && movePower === (poolPower || 0);
                    if (nameMatches || powerMatches) bestTier = Math.max(bestTier, tier);
                });
            });
        });

        return bestTier;
    }

    function getUnitKnownMoveTier(unit) {
        if (!unit) return -1;
        const cachedInfo = getCachedPokemonInfo(unit.name);
        const moves = Array.isArray(unit.moves) && unit.moves.length > 0
            ? unit.moves
            : (Array.isArray(cachedInfo?.moves) ? cachedInfo.moves : []);
        if (moves.length === 0) return -1;
        return Math.max(...moves.map(move => getMovePoolTierForMove(move)));
    }

    function getUnitOffenseSpeedSnapshot(unit) {
        if (!unit) return { offense: 0, speed: 0, statsKnown: false, currentStatsKnown: false };
        const currentStats = unit.currentStats || getCachedPokemonInfo(unit.name)?.currentStats || null;
        const hasCurrentStats = Boolean(currentStats && Object.keys(currentStats).length > 0);
        const stats = hasCurrentStats ? currentStats : getPokemonBaseStats(unit);
        const offense = Math.max(
            getPokemonStat(stats, 'atk', 'attack'),
            getPokemonStat(stats, 'special', 'spa', 'spatk')
        );
        const speed = getPokemonStat(stats, 'speed', 'spe');
        return {
            offense,
            speed,
            statsKnown: Boolean(stats),
            currentStatsKnown: hasCurrentStats
        };
    }

    function getSinnohTowerTrainingContext(team = [], opponentProfile = null) {
        const progress = getTowerProgressContext();
        const earlyByMap = progress.mapOrdinal !== null
            ? progress.mapOrdinal <= CONFIG.SINNOH_TRAINING_MAP_COUNT
            : (progress.reward > 0 ? progress.reward < CONFIG.SINNOH_TRAINING_MAX_REWARD : progress.round <= 2);
        const active = Boolean(CONFIG.SINNOH_TOWER_EARLY_TRAINING && progress.isSinnoh && earlyByMap);
        const carry = getPrimaryCarry(team || []);
        const carryKey = carry ? getPokemonIdentityKey(carry.name) : '';
        const observedMoveTier = getUnitKnownMoveTier(carry);
        const rememberedMoveTier = carryKey && Number.isFinite(sinnohCarryKnownTmTiers[carryKey])
            ? sinnohCarryKnownTmTiers[carryKey]
            : -1;
        const moveTier = Math.max(observedMoveTier, rememberedMoveTier);
        const stats = getUnitOffenseSpeedSnapshot(carry);

        return {
            active,
            progress,
            carry,
            carryKey,
            carryMoveTier: moveTier,
            observedCarryMoveTier: observedMoveTier,
            rememberedCarryMoveTier: rememberedMoveTier,
            needsTm: Boolean(active && carry && moveTier < CONFIG.SINNOH_TM_MAX_MOVE_TIER),
            needsOffense: Boolean(active && carry && (!stats.statsKnown || stats.offense < CONFIG.SINNOH_OFFENSE_TARGET || moveTier < CONFIG.SINNOH_TM_MAX_MOVE_TIER)),
            needsSpeed: Boolean(active && carry && (!stats.statsKnown || stats.speed < CONFIG.SINNOH_SPEED_TARGET)),
            stats,
            opponent: opponentProfile || null
        };
    }

    function getNextTraitThreshold(count) {
        if ((count || 0) < 2) return 2;
        if ((count || 0) < 4) return 4;
        if ((count || 0) < 6) return 6;
        return 0;
    }

    function isSinnohTowerRunContext() {
        return Boolean(CONFIG.SINNOH_TOWER_EARLY_TRAINING && getTowerProgressContext().isSinnoh);
    }

    function getSinnohBossKeyFromProfile(opponentProfile = null) {
        const profileText = foldText([
            opponentProfile?.name || '',
            ...(opponentProfile?.team || []).map(mon => mon.name || ''),
            ...(opponentProfile?.types || []),
            ...(opponentProfile?.teamTypes || []),
            ...(getProgressLabels() || [])
        ].join(' '));

        const bossKeys = Object.keys(SINNOH_BOSS_RUN_PLAN).sort((a, b) => b.length - a.length);
        for (const key of bossKeys) {
            const dbName = BOSS_TEAM_DB[key]?.name || '';
            if (profileText.includes(foldText(key)) || (dbName && profileText.includes(foldText(dbName)))) {
                return key;
            }
        }

        if (profileText.includes('arceus')) return 'arceus';
        return '';
    }

    function getSinnohBossRunPlan(opponentProfile = null) {
        const key = getSinnohBossKeyFromProfile(opponentProfile);
        if (!key || !SINNOH_BOSS_RUN_PLAN[key]) return null;
        return {
            key,
            battleIndex: SINNOH_BOSS_ORDER.indexOf(key) >= 0 ? SINNOH_BOSS_ORDER.indexOf(key) + 1 : null,
            ...SINNOH_BOSS_RUN_PLAN[key],
            bossProfile: BOSS_TEAM_DB[key] || null
        };
    }

    function scoreSinnohBossRunPlanFit(passiveTypes = [], attackTypes = [], team = [], opponentProfile = null, options = {}) {
        if (!isSinnohTowerRunContext()) return 0;
        const types = normalizeTypeList(passiveTypes);
        const rawAttacks = Array.isArray(attackTypes) ? attackTypes : [];
        const attacks = normalizeTypeList(rawAttacks.length > 0 ? rawAttacks : passiveTypes);
        const bossPlan = getSinnohBossRunPlan(opponentProfile);
        const bossKey = bossPlan?.key || '';
        const arceusPlan = SINNOH_BOSS_RUN_PLAN.arceus;
        const postArceusPlan = SINNOH_BOSS_RUN_PLAN[SINNOH_POST_ARCEUS_BOSS_KEY];
        let score = 0;

        const scorePlan = (plan, weight) => {
            if (!plan || weight <= 0) return;
            const wantedAttacks = normalizeTypeList(plan.attackTypes || []);
            const wantedPassives = normalizeTypeList(plan.passiveTypes || []);

            wantedAttacks.forEach(type => {
                if (attacks.includes(type)) score += 13 * weight;
                else if (types.includes(type)) score += 6 * weight;
            });
            wantedPassives.forEach(type => {
                if (types.includes(type)) score += 8 * weight;
            });
        };

        const scoreBossProfileCoverage = (profile, weight) => {
            if (!profile || weight <= 0) return;
            const bossTypes = getOpponentTeamTypes(profile);
            if (bossTypes.length === 0) return;
            score += getAttackCoverageScore(attacks, bossTypes) * 6 * weight;
            score += getDefensiveMatchupScore(types, bossTypes) * 3 * weight;
        };

        scorePlan(bossPlan, options.bossWeight ?? 1);
        if (bossKey !== 'arceus') {
            const arceusWeight = options.arceusWeight ?? 0.65;
            scorePlan(arceusPlan, arceusWeight);
            scoreBossProfileCoverage(BOSS_TEAM_DB.arceus, arceusWeight * 0.75);
        }
        if (bossKey !== SINNOH_POST_ARCEUS_BOSS_KEY) {
            scorePlan(postArceusPlan, options.postArceusWeight ?? 0.55);
            scoreBossProfileCoverage(BOSS_TEAM_DB[SINNOH_POST_ARCEUS_BOSS_KEY], (options.postArceusWeight ?? 0.55) * 0.75);
        }

        if (bossPlan?.bossProfile) {
            scoreBossProfileCoverage(bossPlan.bossProfile, options.bossWeight ?? 1);
        }

        const counts = getTeamTraitCounts(team || []);
        types.forEach(type => {
            const current = counts[type] || 0;
            if (current === 1 || current === 3 || current === 5) score += 6;
        });

        return score;
    }

    function scoreSinnohPassivePlanForTypes(types, team, options = {}) {
        const passiveTypes = normalizeTypeList(types || []);
        if (!isSinnohTowerRunContext() || passiveTypes.length === 0) return 0;

        const targets = CONFIG.SINNOH_PASSIVE_TARGETS || {};
        const counts = getTeamTraitCounts(team || []);
        const addCount = options.isShiny ? 2 : 1;
        let score = 0;

        passiveTypes.forEach(type => {
            const plan = targets[type];
            if (!plan) return;

            const current = counts[type] || 0;
            const target = current < plan.target ? plan.target : (current < plan.stretch ? plan.stretch : 0);
            const nextThreshold = getNextTraitThreshold(current);
            const completesThreshold = nextThreshold > 0 && current < nextThreshold && current + addCount >= nextThreshold;

            if (target > 0) {
                const missingBefore = Math.max(0, target - current);
                const missingAfter = Math.max(0, target - current - addCount);
                const progress = missingBefore - missingAfter;
                score += plan.priority * (progress > 0 ? 0.32 * progress : 0.12);
                if (completesThreshold) score += plan.priority * 0.45;
                if (type === 'Rock' && target >= 4) score += 16;
                if (type === 'Dragon' && current < plan.target) score += 14;
            } else {
                score += Math.min(10, plan.priority * 0.08);
            }
        });

        score += scoreSinnohBossRunPlanFit(passiveTypes, passiveTypes, team, options.opponentProfile || null, {
            bossWeight: 0.55,
            arceusWeight: 0.85,
            postArceusWeight: 0.75
        });

        return score;
    }

    function scoreSinnohPowerCatchCandidate(candidateName, candidateTypes, team, options = {}) {
        if (!isSinnohTowerRunContext() || !candidateName) return 0;

        const types = normalizeTypeList(candidateTypes || getKnownPokemonTypes(candidateName));
        const attackTypes = normalizeTypeList(options.attackTypes || types);
        const stats = getPokemonBaseStats(candidateName);
        const bst = getPokemonBaseStatTotal(stats);
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        const currentAvgLevel = getTeamAverageLevel(team || []);
        const candidateLevel = options.level || 0;
        let score = 0;

        score += Math.max(0, bst - 460) / 7;
        score += offense / 8;
        score += speed / 12;
        score += bulk / 55;
        if (candidateLevel && currentAvgLevel && candidateLevel >= currentAvgLevel - 3) score += 14;
        if (candidateLevel && currentAvgLevel && candidateLevel < currentAvgLevel - 8) score -= 12;
        if (isLegendaryPokemonName(candidateName)) score += 38;
        if (options.isShiny) score += 10;
        if (isMainCarryName(candidateName)) score += 34;

        if (attackTypes.includes('Fighting')) score += 18; // Arceus checkpoint is normally typed here.
        if (types.includes('Fire') || types.includes('Dragon') || types.includes('Dark') || types.includes('Ghost') || types.includes('Fairy')) score += 12;
        if (types.includes('Rock') || types.includes('Steel') || types.includes('Water') || types.includes('Grass')) score += 9;
        if (types.includes('Poison') && bst < 520) score -= 12;
        score += scoreSinnohBossRunPlanFit(types, attackTypes, team, options.opponentProfile || null, {
            bossWeight: 1.25,
            arceusWeight: 0.8,
            postArceusWeight: 0.7
        });

        return score;
    }

    function scoreSinnohPassiveCardPurpose({ passiveTypes, text, team, isShinyPassive, isSpeed, isSurvival, isDamage }) {
        if (!isSinnohTowerRunContext()) return 0;

        const typeScore = scoreSinnohPassivePlanForTypes(passiveTypes, team, { isShiny: isShinyPassive });
        const lowersOffense = Boolean(
            text.match(/lower|reduce|decrease|drop|debuff|baj|reduc|dismin|resta/) &&
            text.match(/atk|attack|ataque|sp\.?\s*atk|special attack|ataque especial|ofens/)
        );
        const raisesDefense = Boolean(text.match(/def|defense|defensa|sp\.?\s*def|resist|shield|escudo|armor|armadura/));
        const types = normalizeTypeList(passiveTypes);
        let score = typeScore;

        if (isSpeed || text.match(/first|priority|primero|velocidad/)) score += 54;
        if (lowersOffense) score += 58;
        if (isSurvival || raisesDefense) score += 36;
        if (isDamage && types.includes('Dragon')) score += 22;
        if (types.includes('Rock') && (raisesDefense || isSurvival)) score += 32;
        if (types.includes('Water') && lowersOffense) score += 34;
        if (types.includes('Fairy') && lowersOffense) score += 22;
        if (types.includes('Flying') && isSpeed) score += 20;
        if (types.length === 0 && !(isSpeed || lowersOffense || raisesDefense || isSurvival)) score -= 14;

        return score;
    }

    function getTierScore(itemName) {
        const tier = ITEM_TIERS[normalizeItemName(itemName)] || 'D';
        return TIER_SCORE[tier] || 10;
    }

    function getItemBoostType(itemName) {
        return ITEM_TYPE_MATCH[normalizeItemName(itemName)] || null;
    }

    function getPrimaryAttackTypeFromPokedexEntry(entry) {
        if (!entry) return null;
        const rawCandidates = [
            entry.primaryAttackType,
            entry.mainAttackType,
            entry.attackType,
            entry.moveType,
            entry.primaryMove?.type,
            entry.mainMove?.type,
            entry.move?.type,
            Array.isArray(entry.moves) ? entry.moves[0]?.type : null,
            Array.isArray(entry.attacks) ? entry.attacks[0]?.type : null,
        ];

        for (const value of rawCandidates) {
            if (!value) continue;
            if (TYPES.includes(value)) return value;
            const detectedTypes = detectTypesInText(String(value));
            if (detectedTypes.length > 0) return detectedTypes[0];
        }

        return null;
    }

    function getUnitPrimaryAttackType(unit) {
        if (!unit) return null;
        const name = typeof unit === 'string' ? unit : unit.name;

        const cachedInfo = getCachedPokemonInfo(name);
        if (cachedInfo?.primaryAttackType) return cachedInfo.primaryAttackType;
        if (cachedInfo?.attackTypes && cachedInfo.attackTypes.length > 0) return cachedInfo.attackTypes[0];

        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key]) {
                return POKEMON_PRIMARY_ATTACK_TYPE_OVERRIDES[key];
            }
        }

        const pokedexPrimary = getPrimaryAttackTypeFromPokedexEntry(getPokelikePokedexEntry(name));
        if (pokedexPrimary) return pokedexPrimary;

        const explicitAttackTypes = normalizeTypeList(typeof unit === 'object' ? (unit.attackTypes || []) : []);
        if (explicitAttackTypes.length > 0) return explicitAttackTypes[0];

        const knownTypes = normalizeTypeList((typeof unit === 'object' && unit.types && unit.types.length > 0) ? unit.types : getKnownPokemonTypes(name));
        if (knownTypes.length > 0) return knownTypes[0];

        const likelyTypes = getLikelyAttackTypes(typeof unit === 'object' ? unit : { name });
        return likelyTypes.length > 0 ? likelyTypes[0] : null;
    }

    function getUnitPrimaryAttackTypes(unit) {
        const primaryType = getUnitPrimaryAttackType(unit);
        return primaryType ? [primaryType] : [];
    }

    function hasMatchingAttackForItem(unit, itemName) {
        const matchingType = getItemBoostType(itemName);
        if (!matchingType || !unit) return false;
        return getUnitPrimaryAttackType(unit) === matchingType;
    }

    function isTypeBoostItemUsefulForTeam(itemName, team) {
        const matchingType = getItemBoostType(itemName);
        if (!matchingType) return true;
        return getAliveTeam(team).some(p => hasMatchingAttackForItem(p, itemName));
    }

    function getConfiguredMainCarryKeys() {
        const configuredKeys = (CONFIG.MAIN_CARRY_NAMES || []).flatMap(name => getPokemonLookupKeys(name));
        return [...new Set([...configuredKeys, getBotControlSelectedMainKey()].filter(Boolean))];
    }

    function isMainCarryName(name) {
        if (!name) return false;
        const carryKeys = getConfiguredMainCarryKeys();
        const lookupKeys = getPokemonLookupKeys(name);
        return lookupKeys.some(key => carryKeys.some(carryKey => key === carryKey || key.startsWith(`${carryKey}-`)));
    }

    function isMainCarryUnit(unit) {
        return Boolean(unit && isMainCarryName(unit.name));
    }

    function getMainCarry(team) {
        return getAliveTeam(team || []).find(p => isMainCarryUnit(p)) || null;
    }

    function getPrimaryCarry(team) {
        const alive = getAliveTeam(team || []);
        return alive.find(p => p.index === 0 && isMainCarryUnit(p)) ||
               getMainCarry(alive) ||
               alive[0] ||
               null;
    }

    function getPokemonIdentityKey(name) {
        return getPokemonLookupKeys(name)[0] || foldText(name || '');
    }

    function getSameNameTeamGroup(team, name) {
        const key = getPokemonIdentityKey(name);
        const units = (team || []).filter(p => p && getPokemonIdentityKey(p.name) === key);
        return {
            key,
            name: units[0]?.name || name || '',
            units,
            alive: units.filter(p => !p.isFainted),
            fainted: units.filter(p => p.isFainted)
        };
    }

    function getDuplicateGroups(team) {
        const groups = new Map();
        (team || []).forEach(unit => {
            if (!unit?.name) return;
            const key = getPokemonIdentityKey(unit.name);
            if (!key) return;
            if (!groups.has(key)) {
                groups.set(key, { key, name: unit.name, units: [], alive: [], fainted: [] });
            }
            const group = groups.get(key);
            group.units.push(unit);
            if (unit.isFainted) group.fainted.push(unit);
            else group.alive.push(unit);
        });

        return [...groups.values()].filter(group => group.units.length >= 2);
    }

    function getDuplicatePairCount(team) {
        return getDuplicateGroups(team).length;
    }

    function hasDuplicatePair(team) {
        return getDuplicatePairCount(team) > 0;
    }

    function getExpectedCatchCopiesFromOpenSlots(team) {
        const freeSlots = Math.max(0, CONFIG.TEAM_TARGET_SIZE - (team || []).length);
        return Math.min(2, freeSlots);
    }

    function getDuplicatePairCatchScore(candidateName, candidateTypes, team, attackTypes = null, bossTypes = null, options = {}) {
        if (!candidateName) return 0;

        const expectedCopies = Number.isFinite(options.expectedCatchCopies)
            ? Math.max(0, options.expectedCatchCopies)
            : 0;
        const group = getSameNameTeamGroup(team, candidateName);
        const existingCount = group.units.length;
        const alreadyHasThisPair = existingCount >= 2;
        const createsPair = expectedCopies >= 2 || (existingCount > 0 && existingCount + expectedCopies >= 2);
        if (!createsPair && !alreadyHasThisPair) return 0;

        const types = normalizeTypeList(candidateTypes);
        const targetTypes = normalizeTypeList(bossTypes);
        const teamTypes = getTeamTypes(team);
        const addsNewType = types.some(type => !teamTypes.includes(type));
        const bossCounterScore = targetTypes.length > 0
            ? scoreCatchBossCounter(types, attackTypes || types, targetTypes)
            : 0;
        const teamAlreadyHasPair = hasDuplicatePair(team);

        let score = 0;
        if (createsPair && !alreadyHasThisPair) {
            score += teamAlreadyHasPair
                ? CONFIG.DUPLICATE_EXTRA_PAIR_CATCH_BONUS
                : CONFIG.DUPLICATE_FIRST_PAIR_CATCH_BONUS;
            if (existingCount === 1) score += Math.round(CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS * 0.5);
            if (expectedCopies >= 2) score += 6;
        } else {
            score += CONFIG.DUPLICATE_EXISTING_PAIR_CATCH_BONUS;
        }

        if (addsNewType) score += 8;
        if (bossCounterScore > 0) score += Math.min(20, bossCounterScore);

        const bst = getPokemonBaseStatTotal(getPokemonBaseStats(candidateName));
        if (bst >= CONFIG.LEGENDARY_CATCH_MIN_BST) score += 10;
        else if (bst >= 480) score += 5;

        if (!addsNewType && bossCounterScore <= 0 && teamTypes.length < CONFIG.DUPLICATE_MIN_COVERAGE_TYPES_BEFORE_EXTRA_PAIR) {
            score -= CONFIG.DUPLICATE_LOW_COVERAGE_PENALTY;
        }
        if (teamAlreadyHasPair && !addsNewType && bossCounterScore <= 0 && !isLegendaryPokemonName(candidateName)) {
            score -= Math.round(CONFIG.DUPLICATE_LOW_COVERAGE_PENALTY * 0.7);
        }

        return Math.max(0, score);
    }

    function getDuplicatePairRouteScore(team) {
        if (getExpectedCatchCopiesFromOpenSlots(team) < 2) return 0;
        return hasDuplicatePair(team)
            ? Math.round(CONFIG.DUPLICATE_PAIR_ROUTE_BONUS * 0.3)
            : CONFIG.DUPLICATE_PAIR_ROUTE_BONUS;
    }

    function getDuplicateIncomingSwapScore(candidateName, team) {
        const group = getSameNameTeamGroup(team, candidateName);
        if (group.units.length === 1) return CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS;
        if (group.units.length >= 2) return Math.round(CONFIG.DUPLICATE_EXTRA_PAIR_CATCH_BONUS * 0.8);
        return 0;
    }

    function getDuplicatePairReplacementProtectionScore(unit, team, incomingName = '') {
        if (!unit?.name) return 0;

        const group = getSameNameTeamGroup(team, unit.name);
        const incomingKeepsSingleton = group.units.length === 1 &&
            incomingName &&
            getPokemonIdentityKey(incomingName) === group.key;
        if (incomingKeepsSingleton) {
            return CONFIG.DUPLICATE_PAIR_CREATE_SWAP_BONUS + 10;
        }
        if (group.units.length < 2) return 0;

        let score = CONFIG.DUPLICATE_PAIR_KEEP_BONUS;
        if (group.units.length === 2) score += 12;
        else if (group.units.length >= 3) score -= 12;
        if (group.alive.length > 0 && group.fainted.length > 0) score += CONFIG.DUPLICATE_PAIR_REVIVE_BONUS;
        if (group.alive.length >= 2) score += 8;
        if (isMainCarryUnit(unit)) score += 18;
        if (isLegendaryPokemonName(unit.name)) score += 12;

        const extraPairPenalty = Math.max(0, getDuplicatePairCount(team) - 1) * 8;
        if (extraPairPenalty && !isMainCarryUnit(unit) && !isLegendaryPokemonName(unit.name)) {
            score -= Math.min(18, extraPairPenalty);
        }

        return Math.max(8, score);
    }

    function isHealingItem(itemName) {
        return ['shell bell', 'leftovers'].includes(normalizeItemName(itemName));
    }

    function isLowValueHeldItem(itemName) {
        return LOW_VALUE_HELD_ITEMS.has(normalizeItemName(itemName));
    }

    function isMainCarryPreferredHeldItem(itemName) {
        itemName = normalizeItemName(itemName);
        return MAIN_CARRY_SUSTAIN_ITEMS.has(itemName) || MAIN_CARRY_OFFENSE_ITEMS.has(itemName);
    }

    function isMainCarryOffenseItem(itemName) {
        return MAIN_CARRY_OFFENSE_ITEMS.has(normalizeItemName(itemName));
    }

    function isPokemonElementShiny(element) {
        if (!element) return false;
        const text = element.innerText || '';
        return Boolean(
            element.classList?.contains('shiny') ||
            element.classList?.contains('shiny-card') ||
            element.classList?.contains('pc-dex-card--shiny') ||
            element.querySelector?.('.shiny, .shiny-icon, .shiny-star, .pc-shiny-star, [class*="shiny"], [data-shiny="true"]') ||
            text.includes('★')
        );
    }

    function getOffenseRole(unit) {
        return isSpecialAttacker(unit) ? 'special' : 'physical';
    }

    function isConfiguredLegendaryName(name) {
        if (!name) return false;
        const legendaryKeys = (CONFIG.LEGENDARY_POKEMON_NAMES || []).flatMap(legendary => getPokemonLookupKeys(legendary));
        const lookupKeys = getPokemonLookupKeys(name);
        return lookupKeys.some(key => legendaryKeys.includes(key));
    }

    function isLegendaryPokemonName(name) {
        if (isConfiguredLegendaryName(name)) return true;
        const bst = getPokemonBaseStatTotal(getPokemonBaseStats(name));
        return bst >= CONFIG.LEGENDARY_CATCH_MIN_BST;
    }

    function getGrassSupportCatchScore(candidateTypes, team) {
        if (!getMainCarry(team) || !normalizeTypeList(candidateTypes).includes('Grass')) return 0;
        const grassCount = getTeamTraitCounts(team).Grass || 0;
        let score = CONFIG.GRASS_SUPPORT_CATCH_BONUS;
        if (grassCount === 1 || grassCount === 3 || grassCount === 5) {
            score += CONFIG.GRASS_SUPPORT_THRESHOLD_BONUS;
        } else if (grassCount === 0) {
            score += 8;
        }
        return score;
    }

    function getPokemonCarryScore(p) {
        if (!p) return 0;
        const traitScore = (p.types || []).reduce((sum, type) => {
            const trait = TRAIT_DATA[type];
            return sum + (trait ? (TRAIT_TIER_VALUE[trait.tier] || 1) : 0);
        }, 0);
        const sweeperBonus = (p.types || []).some(t => SWEEPER_TYPES.includes(t)) ? 14 : 0;
        const tankBonus = (p.types || []).some(t => TANK_TYPES.includes(t)) ? 8 : 0;
        const stats = getPokemonBaseStats(p);
        const atk = getPokemonStat(stats, 'atk', 'attack');
        const spa = getPokemonStat(stats, 'special', 'spa', 'spatk');
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        const statScore = stats ? Math.max(atk, spa) * 0.18 + speed * 0.08 + bulk * 0.04 : 0;
        const mainCarryBonus = isMainCarryUnit(p) ? 90 + (p.index === 0 ? 25 : 0) : 0;
        const sustainBonus = p.heldItem && isHealingItem(p.heldItem) ? 14 : 0;
        return (p.hp || 0) / 3 + (p.level || 0) / 2 + traitScore * 2 + sweeperBonus + tankBonus + statScore + mainCarryBonus + sustainBonus;
    }

    function getTraitCompletionScore(candidateTypes, team) {
        const counts = getTeamTraitCounts(team);
        const teamTypes = getTeamTypes(team);
        let score = 0;

        candidateTypes.forEach(type => {
            const traitInfo = TRAIT_DATA[type];
            if (!traitInfo) return;
            const current = counts[type] || 0;
            const tierValue = TRAIT_TIER_VALUE[traitInfo.tier] || 1;
            const nextThreshold = current < 2 ? 2 : current < 4 ? 4 : current < 6 ? 6 : 0;

            if (nextThreshold) {
                const missing = nextThreshold - current;
                if (missing === 1) score += tierValue * 3.2;
                else score += tierValue * 0.7;
            } else {
                score += tierValue * 0.4;
            }

            if (!teamTypes.includes(type)) {
                score += 5 + tierValue * 0.35;
            }
        });

        return score;
    }

    function scoreHeldItemForPokemon(p, itemName, bossType = null) {
        itemName = normalizeItemName(itemName);
        if (!p || !itemName || USABLE_ITEMS.has(itemName)) return 0;
        const targetTypes = getOpponentTeamTypes(bossType);

        let score = getTierScore(itemName) / 4;
        score += (p.hp || 0) / 25;
        score += getPokemonCarryScore(p) / 14;
        if (isLowValueHeldItem(itemName)) score -= 120;

        const matchingType = getItemBoostType(itemName);
        if (matchingType) {
            score += hasMatchingAttackForItem(p, itemName) ? 95 : -90;
        }

        if (itemName === 'metronome' && p.types.length > 1) score += 45;
        if (itemName === 'expert belt' && targetTypes.length > 0 && getAttackCoverageScore(getUnitAttackTypes(p), targetTypes) > 0) score += 80;
        if (itemName === 'red card' && bossType) score += 30;
        if (itemName === 'loaded dice' && p.types.some(t => ['Fire','Dragon','Dark','Electric'].includes(t))) score += 18;
        if (itemName === 'power bracer') score += 24;

        const isSweeper = p.types.some(t => SWEEPER_TYPES.includes(t));
        const isTank = p.types.some(t => TANK_TYPES.includes(t));
        const specialAttacker = isSpecialAttacker(p);
        const isMainCarry = isMainCarryUnit(p);
        const stats = getPokemonBaseStats(p);
        const speed = getPokemonStat(stats, 'speed', 'spe');
        const offense = Math.max(getPokemonStat(stats, 'atk', 'attack'), getPokemonStat(stats, 'special', 'spa', 'spatk'));
        const bulk = getPokemonStat(stats, 'hp') + getPokemonStat(stats, 'def') + getPokemonStat(stats, 'spdef', 'spd');
        if (['choice band', 'atk band'].includes(itemName)) score += specialAttacker ? -70 : 64;
        if (['choice specs', 'spa specs'].includes(itemName)) score += specialAttacker ? 64 : -70;
        if (itemName === 'life orb') score += 26 + (isSweeper ? 12 : 0);
        if (itemName === 'lagging tail') {
            if (stats) {
                if (speed <= 60) score += 40;
                else if (speed <= 80) score += 18;
                else if (speed >= 100) score -= 48;
                else if (speed >= 90) score -= 28;
                if (bulk >= 260) score += 18;
                if (offense >= 95) score += 16;
                if (speed >= 90 && offense >= 100) score -= 24;
            } else {
                score += isTank ? 18 : -12;
            }
            if (isSweeper && speed >= 90) score -= 24;
            score -= 150;
        }
        if (['choice scarf', 'quick claw'].includes(itemName) && isSweeper) score += 22;
        if (['scope lens', 'razor claw'].includes(itemName) && p.types.some(t => ['Dark','Ghost','Flying','Electric'].includes(t))) score += 26;
        if (itemName === 'shell bell' && isSweeper) score += 24;
        if (['leftovers', 'assault vest', 'rocky helmet', 'red card'].includes(itemName) && isTank) score += 24;
        if (itemName === 'eviolite') score -= 80;
        if (itemName === 'lucky egg') score += (p.index === 0 ? 34 : 16) + Math.max(0, 55 - (p.level || 55)) / 2;
        if (isMainCarry) {
            if (itemName === 'leftovers') {
                score += CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS + 125 + (p.index === 0 ? 55 : 0);
            } else if (itemName === 'shell bell') {
                score += CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS + 35 + (p.index === 0 ? 45 : 0);
            }
            if (isMainCarryOffenseItem(itemName) || ['power bracer', 'loaded dice', 'expert belt'].includes(itemName)) {
                score += CONFIG.MAIN_CARRY_OFFENSE_ITEM_BONUS;
            }
            if (itemName === 'lucky egg') {
                score += Math.max(0, 70 - (p.level || 70)) / 2;
            }
        }

        return score;
    }

    function scoreConsumableTarget(p, itemName) {
        itemName = normalizeItemName(itemName);
        if (!p) return 0;
        const carry = getPokemonCarryScore(p);
        const mainCarryBonus = isMainCarryUnit(p) ? CONFIG.MAIN_CARRY_CONSUMABLE_BONUS + (p.index === 0 ? 30 : 0) : 0;
        if (itemName === 'rare candy') {
            return carry + mainCarryBonus + (p.index === 0 ? 35 : 0) + Math.max(0, 80 - (p.level || 80)) / 4;
        }
        if (itemName === 'moon stone') {
            return carry / 2 + mainCarryBonus * 0.35 + 55 + (p.index === 0 ? 10 : 0);
        }
        if (itemName === 'tm normal') {
            return carry / 2 + mainCarryBonus * 0.7 + 45 + (p.index === 0 ? 25 : 0);
        }
        if (itemName === 'sacred ash') {
            return (p.isFainted ? 220 : 100 - (p.hp || 100)) + carry / 4 + mainCarryBonus * 0.6;
        }
        return carry / 3;
    }

    let pokelikePokedexCacheSource = null;
    let pokelikePokedexCacheIndex = null;

    function getPokemonLookupKeys(name) {
        const folded = foldText(name || '')
            .replace(/\u2640/g, '-f')
            .replace(/\u2642/g, '-m')
            .replace(/[']/g, '');
        const safe = folded.replace(/[^a-z0-9. -]/g, ' ').replace(/\s+/g, ' ').trim();
        const noDot = safe.replace(/\./g, '');
        const hyphen = noDot.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const spaced = noDot.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        return [...new Set([
            folded,
            safe,
            noDot,
            hyphen,
            spaced,
            spaced === 'mr mime' ? 'mr. mime' : '',
            spaced === 'mime jr' ? 'mime-jr' : '',
        ].filter(Boolean))];
    }

    function getPokelikePokedex() {
        if (typeof window === 'undefined') return null;
        const pokedex = window.__POKEDEX__ || window.__POKEDEX_;
        return pokedex && typeof pokedex === 'object' ? pokedex : null;
    }

    function getPokelikePokedexIndex() {
        const pokedex = getPokelikePokedex();
        if (!pokedex) return null;
        if (pokedex === pokelikePokedexCacheSource && pokelikePokedexCacheIndex) {
            return pokelikePokedexCacheIndex;
        }

        const index = new Map();
        Object.values(pokedex).forEach(entry => {
            if (!entry || !entry.name) return;
            getPokemonLookupKeys(entry.name).forEach(key => index.set(key, entry));
        });

        pokelikePokedexCacheSource = pokedex;
        pokelikePokedexCacheIndex = index;
        return index;
    }

    function getPokelikePokedexEntry(name) {
        const index = getPokelikePokedexIndex();
        if (!index) return null;
        for (const key of getPokemonLookupKeys(name)) {
            if (index.has(key)) return index.get(key);
        }
        return null;
    }

    function getManualPokemonTypes(name) {
        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_DB[key]) return POKEMON_DB[key];
        }
        return [];
    }

    function getKnownPokemonTypes(name) {
        const cachedInfo = getCachedPokemonInfo(name);
        if (cachedInfo?.types && cachedInfo.types.length > 0) return cachedInfo.types;

        const manualTypes = getManualPokemonTypes(name);
        if (manualTypes.length > 0) return manualTypes;
        const pokedexEntry = getPokelikePokedexEntry(name);
        return pokedexEntry ? normalizeTypeList(pokedexEntry.types || []) : [];
    }

    function getPokemonBaseStats(pokemon) {
        if (!pokemon) return null;
        if (pokemon.baseStats) return pokemon.baseStats;

        const name = typeof pokemon === 'string' ? pokemon : pokemon.name;
        for (const key of getPokemonLookupKeys(name)) {
            if (POKEMON_STAT_OVERRIDES[key]) return POKEMON_STAT_OVERRIDES[key];
        }

        const pokedexEntry = getPokelikePokedexEntry(name);
        if (pokedexEntry?.baseStats) return pokedexEntry.baseStats;

        const cachedInfo = getCachedPokemonInfo(name);
        return cachedInfo?.currentStats || null;
    }

    function getPokemonStat(stats, ...keys) {
        if (!stats) return 0;
        for (const key of keys) {
            const value = stats[key];
            if (Number.isFinite(value)) return value;
        }
        return 0;
    }

    function isSpecialAttacker(pokemon) {
        const stats = getPokemonBaseStats(pokemon);
        if (!stats) {
            return (pokemon?.types || []).some(type => SPECIAL_TYPES.includes(type));
        }
        const atk = getPokemonStat(stats, 'atk', 'attack');
        const spa = getPokemonStat(stats, 'special', 'spa', 'spatk');
        return spa >= atk;
    }

    function getLikelyMoveTier(pokemon) {
        if (Number.isFinite(pokemon?.moveTier)) {
            return Math.max(0, Math.min(2, pokemon.moveTier));
        }
        const level = pokemon?.level || 0;
        if (level >= 42) return 2;
        if (level > 0 && level < 16) return 0;
        return 1;
    }

    function getLikelyMoveForType(pokemon, type) {
        const pool = POKELIKE_MOVE_POOL[type];
        if (!pool) return null;
        const category = isSpecialAttacker(pokemon) ? 'special' : 'physical';
        const tier = getLikelyMoveTier(pokemon);
        const move = (pool[category] && pool[category][tier]) ||
                     (pool[category] && pool[category][0]) ||
                     (pool.physical && pool.physical[0]) ||
                     (pool.special && pool.special[0]);
        return move ? { type, category, name: move[0], power: move[1] || 0 } : null;
    }

    function getLikelyAttackTypes(pokemon) {
        const types = normalizeTypeList((pokemon?.types && pokemon.types.length > 0) ? pokemon.types : getKnownPokemonTypes(pokemon?.name));
        return types
            .map(type => getLikelyMoveForType(pokemon, type) || { type, power: 0 })
            .sort((a, b) => b.power - a.power)
            .map(move => move.type);
    }

    function getAllKnownPokemonEntries() {
        const merged = new Map();
        Object.entries(POKEMON_DB).forEach(([name, types]) => {
            merged.set(getPokemonLookupKeys(name)[0] || name, { name, types });
        });

        const pokedex = getPokelikePokedex();
        if (pokedex) {
            Object.values(pokedex).forEach(entry => {
                if (!entry || !entry.name) return;
                const key = getPokemonLookupKeys(entry.name)[0] || entry.name;
                merged.set(key, { name: key, types: normalizeTypeList(entry.types || []) });
            });
        }

        return [...merged.values()];
    }

    function makeOpponentProfile({ name = '', types = [], team = [], sourceConfidence = 'fallback' } = {}) {
        const normalizedTeam = (team || []).map(mon => {
            const monName = foldText(mon.name || '');
            const monTypes = normalizeTypeList((mon.types && mon.types.length > 0) ? mon.types : getKnownPokemonTypes(monName));
            return { name: monName || 'unknown', types: monTypes };
        }).filter(mon => mon.types.length > 0);

        const leadTypes = normalizedTeam.length > 0 ? normalizedTeam[0].types : normalizeTypeList(types);
        const teamTypes = normalizeTypeList([
            ...normalizeTypeList(types),
            ...normalizedTeam.flatMap(mon => mon.types),
            ...leadTypes
        ]);

        return {
            name: name || (normalizedTeam[0] ? normalizedTeam[0].name : ''),
            types: normalizeTypeList(types.length > 0 ? types : teamTypes),
            leadTypes,
            teamTypes,
            team: normalizedTeam,
            sourceConfidence
        };
    }

    function getOpponentLeadTypes(opponent) {
        if (!opponent) return [];
        if (Array.isArray(opponent) || typeof opponent === 'string') return normalizeTypeList(opponent);
        return normalizeTypeList(opponent.leadTypes || opponent.types || opponent.teamTypes);
    }

    function getOpponentTeamTypes(opponent) {
        if (!opponent) return [];
        if (Array.isArray(opponent) || typeof opponent === 'string') return normalizeTypeList(opponent);
        return normalizeTypeList(opponent.teamTypes || opponent.types || opponent.leadTypes);
    }

    function getOpponentProfileLabel(opponent) {
        if (!opponent) return 'unknown';
        if (Array.isArray(opponent)) return opponent.join('/');
        if (typeof opponent === 'string') return opponent;
        const lead = getOpponentLeadTypes(opponent).join('/');
        const team = getOpponentTeamTypes(opponent).join('/');
        return `${opponent.name || 'opponent'} lead=${lead || '-'} team=${team || '-'}`;
    }

    function isNodeSpecificOpponentProfile(profile) {
        return Boolean(profile && ['visible-enemy-team', 'trainer-estimation'].includes(profile.sourceConfidence));
    }

    function isBossOpponentProfile(profile) {
        return Boolean(profile && ['boss-team-db', 'boss-type-map', 'detected-types', 'elite-prep-types'].includes(profile.sourceConfidence));
    }

    function isFinalBossOpponentProfile(profile = null) {
        const labelText = foldText((getProgressLabels() || []).join(' '));
        const opponentName = foldText(profile?.name || '');
        if (opponentName === 'arceus' || (!opponentName && labelText.includes('arceus'))) return false;
        return Boolean(
            labelText.match(/stage final boss|final boss|champion|campeon/) ||
            labelText.match(/\+400\b/) ||
            ['steven', 'steven stone', 'cynthia', 'red'].includes(opponentName)
        );
    }

    function getLeadAttackCoverageScore(unit, opponent) {
        return getAttackCoverageScore(getUnitAttackTypes(unit), getOpponentLeadTypes(opponent));
    }

    function isMetagrossLeadProfile(opponent) {
        if (!opponent) return false;
        const first = opponent.team && opponent.team[0];
        const leadTypes = getOpponentLeadTypes(opponent);
        const opponentName = foldText(opponent.name || '');
        return Boolean(
            (first && foldText(first.name || '').includes('metagross')) ||
            opponentName.includes('steven') ||
            (leadTypes.includes('Steel') && leadTypes.includes('Psychic'))
        );
    }

    function isUnsafeMainCarryLead(unit, opponent) {
        if (!unit || !isMainCarryUnit(unit) || !opponent) return false;
        const leadTypes = getOpponentLeadTypes(opponent);
        if (leadTypes.length === 0) return false;

        const attackCoverage = getLeadAttackCoverageScore(unit, opponent);
        const defensiveScore = getDefensiveMatchupScore(unit.types || [], leadTypes);
        const isFinalBoss = isFinalBossOpponentProfile(opponent);
        const metagrossLead = isMetagrossLeadProfile(opponent);

        return (isFinalBoss && attackCoverage <= 0 && defensiveScore <= 0) ||
               (metagrossLead && attackCoverage < 3);
    }

    function getMainCarryLeadProtectionMargin(unit, opponent, baseMargin) {
        if (!isMainCarryUnit(unit)) return baseMargin;
        if (isUnsafeMainCarryLead(unit, opponent)) return -40;
        return baseMargin;
    }

    function getNodeImageSrc(node) {
        if (!node) return '';
        const img = node.querySelector('image, img');
        return img ? (img.getAttribute('href') || img.getAttribute('xlink:href') || img.src || '').toLowerCase() : '';
    }

    function getNodeDescriptorParts(node) {
        if (!node) return [];

        const parts = [
            getNodeImageSrc(node),
            node.id || '',
            node.innerText || '',
            node.textContent || '',
            node.getAttribute('aria-label') || '',
            node.getAttribute('title') || '',
            node.getAttribute('class') || '',
            node.getAttribute('role') || ''
        ];

        Array.from(node.attributes || []).forEach(attr => {
            if (
                attr.name.startsWith('data-') ||
                ['id', 'class', 'title', 'aria-label', 'role', 'href', 'xlink:href'].includes(attr.name)
            ) {
                parts.push(`${attr.name} ${attr.value}`);
            }
        });

        Array.from(node.querySelectorAll('image, img, use, svg, [class], [title], [aria-label]')).slice(0, 12).forEach(child => {
            parts.push(
                child.id || '',
                child.getAttribute('class') || '',
                child.getAttribute('title') || '',
                child.getAttribute('aria-label') || '',
                child.getAttribute('alt') || '',
                child.getAttribute('href') || '',
                child.getAttribute('xlink:href') || '',
                child.getAttribute('src') || ''
            );
            Array.from(child.attributes || []).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    parts.push(`${attr.name} ${attr.value}`);
                }
            });
        });

        return parts.filter(Boolean);
    }

    function getNodeClassificationText(node) {
        return foldText(getNodeDescriptorParts(node).join(' '));
    }

    function getMapNodeDebugInfo(node) {
        if (!node) return null;
        const descriptor = getNodeDescriptorParts(node).join(' ').replace(/\s+/g, ' ').trim();
        const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        return {
            src: getNodeImageSrc(node).slice(-180),
            className: String(node.getAttribute('class') || '').slice(0, 180),
            ariaLabel: String(node.getAttribute('aria-label') || '').slice(0, 120),
            title: String(node.getAttribute('title') || '').slice(0, 120),
            text: text.slice(0, 140),
            descriptor: descriptor.slice(0, 260)
        };
    }

    function summarizeMapNodeTypes(nodes) {
        const counts = {};
        (nodes || []).forEach(node => {
            counts[node.type] = (counts[node.type] || 0) + 1;
        });
        return counts;
    }

    function findBossTeamProfileInText(text) {
        const folded = foldText(text || '');
        if (!folded) return null;

        for (const [key, data] of Object.entries(BOSS_TEAM_DB)) {
            if (folded.includes(foldText(key)) || folded.includes(foldText(data.name))) {
                return makeOpponentProfile({
                    name: data.name,
                    types: data.types || [],
                    team: data.team || [],
                    sourceConfidence: 'boss-team-db'
                });
            }
        }

        for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
            if (folded.includes(foldText(boss))) {
                return makeOpponentProfile({
                    name: boss,
                    types: [type],
                    sourceConfidence: 'boss-type-map'
                });
            }
        }

        return null;
    }

    function parseEnemyTeamFromScope(scope) {
        if (!scope) return [];
        const cards = Array.from(scope.querySelectorAll(
            '.battle-poke, .poke-card, .enemy-poke, [class*="battle-poke"], [class*="enemy-poke"]'
        ));
        const seen = new Set();
        const team = [];

        cards.forEach(card => {
            const nameEl = card.querySelector('.poke-card-name, .poke-name, [class*="name"]');
            const name = nameEl ? foldText(nameEl.innerText || '') : '';
            if (!name || seen.has(name)) return;

            const types = getKnownPokemonTypes(name);
            if (types.length === 0) return;

            seen.add(name);
            team.push({ name, types });
        });

        return team;
    }

    function detectNextOpponentProfile(node = null) {
        const scopes = [
            document.getElementById('elite-prep-enemy-side'),
            document.getElementById('battle-enemy-side'),
            document.getElementById('enemy-side')
        ].filter(Boolean);

        for (const scope of scopes) {
            const visibleTeam = parseEnemyTeamFromScope(scope);
            if (visibleTeam.length > 0) {
                const nameEl = document.getElementById('elite-prep-enemy-name');
                return makeOpponentProfile({
                    name: nameEl ? foldText(nameEl.innerText || '') : 'visible enemy',
                    team: visibleTeam,
                    sourceConfidence: 'visible-enemy-team'
                });
            }
        }

        if (node) {
            const nodeText = foldText([
                node.innerText || '',
                node.getAttribute('aria-label') || '',
                node.getAttribute('title') || '',
                node.getAttribute('class') || '',
                getNodeImageSrc(node)
            ].join(' '));

            const nodeBossProfile = findBossTeamProfileInText(nodeText);
            if (nodeBossProfile) return nodeBossProfile;

            for (const [key, types] of Object.entries(TRAINER_TYPE_ESTIMATION)) {
                if (nodeText.includes(key)) {
                    return makeOpponentProfile({
                        name: key,
                        types,
                        sourceConfidence: 'trainer-estimation'
                    });
                }
            }
        }

        const textParts = [
            document.getElementById('elite-prep-enemy-name')?.innerText || '',
            document.getElementById('map-info')?.innerText || '',
            node ? (node.innerText || '') : '',
            node ? (node.getAttribute('aria-label') || '') : '',
            node ? (node.getAttribute('title') || '') : '',
            node ? (node.getAttribute('class') || '') : '',
            node ? getNodeImageSrc(node) : ''
        ];

        const bossProfile = findBossTeamProfileInText(textParts.join(' '));
        if (bossProfile) return bossProfile;

        const detectedTypes = detectBossTypes();
        if (detectedTypes.length > 0) {
            return makeOpponentProfile({
                name: 'detected boss',
                types: detectedTypes,
                sourceConfidence: 'detected-types'
            });
        }

        return null;
    }

    function scoreLeadCandidate(p, bossType = null, options = {}) {
        if (!p || p.isFainted) return -999;
        let score = getPokemonCarryScore(p);
        const leadTypes = getOpponentLeadTypes(bossType);
        const teamTypes = getOpponentTeamTypes(bossType);
        if (isMainCarryUnit(p)) {
            score += CONFIG.MAIN_CARRY_LEAD_STICKINESS;
            if (p.heldItem && isHealingItem(p.heldItem)) {
                score += Math.round(CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS * 0.5);
            }
        }
        if (leadTypes.length > 0) {
            score += getAttackCoverageScore(getUnitAttackTypes(p), leadTypes) * CONFIG.BOSS_LEAD_WEIGHT;
            score += getDefensiveMatchupScore(p.types, leadTypes) * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 0.65);
        }
        if (teamTypes.length > 0) {
            score += getAttackCoverageScore(getUnitAttackTypes(p), teamTypes) * CONFIG.BOSS_TEAM_WEIGHT;
            score += getDefensiveMatchupScore(p.types, teamTypes) * Math.round(CONFIG.BOSS_TEAM_WEIGHT * 0.65);
        }
        if (!options.ignoreHeldItem) {
            if (p.heldItem) {
                const heldScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
                score += heldScore > 0 ? 30 + heldScore / 2 : heldScore / 2;
            }
            else score -= 18;
        }
        return score;
    }

    function scoreBattleOrderCandidate(p, bossType = null, slotIndex = 0, teamMaxLevel = 0) {
        if (!p || p.isFainted) return -999;
        let score = getPokemonCarryScore(p);
        const leadTypes = getOpponentLeadTypes(bossType);
        const teamTypes = getOpponentTeamTypes(bossType);
        const attacks = getUnitAttackTypes(p);
        const isMainCarry = isMainCarryUnit(p);

        if (slotIndex === 0 && isMainCarry) {
            score += CONFIG.MAIN_CARRY_LEAD_STICKINESS;
            if (p.heldItem && isHealingItem(p.heldItem)) {
                score += Math.round(CONFIG.MAIN_CARRY_HEAL_ITEM_BONUS * 0.55);
            }
            if (isUnsafeMainCarryLead(p, bossType)) {
                score -= CONFIG.MAIN_CARRY_LEAD_STICKINESS + 90;
            }
        }

        if (slotIndex === 0 && leadTypes.length > 0) {
            const leadAttackScore = getAttackCoverageScore(attacks, leadTypes);
            const leadDefenseScore = getDefensiveMatchupScore(p.types, leadTypes);
            score += leadAttackScore * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 1.15);
            score += leadDefenseScore * Math.round(CONFIG.BOSS_LEAD_WEIGHT * 0.8);
            if (isFinalBossOpponentProfile(bossType) && leadAttackScore >= 5) {
                score += 90;
            }
            if (isMetagrossLeadProfile(bossType) && leadAttackScore >= 5) {
                score += 120;
            }
        }

        if (teamTypes.length > 0) {
            const teamWeight = slotIndex === 0 ? CONFIG.BOSS_TEAM_WEIGHT : Math.round(CONFIG.BOSS_TEAM_WEIGHT * 1.6);
            score += getAttackCoverageScore(attacks, teamTypes) * teamWeight;
            score += getDefensiveMatchupScore(p.types, teamTypes) * Math.round(teamWeight * 0.7);
        }

        if (p.heldItem) {
            const heldScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
            score += heldScore > 0 ? 30 + heldScore / 2 : heldScore / 2;
        }
        else score -= slotIndex === 0 ? 24 : 10;

        if ((p.hp || 100) < CONFIG.CRITICAL_HP_THRESHOLD) score -= slotIndex === 0 ? 80 : 35;
        else if ((p.hp || 100) < CONFIG.LOW_HP_THRESHOLD) score -= slotIndex === 0 ? 35 : 12;

        if (teamMaxLevel > 0 && (p.level || 0) < teamMaxLevel - 3) {
            score -= slotIndex === 0 ? 120 : 35;
        }

        return score;
    }

    function ensureLeadHasHeldItem(team, bossType = null) {
        const lead = team[0];
        if (!lead || lead.isFainted || lead.heldItem) return false;
        if (!bossType) return false;
        if (isMainCarryUnit(lead) && (lead.hp || 100) >= CONFIG.CRITICAL_HP_THRESHOLD) {
            log('debug', '🎯', `Keeping itemless main carry [${lead.name}] in lead; waiting for a useful item instead of moving it out.`);
            recordRunEvent('carry-lead-kept-itemless', {
                name: lead.name,
                opponent: compactOpponentProfile(bossType),
                hp: lead.hp || 0
            });
            return false;
        }

        const itemHolders = team.filter(p => !p.isFainted && p.heldItem);
        if (itemHolders.length === 0) return false;

        const currentScore = scoreLeadCandidate(lead, bossType);
        const currentMatchupScore = scoreLeadCandidate(lead, bossType, { ignoreHeldItem: true });
        let best = null;
        let bestScore = -999;
        let bestMatchupScore = -999;
        itemHolders.forEach(p => {
            const score = scoreLeadCandidate(p, bossType);
            const matchupScore = scoreLeadCandidate(p, bossType, { ignoreHeldItem: true });
            if (score > bestScore) {
                best = p;
                bestScore = score;
                bestMatchupScore = matchupScore;
            }
        });

        const isBossPrep = isBossOpponentProfile(bossType);
        const moveThreshold = isBossPrep ? -10 : 8;
        const keepItemlessMatchupMargin = isBossPrep ? 28 : 14;

        if (best && best.index !== 0 && bestScore > currentScore + moveThreshold) {
            if (bossType && currentMatchupScore > bestMatchupScore + keepItemlessMatchupMargin) {
                log('debug', '🎯', `Keeping itemless lead [${lead.name}] because matchup beats item holder [${best.name}].`);
                return false;
            }
            log('info', '🎯', `Lead has no item. Moving item holder [${best.name}] to first slot.`);
            return tryTeamReorder(best.element, team[0].element, best, team[0], 'lead-item-holder');
        }

        return false;
    }

    function ensureLeadMeetsBattleLevel(team, prepStatus = null, opponentProfile = null) {
        const lead = team[0];
        const alive = getAliveTeam(team);
        if (!lead || lead.isFainted || alive.length <= 1) return false;

        const targetLeadLevel = prepStatus?.targets?.leadLevel || 0;
        if (!targetLeadLevel || (lead.level || 0) >= targetLeadLevel) return false;

        const reason = prepStatus?.targets?.reason || '';
        const seriousBattle = reason.includes('r2') ||
                              reason.includes('r3') ||
                              reason.includes('big-boss') ||
                              reason.includes('final') ||
                              isBossOpponentProfile(opponentProfile) ||
                              isFinalBossOpponentProfile(opponentProfile);
        const leadDeficit = targetLeadLevel - (lead.level || 0);
        if (!seriousBattle && leadDeficit < 8) return false;

        const teamMaxLevel = Math.max(0, ...alive.map(p => p.level || 0));
        const candidates = alive
            .filter(p => p.index !== lead.index && (p.level || 0) >= (lead.level || 0) + 6)
            .filter(p => (p.level || 0) >= targetLeadLevel - 3 || (p.level || 0) >= teamMaxLevel - 3)
            .map(p => ({
                unit: p,
                score: (p.level || 0) * 45 +
                       getPokemonCarryScore(p) +
                       (p.heldItem ? 80 : 0) +
                       (opponentProfile ? scoreLeadCandidate(p, opponentProfile) / 4 : 0)
            }))
            .sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (!best) return false;

        log('info', '🎯', `Lead under target (${lead.name} Lv${lead.level || 0}/${targetLeadLevel}). Moving [${best.unit.name}] Lv${best.unit.level || 0} to lead for ${reason || 'battle prep'}.`);
        recordRunEvent('lead-level-correction', {
            from: { name: lead.name, level: lead.level || 0 },
            to: { name: best.unit.name, level: best.unit.level || 0 },
            targetLeadLevel,
            reason,
            opponent: compactOpponentProfile(opponentProfile)
        });
        return tryTeamReorder(best.unit.element, lead.element, best.unit, lead, 'lead-level-correction');
    }

    function scoreItemForTeam(itemName, team, bossType = null) {
        itemName = normalizeItemName(itemName);
        const alive = team.filter(p => !p.isFainted);
        const targetTypes = getOpponentTeamTypes(bossType);
        if (alive.length === 0) return getTierScore(itemName);

        if (!USABLE_ITEMS.has(itemName) && isLowValueHeldItem(itemName)) {
            return -140 + getTierScore(itemName);
        }

        if (itemName === 'sacred ash') {
            const faintedCount = team.filter(p => p.isFainted).length;
            return faintedCount > 0 ? 140 + faintedCount * 45 : 35;
        }
        if (itemName === 'rare candy') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            return 88 +
                Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 4 +
                (sinnohTraining.active ? CONFIG.SINNOH_TM_ITEM_BONUS + 220 : 0);
        }
        if (itemName === 'moon stone') {
            return 50 + Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 6;
        }
        if (itemName === 'tm normal') {
            const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);
            if (sinnohTraining.active && !sinnohTraining.needsTm) return 18;
            return 72 +
                Math.max(...alive.map(p => scoreConsumableTarget(p, itemName))) / 5 +
                (sinnohTraining.active && sinnohTraining.needsTm ? CONFIG.SINNOH_TM_ITEM_BONUS : 0);
        }

        let score = getTierScore(itemName);
        const bestTargetScore = Math.max(...alive.map(p => scoreHeldItemForPokemon(p, itemName, bossType)));
        score += bestTargetScore;

        const matchingType = getItemBoostType(itemName);
        if (matchingType) {
            if (alive.some(p => hasMatchingAttackForItem(p, itemName))) {
                score += 35;
            } else {
                score -= 180;
            }
        }

        if (itemName === 'expert belt' && targetTypes.length > 0 && alive.some(p => getAttackCoverageScore(getUnitAttackTypes(p), targetTypes) > 0)) {
            score += 45;
        }
        if (itemName === 'lucky egg' && alive.some(p => p.index === 0 && p.hp > 40)) {
            score += 25;
        }

        return score;
    }

    function pickBestBagItemForTeam(items, team, bossType = null) {
        let best = null;
        let bestScore = -999;
        items.forEach(item => {
            const score = scoreItemForTeam(item.name, team, bossType);
            if (score > bestScore) {
                best = item;
                bestScore = score;
            }
        });
        return best;
    }

    function getMapDecisionFingerprint(team, nodes, bossType = null) {
        const teamSnapshot = team.map(p => {
            const attacks = getUnitAttackTypes(p).join(',');
            return `${p.name}:${p.hp}:${p.level || 0}:${p.heldItem || '-'}:${p.types.join(',')}:${attacks}`;
        }).join('|');
        const nodeSnapshot = Array.from(nodes).map(node => {
            const img = node.querySelector('image');
            const src = img ? (img.getAttribute('href') || img.getAttribute('xlink:href') || '') : '';
            return `${node.getAttribute('transform') || ''}:${src}:${node.getAttribute('class') || ''}`;
        }).join('|');
        const opponentSnapshot = getOpponentProfileLabel(bossType);
        return `${opponentSnapshot || '-'}::${teamSnapshot}::${nodeSnapshot}`;
    }

    function detectTypesInText(text) {
        const folded = foldText(text);
        const found = new Set();
        Object.entries(PASSIVE_TYPE_TERMS).forEach(([term, type]) => {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`);
            if (pattern.test(folded)) found.add(type);
        });
        return [...found];
    }

    function safeJsonParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (e) {
            log('warn', '📊', `Run history JSON parse failed: ${e.message}`);
            return fallback;
        }
    }

    function getRunHistory() {
        try {
            return safeJsonParse(localStorage.getItem(CONFIG.RUN_HISTORY_STORAGE_KEY), []);
        } catch (e) {
            log('warn', '📊', `Cannot read run history: ${e.message}`);
            return [];
        }
    }

    function saveRunHistory(history) {
        try {
            const capped = history.slice(-CONFIG.RUN_HISTORY_MAX_ENTRIES);
            localStorage.setItem(CONFIG.RUN_HISTORY_STORAGE_KEY, JSON.stringify(capped));
            return capped;
        } catch (e) {
            log('warn', '📊', `Cannot save run history: ${e.message}`);
            return history;
        }
    }

    function getRunStatsDelta(record) {
        const start = record?.startStats || {};
        return {
            loops: Math.max(0, (engineStats.loops || 0) - (start.loops || 0)),
            catches: Math.max(0, (engineStats.catches || 0) - (start.catches || 0)),
            items: Math.max(0, (engineStats.items || 0) - (start.items || 0)),
            swaps: Math.max(0, (engineStats.swaps || 0) - (start.swaps || 0)),
            rerolls: Math.max(0, (engineStats.rerolls || 0) - (start.rerolls || 0)),
        };
    }

    function getProgressLabels() {
        const labels = [
            document.getElementById('stage-title')?.innerText || '',
            document.getElementById('map-title')?.innerText || '',
            document.getElementById('region-title')?.innerText || '',
            document.getElementById('map-info')?.innerText || '',
            document.querySelector('.stage-title, .map-title, .region-title')?.innerText || '',
            document.getElementById('gameover-stats')?.innerText || '',
        ].map(text => (text || '').replace(/\s+/g, ' ').trim()).filter(Boolean);

        return [...new Set(labels)];
    }

    function parseTeamFromCardScope(scope) {
        if (!scope) return [];
        return Array.from(scope.querySelectorAll('.poke-card')).map((card, index) => {
            const info = learnPokemonInfoFromCard(card, 'telemetry-card') || parsePokemonInfoFromCard(card, 'telemetry-card');
            if (!info || !info.name) return null;
            return {
                index,
                name: info.name,
                level: info.level || 0,
                hp: info.hp ? info.hp.percent : 100,
                isFainted: info.hp ? info.hp.percent === 0 : false,
                types: info.types || getKnownPokemonTypes(info.name),
                attackTypes: info.attackTypes || [],
                baseStats: getPokemonBaseStats(info.name),
                currentStats: info.currentStats || null,
                heldItem: getHeldItem(card),
                isShiny: card.classList.contains('shiny') || card.querySelector('[class*="shiny"]') !== null,
            };
        }).filter(Boolean);
    }

    function getTelemetryTeamUnits() {
        const team = parseTeamStatus();
        if (team.length > 0) return team;

        const gameOverTeam = parseTeamFromCardScope(document.getElementById('gameover-team'));
        if (gameOverTeam.length > 0) return gameOverTeam;

        const activeCards = parseTeamFromCardScope(document.querySelector('.screen.active'));
        return activeCards;
    }

    function compactOpponentProfile(profile) {
        if (!profile) return null;
        return {
            name: profile.name || 'unknown',
            leadTypes: getOpponentLeadTypes(profile),
            teamTypes: getOpponentTeamTypes(profile),
            sourceConfidence: profile.sourceConfidence || 'unknown',
            team: (profile.team || []).slice(0, 6).map(mon => ({
                name: mon.name || 'unknown',
                types: normalizeTypeList(mon.types || [])
            }))
        };
    }

    function compactTeamSnapshot(team = getTelemetryTeamUnits(), opponent = null) {
        return (team || []).map((p, slot) => {
            const heldItem = p.heldItem || null;
            const itemBoostType = heldItem ? getItemBoostType(heldItem) : null;
            return {
                slot,
                name: p.name,
                level: p.level || 0,
                hp: p.hp || 0,
                fainted: Boolean(p.isFainted),
                types: normalizeTypeList(p.types || []),
                attacks: getUnitAttackTypes(p),
                primaryAttack: getUnitPrimaryAttackType(p),
                isMainCarry: isMainCarryUnit(p),
                offenseRole: getOffenseRole(p),
                item: heldItem,
                itemBoostType,
                itemMatchesPrimary: itemBoostType ? hasMatchingAttackForItem(p, heldItem) : null,
                healingItem: heldItem ? isHealingItem(heldItem) : false,
                carry: Number(getPokemonCarryScore(p).toFixed(1)),
                heldScore: heldItem ? Number(scoreHeldItemForPokemon(p, heldItem, opponent).toFixed(1)) : null,
            };
        });
    }

    function getRunProgressSnapshot(reason = 'snapshot') {
        const teamUnits = getTelemetryTeamUnits();
        const opponentProfile = detectNextOpponentProfile();
        const alive = teamUnits.filter(p => !p.isFainted);
        const avgHP = alive.length > 0 ? alive.reduce((sum, p) => sum + (p.hp || 0), 0) / alive.length : 0;
        const avgLevel = getTeamAverageLevel(teamUnits);
        const bossPrep = getBossPrepStatus(teamUnits, opponentProfile);
        const itemHolders = teamUnits.filter(p => !p.isFainted && p.heldItem);
        const primaryCarry = getPrimaryCarry(teamUnits);
        const traitCounts = getTeamTraitCounts(teamUnits);

        return {
            at: new Date().toISOString(),
            reason,
            screen: getActiveScreen(),
            labels: getProgressLabels(),
            mapKey: currentMapKey || getCurrentMapKey(),
            capturesThisMap,
            teamSize: teamUnits.length,
            aliveCount: alive.length,
            avgHP: Number(avgHP.toFixed(1)),
            avgLevel: Number(avgLevel.toFixed(1)),
            leadLevel: getLeadLevel(teamUnits),
            opponent: compactOpponentProfile(opponentProfile),
            bossPrep,
            itemSummary: {
                heldCount: itemHolders.length,
                leadHasItem: Boolean(teamUnits[0]?.heldItem),
                holders: itemHolders.map(p => ({
                    slot: p.index,
                    name: p.name,
                    item: p.heldItem
                }))
            },
            carrySummary: primaryCarry ? {
                slot: primaryCarry.index,
                name: primaryCarry.name,
                isLead: primaryCarry.index === 0,
                level: primaryCarry.level || 0,
                hp: primaryCarry.hp || 0,
                item: primaryCarry.heldItem || null,
                hasHealingItem: primaryCarry.heldItem ? isHealingItem(primaryCarry.heldItem) : false,
                offenseRole: getOffenseRole(primaryCarry),
                grassCount: traitCounts.Grass || 0
            } : null,
            stats: getRunStatsDelta(currentRunTelemetry),
            team: compactTeamSnapshot(teamUnits, opponentProfile),
        };
    }

    function makeRunTelemetry(reason = 'auto') {
        const now = new Date();
        return {
            id: `run-${now.toISOString()}-${Math.floor(Math.random() * 10000)}`,
            startedAt: now.toISOString(),
            startReason: reason,
            startStats: { ...engineStats },
            events: [],
            screens: {},
            best: {
                mapSteps: 0,
                battles: 0,
                teamSize: 0,
                avgLevel: 0,
                leadLevel: 0,
                catches: 0,
                items: 0,
            },
            lastSnapshot: null,
            final: null
        };
    }

    function ensureRunTelemetry(reason = 'auto') {
        if (!currentRunTelemetry || currentRunTelemetry.final) {
            currentRunTelemetry = makeRunTelemetry(reason);
            recordRunEvent('run-start', { reason });
        }
        return currentRunTelemetry;
    }

    function recordRunEvent(type, details = {}) {
        if (!currentRunTelemetry || currentRunTelemetry.final) return null;
        const event = {
            at: new Date().toISOString(),
            loop: engineStats.loops,
            screen: getActiveScreen(),
            type,
            details
        };

        currentRunTelemetry.events.push(event);
        if (currentRunTelemetry.events.length > CONFIG.RUN_EVENT_LOG_MAX_ENTRIES) {
            currentRunTelemetry.events = currentRunTelemetry.events.slice(-CONFIG.RUN_EVENT_LOG_MAX_ENTRIES);
        }

        return event;
    }

    function getRunBattleCount(record = currentRunTelemetry) {
        const events = record?.events || [];
        const explicitBattles = events.filter(event => event.type === 'fight-start' || event.type === 'battle-auto').length;
        const battleScreens = events.filter(event => event.type === 'screen-enter' && event.details?.screen === 'battle-screen').length;
        return Math.max(explicitBattles, battleScreens);
    }

    function updateRunProgress(reason = 'loop') {
        const record = ensureRunTelemetry(reason);
        const snapshot = getRunProgressSnapshot(reason);
        record.lastSnapshot = snapshot;
        record.screens[snapshot.screen] = (record.screens[snapshot.screen] || 0) + 1;

        const stats = snapshot.stats || {};
        record.best.mapSteps = Math.max(record.best.mapSteps, record.events.filter(event => event.type === 'map-choice').length);
        record.best.battles = Math.max(record.best.battles, getRunBattleCount(record));
        record.best.teamSize = Math.max(record.best.teamSize, snapshot.teamSize || 0);
        record.best.avgLevel = Math.max(record.best.avgLevel, snapshot.avgLevel || 0);
        record.best.leadLevel = Math.max(record.best.leadLevel, snapshot.leadLevel || 0);
        record.best.catches = Math.max(record.best.catches, stats.catches || 0);
        record.best.items = Math.max(record.best.items, stats.items || 0);
        return snapshot;
    }

    function inferLossCause(snapshot, result = 'gameover') {
        const team = snapshot?.team || [];
        const alive = team.filter(p => !p.fainted);
        const lead = team[0] || null;
        const tags = [];
        const labelText = foldText((snapshot?.labels || []).join(' '));
        const rewardMatch = labelText.match(/\+(\d+)/);
        const reward = rewardMatch ? Number.parseInt(rewardMatch[1], 10) : 0;
        const isFinalBoss = Boolean(labelText.match(/stage final boss|final boss|champion|campeon/) || reward >= 400);
        const isBigBoss = isFinalBoss || labelText.includes('big boss');
        const opponentConfidence = snapshot?.opponent?.sourceConfidence || '';
        const isBossLike = isFinalBoss ||
                           isBigBoss ||
                           ['boss-team-db', 'boss-type-map', 'detected-types', 'elite-prep-types'].includes(opponentConfidence) ||
                           Boolean(labelText.match(/boss|map 2\/2/));
        const bossTeamTarget = isFinalBoss ? CONFIG.TEAM_TARGET_SIZE : (isBigBoss ? 4 : (isBossLike ? 3 : CONFIG.EARLY_CORE_TEAM_SIZE));
        const snapshotTargets = snapshot?.bossPrep?.targets || null;
        const bossAvgLevelTarget = snapshotTargets?.avgLevel ||
                                    (isFinalBoss ? CONFIG.R3_BIG_BOSS_MIN_AVG_LEVEL :
                                    (isBigBoss ? CONFIG.EARLY_BIG_BOSS_MIN_AVG_LEVEL :
                                    (labelText.includes('map 2/2') ? CONFIG.EARLY_MAP2_MIN_AVG_LEVEL : 0)));
        const bossLeadLevelTarget = snapshotTargets?.leadLevel ||
                                     (isFinalBoss ? CONFIG.R3_BIG_BOSS_MIN_LEAD_LEVEL :
                                     (isBigBoss ? CONFIG.EARLY_BIG_BOSS_MIN_LEAD_LEVEL :
                                     (labelText.includes('map 2/2') ? CONFIG.EARLY_MAP2_MIN_LEAD_LEVEL : 0)));

        if (result === 'gameover') tags.push('gameover');
        if (team.length === 0) tags.push('no-team-snapshot');
        if (team.length > 0 && alive.length === 0) tags.push('team-wipe');
        if (team.length > 0 && team.length < CONFIG.EARLY_CORE_TEAM_SIZE) tags.push('too-few-pokemon');
        if (isBossLike && team.length > 0 && team.length < bossTeamTarget) tags.push(isFinalBoss ? 'thin-team-for-final-boss' : (isBigBoss ? 'thin-team-for-big-boss' : 'thin-team-for-boss'));
        if ((snapshot?.avgLevel || 0) > 0 && snapshot.avgLevel < CONFIG.EARLY_BOSS_MIN_AVG_LEVEL) tags.push('underleveled-team');
        if ((snapshot?.leadLevel || 0) > 0 && snapshot.leadLevel < CONFIG.EARLY_BOSS_MIN_LEAD_LEVEL) tags.push('underleveled-lead');
        if (isBossLike && bossAvgLevelTarget && (snapshot?.avgLevel || 0) > 0 && snapshot.avgLevel < bossAvgLevelTarget) tags.push('boss-underleveled-team');
        if (isBossLike && bossLeadLevelTarget && (snapshot?.leadLevel || 0) > 0 && snapshot.leadLevel < bossLeadLevelTarget) tags.push('boss-underleveled-lead');
        if (lead && !lead.item) tags.push('lead-no-item');
        if (team.some(p => p.itemBoostType && p.itemMatchesPrimary === false)) tags.push('item-mismatch');
        if ((snapshot?.avgHP || 0) > 0 && snapshot.avgHP < CONFIG.LOW_HP_THRESHOLD) tags.push('low-hp-before-loss');

        let matchupScore = null;
        if (snapshot?.opponent && lead) {
            const pseudoLead = {
                name: lead.name,
                types: lead.types,
                attackTypes: lead.attacks,
                hp: Math.max(lead.hp || 0, 1),
                level: lead.level,
                isFainted: false,
                heldItem: lead.item || null
            };
            matchupScore = scoreLeadCandidate(pseudoLead, snapshot.opponent, { ignoreHeldItem: true });
            if (matchupScore < 0) tags.push('bad-lead-matchup');
        }

        let summary = 'unknown';
        if (tags.includes('team-wipe')) summary = 'team wiped';
        if (tags.includes('thin-team-for-final-boss')) summary = summary === 'unknown' ? 'thin team for final boss' : `${summary}; thin team`;
        if (tags.includes('thin-team-for-big-boss')) summary = summary === 'unknown' ? 'thin team for big boss' : `${summary}; thin team`;
        if (tags.includes('thin-team-for-boss')) summary = summary === 'unknown' ? 'thin team for boss' : `${summary}; thin team`;
        if (tags.includes('boss-underleveled-team')) summary = summary === 'unknown' ? 'underleveled for boss' : `${summary}; boss underleveled`;
        if (tags.includes('underleveled-team')) summary = summary === 'unknown' ? 'underleveled team' : `${summary}; underleveled`;
        if (tags.includes('bad-lead-matchup')) summary = summary === 'unknown' ? 'bad lead matchup' : `${summary}; bad matchup`;
        if (tags.includes('lead-no-item')) summary = summary === 'unknown' ? 'lead had no item' : `${summary}; lead no item`;
        if (tags.includes('item-mismatch')) summary = summary === 'unknown' ? 'item mismatch' : `${summary}; item mismatch`;
        if (tags.includes('too-few-pokemon')) summary = summary === 'unknown' ? 'too few pokemon' : `${summary}; too few pokemon`;
        if (summary === 'unknown' && result === 'gameover') summary = 'lost battle';

        return {
            summary,
            tags,
            matchupScore: matchupScore === null ? null : Number(matchupScore.toFixed(1)),
            opponent: snapshot?.opponent || null,
            targets: isBossLike ? {
                teamSize: bossTeamTarget,
                avgLevel: bossAvgLevelTarget || null,
                leadLevel: bossLeadLevelTarget || null
            } : null
        };
    }

    function finalizeRunTelemetry(result = 'gameover', details = {}) {
        const now = Date.now();
        if (!currentRunTelemetry && now - lastRunFinalizedAt < 10000) return null;
        if (currentRunTelemetry?.final && now - lastRunFinalizedAt < 2500) return currentRunTelemetry;

        const record = ensureRunTelemetry(`finalize-${result}`);
        const snapshot = getRunProgressSnapshot(result);
        if (!snapshot.opponent) {
            const lastOpponentEvent = [...record.events]
                .reverse()
                .find(event => event.details?.opponent || event.details?.nextOpponent);
            snapshot.opponent = lastOpponentEvent?.details?.opponent || lastOpponentEvent?.details?.nextOpponent || null;
        }
        const finalStats = getRunStatsDelta(record);
        record.best.battles = Math.max(record.best.battles, getRunBattleCount(record));
        const loss = result === 'gameover' ? inferLossCause(snapshot, result) : null;

        record.endedAt = new Date().toISOString();
        record.durationMs = new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime();
        record.lastSnapshot = snapshot;
        record.final = {
            result,
            reason: loss ? loss.summary : result,
            loss,
            stats: finalStats,
            best: record.best,
            details
        };
        record.events.push({
            at: record.endedAt,
            loop: engineStats.loops,
            screen: getActiveScreen(),
            type: 'run-final',
            details: record.final
        });

        const history = getRunHistory();
        saveRunHistory([...history, record]);
        lastRunFinalizedAt = now;

        log('info', '📊', `Run recorded: ${record.final.reason} | mapSteps=${record.best.mapSteps} battles=${record.best.battles} avgLv=${record.best.avgLevel.toFixed(1)} catches=${finalStats.catches} items=${finalStats.items}`);
        currentRunTelemetry = null;
        return record;
    }

    function exposeRunHistoryHelpers() {
        if (typeof window === 'undefined') return;
        window.Engine7RunHistory = {
            current: () => currentRunTelemetry,
            all: () => getRunHistory(),
            latest: () => getRunHistory().slice(-1)[0] || null,
            summary: () => getRunHistory().map(run => ({
                id: run.id,
                startedAt: run.startedAt,
                result: run.final?.result || 'open',
                reason: run.final?.reason || '',
                mapSteps: run.best?.mapSteps || 0,
                battles: run.best?.battles || 0,
                avgLevel: run.best?.avgLevel || 0,
                leadLevel: run.best?.leadLevel || 0,
                finalTeamSize: run.lastSnapshot?.teamSize || 0,
                finalAvgLevel: run.lastSnapshot?.avgLevel || 0,
                finalLeadLevel: run.lastSnapshot?.leadLevel || 0,
                finalAvgHP: run.lastSnapshot?.avgHP || 0,
                bossPrepReady: run.lastSnapshot?.bossPrep?.ready ?? null,
                bossPrepReason: run.lastSnapshot?.bossPrep?.targets?.reason || '',
                bossAvgDeficit: run.lastSnapshot?.bossPrep?.avgDeficit ?? null,
                bossLeadDeficit: run.lastSnapshot?.bossPrep?.leadDeficit ?? null,
                heldItemCount: run.lastSnapshot?.itemSummary?.heldCount ?? null,
                leadHasItem: run.lastSnapshot?.itemSummary?.leadHasItem ?? null,
                leadName: run.lastSnapshot?.team?.[0]?.name || '',
                carryName: run.lastSnapshot?.carrySummary?.name || '',
                carryIsLead: run.lastSnapshot?.carrySummary?.isLead ?? null,
                carryHasHealingItem: run.lastSnapshot?.carrySummary?.hasHealingItem ?? null,
                grassCount: run.lastSnapshot?.carrySummary?.grassCount ?? null,
                legendaryNodes: (run.events || []).filter(event => event.type === 'map-choice' && event.details?.nodeType === 'legendary').length,
                legendaryCatches: (run.events || []).filter(event => event.type === 'catch-decision' && event.details?.isLegendary).length,
                unknownNodes: (run.events || []).filter(event => event.type === 'map-choice' && event.details?.nodeType === 'unknown').length,
                catches: run.final?.stats?.catches || 0,
                items: run.final?.stats?.items || 0,
                labels: run.lastSnapshot?.labels || [],
                opponent: run.final?.loss?.opponent?.name || run.lastSnapshot?.opponent?.name || '',
            })),
            clear: () => {
                localStorage.removeItem(CONFIG.RUN_HISTORY_STORAGE_KEY);
                return [];
            },
            exportText: () => JSON.stringify(getRunHistory(), null, 2),
        };
    }

    function isShinyPassiveCard(card, text = '') {
        const className = typeof card.className === 'string' ? card.className : (card.getAttribute('class') || '');
        const classText = foldText(className);
        return Boolean(
            classText.match(/shiny|variocolor|brillante/) ||
            text.match(/shiny|variocolor|brillante|sparkle|destell/) ||
            card.querySelector('.shiny, .shiny-star, [class*="shiny"], [data-shiny="true"]')
        );
    }

    function getPassiveTeamProfile(team, opponentProfile = null) {
        const alive = getAliveTeam(team || []);
        const primary = getPrimaryCarry(team);
        const shinyUnits = alive.filter(p => p.isShiny);
        const bestBst = Math.max(0, ...alive.map(p => getPokemonBaseStatTotal(getPokemonBaseStats(p.name))));
        const primaryBst = primary ? getPokemonBaseStatTotal(getPokemonBaseStats(primary.name)) : 0;
        const hasLegendary = alive.some(p => isLegendaryPokemonName(p.name));
        const hasMainCarry = alive.some(p => isMainCarryUnit(p));
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const teamAttackTypes = normalizeTypeList(alive.flatMap(p => getUnitAttackTypes(p)));
        const uncoveredBossTypes = bossTypes.filter(type => getAttackCoverageScore(teamAttackTypes, [type]) <= 0);
        const bossAttackScore = bossTypes.length > 0 ? getAttackCoverageScore(teamAttackTypes, bossTypes) : 0;
        const prepStatus = getBossPrepStatus(team, opponentProfile);
        const weakCore = alive.length > 0 &&
                         !hasLegendary &&
                         !hasMainCarry &&
                         (!bestBst || bestBst < CONFIG.PASSIVE_WEAK_CORE_BST_THRESHOLD);

        return {
            alive,
            primary,
            primaryBst,
            bestBst,
            hasLegendary,
            hasMainCarry,
            hasShiny: shinyUnits.length > 0,
            hasStrongCarry: hasLegendary || hasMainCarry || primaryBst >= CONFIG.LEGENDARY_CATCH_MIN_BST,
            weakCore,
            underleveled: shouldPrioritizeEarlyTraining(team, opponentProfile) || (prepStatus.avgDeficit + prepStatus.leadDeficit) > 0,
            shinyTypes: normalizeTypeList(shinyUnits.flatMap(p => p.types || [])),
            primaryTypes: normalizeTypeList([...(primary?.types || []), ...getUnitAttackTypes(primary)]),
            teamAttackTypes,
            bossTypes,
            uncoveredBossTypes,
            bossCoveragePoor: bossTypes.length > 0 && (uncoveredBossTypes.length > 0 || bossAttackScore < bossTypes.length * 2.5),
            prepStatus
        };
    }

    function scorePassiveTypeContext(passiveTypes, team, traitCounts, profile) {
        let score = 0;
        const alive = profile.alive || [];

        passiveTypes.forEach(type => {
            const typeUsers = alive.filter(p => {
                const unitTypes = normalizeTypeList(p.types || []);
                const attackTypes = getUnitAttackTypes(p);
                return unitTypes.includes(type) || attackTypes.includes(type);
            });
            const hasTeamUser = typeUsers.length > 0 || (traitCounts[type] || 0) > 0;
            const typeBossScore = profile.bossTypes.length > 0 ? getAttackCoverageScore([type], profile.bossTypes) : 0;
            const coversUncoveredBossType = profile.uncoveredBossTypes.some(bossType => getAttackCoverageScore([type], [bossType]) > 0);

            if (profile.shinyTypes.includes(type)) {
                score += CONFIG.PASSIVE_SHINY_TYPE_BONUS + (traitCounts[type] || 0) * 3;
            }
            if (profile.primaryTypes.includes(type) && profile.hasStrongCarry) {
                score += CONFIG.PASSIVE_STRONG_CARRY_TYPE_BONUS;
            }
            if (typeBossScore > 0) {
                score += Math.min(42, CONFIG.PASSIVE_BOSS_COUNTER_BONUS + typeBossScore * 5);
                if (coversUncoveredBossType) score += CONFIG.PASSIVE_UNCOVERED_BOSS_TYPE_BONUS;
                if (!hasTeamUser) score -= CONFIG.PASSIVE_OFF_TEAM_TYPE_PENALTY;
            } else if (!hasTeamUser) {
                score -= CONFIG.PASSIVE_OFF_TEAM_TYPE_PENALTY;
            }

            if (profile.weakCore && hasTeamUser && typeBossScore > 0) {
                score += 10;
            }
        });

        return score;
    }

    function scorePassiveCard(card, team, opponentProfile = null) {
        const nameEl = card.querySelector('.item-name, .passive-name, [class*="name"]');
        const descEl = card.querySelector('.item-desc, .passive-desc, [class*="desc"]');
        const text = foldText(`${nameEl ? nameEl.innerText : ''} ${descEl ? descEl.innerText : ''} ${card.innerText || ''}`);
        const traitCounts = getTeamTraitCounts(team);
        const avgHP = getTeamAverageHP(team);
        const carry = getPrimaryCarry(team);
        const profile = getPassiveTeamProfile(team, opponentProfile);
        const passiveTypes = detectTypesInText(text);
        const isShinyPassive = isShinyPassiveCard(card, text);
        const isSustain = Boolean(text.match(/heal|restore|drain|lifesteal|cur|recuper|dren/));
        const isSurvival = Boolean(text.match(/survive|sturdy|revive|faint|ko|resist|defen|shield|escudo/));
        const isDamage = Boolean(text.match(/damage|dano|power|move|ataque|golpe|boost|aument/));
        const isSpeed = Boolean(text.match(/speed|first|lead|priority|velocidad|primero/));
        const isScaling = Boolean(text.match(/level|lvl|xp|experiencia|nivel|evol|growth|crec/));
        const isMultiHit = Boolean(text.match(/extra attack|double|twice|ataque extra|doble/));
        let score = 35;

        if (isShinyPassive) score += CONFIG.PASSIVE_SHINY_CARD_BONUS + (profile.hasShiny ? 18 : 0);
        if (profile.hasShiny && text.match(/shiny|variocolor|brillante/)) score += 22;

        if (isSustain) score += avgHP < 70 ? 38 : 22;
        if (text.match(/crit|critical|critico/)) score += 18 + (traitCounts.Dark || 0) * 8;
        if (isSurvival) score += 26;
        if (isDamage) score += 18;
        if (isSpeed) score += 14;
        if (isScaling) score += 18 + (traitCounts.Bug || 0) * 7;
        if (text.match(/distinct|different|cada tipo|tipos distintos/)) score += getTeamTypes(team).length * 7;
        if (isMultiHit) score += 18 + (traitCounts.Electric || 0) * 7;
        if (text.match(/execute|remata|ejecut/)) score += 16 + (traitCounts.Ghost || 0) * 8;
        if (carry && isSustain) score += 18;
        if (carry && passiveTypes.includes('Grass')) score += 18 + (traitCounts.Grass || 0) * 6;
        score += scoreSinnohPassiveCardPurpose({
            passiveTypes,
            text,
            team,
            isShinyPassive,
            isSpeed,
            isSurvival,
            isDamage
        });

        if (profile.weakCore) {
            if (isScaling) score += CONFIG.PASSIVE_WEAK_CORE_SCALING_BONUS;
            if (isSustain || isSurvival) score += CONFIG.PASSIVE_WEAK_CORE_SURVIVAL_BONUS;
            if (isDamage || isMultiHit || text.match(/crit|critical|critico/)) score += 12;
            if (passiveTypes.length === 0 && profile.bossCoveragePoor && (isDamage || isSustain || isSurvival || isScaling)) score += 10;
        } else if (profile.hasStrongCarry) {
            if (isSustain || isSpeed || isDamage || isMultiHit) score += 8;
        }

        if (profile.underleveled && isScaling) score += 16;
        if (profile.bossCoveragePoor && (isSurvival || isSustain)) score += 8;

        passiveTypes.forEach(type => {
            const count = traitCounts[type] || 0;
            const traitInfo = TRAIT_DATA[type];
            const tierValue = traitInfo ? (TRAIT_TIER_VALUE[traitInfo.tier] || 1) : 1;
            score += count > 0 ? count * 12 + tierValue : -6;
        });
        score += scorePassiveTypeContext(passiveTypes, team, traitCounts, profile);

        return score;
    }

    function parseCardStats(card) {
        const stats = {};
        card.querySelectorAll('.stat-row[data-tooltip], [data-tooltip]').forEach(row => {
            const tooltip = row.getAttribute('data-tooltip') || '';
            const match = tooltip.match(/(hp|atk|attack|def|defense|spa|sp\.?\s*atk|special attack|special|spd|sp\.?\s*def|special defense|spe|speed)\s*:\s*(\d+)/i);
            if (!match) return;
            const key = foldText(match[1]).replace(/\./g, '').replace(/\s+/g, '');
            const value = Number.parseInt(match[2], 10);
            if (key === 'hp') stats.hp = value;
            else if (key === 'atk' || key === 'attack') stats.atk = value;
            else if (key === 'def' || key === 'defense') stats.def = value;
            else if (key === 'spa' || key === 'spatk' || key === 'specialattack' || key === 'special') stats.spa = value;
            else if (key === 'spd' || key === 'spdef' || key === 'specialdefense') stats.spd = value;
            else if (key === 'spe' || key === 'speed') stats.spe = value;
        });
        return stats;
    }

    function scorePokemonStatsFromCard(card) {
        return scorePokemonStats(parseCardStats(card));
    }

    function scorePokemonStats(stats) {
        if (!stats || Object.keys(stats).length === 0) return 0;
        const offense = Math.max(stats.atk || 0, stats.special || 0, stats.spa || 0, stats.spatk || 0);
        const speed = stats.speed || stats.spe || 0;
        const bulk = (stats.hp || 0) + (stats.def || 0) + (stats.spdef || 0) + (stats.spd || 0);
        return (offense * 0.35 + speed * 0.25 + bulk * 0.12) / 3;
    }

    function scoreTraitPreviewFromCard(card) {
        let score = 0;
        const rows = card.querySelectorAll('.trait-preview-row, [class*="trait-preview"], [class*="trait"]');
        rows.forEach(row => {
            const text = foldText(row.innerText || '');
            if (!text) return;
            if (row.className.toString().includes('up') || text.includes('new') || text.includes('nuevo')) score += 12;
            const countMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
            if (countMatch) {
                const current = Number.parseInt(countMatch[1], 10);
                const needed = Number.parseInt(countMatch[2], 10);
                const missing = needed - current;
                if (missing <= 0) score += 18;
                else if (missing === 1) score += 9;
            }
            detectTypesInText(text).forEach(type => {
                const traitInfo = TRAIT_DATA[type];
                score += traitInfo ? (TRAIT_TIER_VALUE[traitInfo.tier] || 1) * 0.8 : 1;
            });
        });
        return score;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║          🧠 AI: TYPE ADVANTAGE SCORING                      ║
    // ╚══════════════════════════════════════════════════════════════╝

    function normalizeTypeList(types) {
        const list = Array.isArray(types) ? types : (types ? [types] : []);
        return [...new Set(list.filter(type => TYPES.includes(type)))];
    }

    function getUnitAttackTypes(unit) {
        if (!unit) return [];
        const visibleAttackTypes = normalizeTypeList(unit.attackTypes || []);
        if (visibleAttackTypes.length > 0) return visibleAttackTypes;
        const cachedInfo = getCachedPokemonInfo(unit.name);
        if (cachedInfo?.attackTypes && cachedInfo.attackTypes.length > 0) return cachedInfo.attackTypes;
        const likelyTypes = getLikelyAttackTypes(unit);
        return likelyTypes.length > 0 ? likelyTypes : normalizeTypeList(unit.types || []);
    }

    function getAttackTypeScoreAgainstDefenders(attackType, defenderTypes) {
        const chart = TYPE_CHART[attackType];
        if (!chart) return 0;

        let score = 0;
        normalizeTypeList(defenderTypes).forEach(defType => {
            if (chart.immune.includes(defType)) score -= 12;
            if (chart.strong.includes(defType)) score += 5;
            if (chart.weak.includes(defType)) score -= 3;
        });
        return score;
    }

    function getAttackCoverageScore(attackerTypes, defenderTypes) {
        const attacks = normalizeTypeList(attackerTypes);
        const defenders = normalizeTypeList(defenderTypes);
        if (attacks.length === 0 || defenders.length === 0) return 0;
        return Math.max(...attacks.map(attackType => getAttackTypeScoreAgainstDefenders(attackType, defenders)));
    }

    function getDefensiveScoreAgainstAttack(defenderTypes, attackType) {
        const chart = TYPE_CHART[attackType];
        if (!chart) return 0;

        let score = 0;
        normalizeTypeList(defenderTypes).forEach(defType => {
            if (chart.immune.includes(defType)) score += 8;
            else {
                if (chart.strong.includes(defType)) score -= 4;
                if (chart.weak.includes(defType)) score += 2;
            }
        });
        return score;
    }

    function getDefensiveMatchupScore(defenderTypes, attackerTypes) {
        const attacks = normalizeTypeList(attackerTypes);
        if (attacks.length === 0) return 0;
        return Math.min(...attacks.map(attackType => getDefensiveScoreAgainstAttack(defenderTypes, attackType)));
    }

    function getTypeAdvantageScore(attackerTypes, defenderType) {
        return getAttackCoverageScore(attackerTypes, defenderType);
    }

    function getDefensiveScore(pokemonTypes, attackerType) {
        return getDefensiveScoreAgainstAttack(pokemonTypes, attackerType);
    }

    function getTrainerMatchupScore(trainerSrc, team) {
        const srcLower = trainerSrc.toLowerCase();
        let estimatedTypes = [];

        // Buscar correspondencia en TRAINER_TYPE_ESTIMATION
        for (const [key, types] of Object.entries(TRAINER_TYPE_ESTIMATION)) {
            if (srcLower.includes(key)) {
                estimatedTypes = types;
                break;
            }
        }

        if (estimatedTypes.length === 0) return 0; // No se pudo estimar el tipo

        const lead = team.find(p => !p.isFainted);
        if (!lead) return 0;

        // Best available attack type into the estimated enemy type(s).
        const offScore = getAttackCoverageScore(getUnitAttackTypes(lead), estimatedTypes);
        // Worst likely incoming attack type against our dual defensive typing.
        const defScore = getDefensiveMatchupScore(lead.types, estimatedTypes);
        const matchupBonus = (offScore * 40) + (defScore * 30);

        log('debug', '⚔️', `Trainer matchup vs [${estimatedTypes.join('/')}] calculated. Leader: [${lead.name}] | Bonus: ${matchupBonus}`);
        return matchupBonus;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║      🎯 AI: COUNTER-PICK OPTIMIZER (Team Reorder)           ║
    // ╚══════════════════════════════════════════════════════════════╝

    function detectBossTypes() {
        const detected = new Set();
        const mapInfo = document.getElementById('map-info');
        if (mapInfo) {
            const text = mapInfo.innerText.toLowerCase();

            for (const [boss, data] of Object.entries(BOSS_TEAM_DB)) {
                if (text.includes(boss) || text.includes((data.name || '').toLowerCase())) {
                    (data.types || []).forEach(type => detected.add(type));
                    (data.team || []).forEach(mon => (mon.types || []).forEach(type => detected.add(type)));
                }
            }

            for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
                if (text.includes(boss)) {
                    detected.add(type);
                }
            }
        }

        const eliteEnemy = document.getElementById('elite-prep-enemy-name');
        if (eliteEnemy) {
            const enemyText = eliteEnemy.innerText.toLowerCase();
            for (const [boss, data] of Object.entries(BOSS_TEAM_DB)) {
                if (enemyText.includes(boss) || enemyText.includes((data.name || '').toLowerCase())) {
                    (data.types || []).forEach(type => detected.add(type));
                    (data.team || []).forEach(mon => (mon.types || []).forEach(type => detected.add(type)));
                }
            }
            for (const [boss, type] of Object.entries(BOSS_TYPE_MAP)) {
                if (enemyText.includes(boss)) detected.add(type);
            }
        }

        const enemyTraits = document.getElementById('elite-prep-enemy-traits');
        if (enemyTraits) {
            enemyTraits.querySelectorAll('.trait-badge, [class*="trait"], .type-badge, [class*="type"]').forEach(badge => {
                detectTypesInText(badge.innerText || badge.title || '').forEach(type => detected.add(type));
            });
        }

        return [...detected];
    }

    function detectBossType() {
        const bossTypes = detectBossTypes();
        if (bossTypes.length > 0) {
            log('info', '🏟️', `Boss/type target detected: ${bossTypes.join('/')}`);
            return bossTypes[0];
        }

        return null;
    }

    function optimizeTeamOrder(teamUnits, bossType, prepStatus = null) {
        if (teamUnits.length <= 1 || !bossType) return false;

        const aliveUnits = teamUnits.filter(p => p && !p.isFainted);
        const teamMaxLevel = Math.max(0, ...teamUnits.map(p => p.level || 0));
        const currentLead = aliveUnits.find(p => p.index === 0) || aliveUnits[0] || null;
        const targetLeadLevel = prepStatus?.targets?.leadLevel || 0;
        const leadLevelReason = prepStatus?.targets?.reason || '';
        const seriousBattle = leadLevelReason.includes('r2') ||
                              leadLevelReason.includes('r3') ||
                              leadLevelReason.includes('big-boss') ||
                              leadLevelReason.includes('final') ||
                              isBossOpponentProfile(bossType) ||
                              isFinalBossOpponentProfile(bossType);
        const leadDeficit = targetLeadLevel - (currentLead?.level || 0);
        const hasLeadLevelPressure = targetLeadLevel > 0 && leadDeficit > 0 && (seriousBattle || leadDeficit >= 8);
        const hasTargetReadyLead = aliveUnits.some(p => (p.level || 0) >= targetLeadLevel);
        const leadLevelFloor = hasLeadLevelPressure
            ? (hasTargetReadyLead ? targetLeadLevel : Math.max(0, teamMaxLevel - 3))
            : 0;
        const scoreOrderCandidate = (p, slotIndex) => {
            let score = scoreBattleOrderCandidate(p, bossType, slotIndex, teamMaxLevel);
            if (slotIndex === 0 && leadLevelFloor > 0 && (p.level || 0) < leadLevelFloor) {
                const levelGap = leadLevelFloor - (p.level || 0);
                score -= 500 + levelGap * 80;
            }
            return score;
        };
        const compareOrderEntries = (a, b) => {
            const diff = b.score - a.score;
            if (Math.abs(diff) > CONFIG.TEAM_REORDER_SCORE_TIE_EPSILON) return diff;
            return a.unit.index - b.unit.index;
        };

        let leadChoice = aliveUnits
            .map(p => ({
                unit: p,
                score: scoreOrderCandidate(p, 0)
            }))
            .sort(compareOrderEntries)[0];

        const preferredCarry = getMainCarry(teamUnits);
        if (preferredCarry && leadChoice && leadChoice.unit.index !== preferredCarry.index) {
            const carryLeadScore = scoreOrderCandidate(preferredCarry, 0);
            const carryHp = preferredCarry.hp || 100;
            const sustainMargin = preferredCarry.heldItem && isHealingItem(preferredCarry.heldItem) ? 35 : 0;
            const lowHpReduction = carryHp < CONFIG.CRITICAL_HP_THRESHOLD ? CONFIG.MAIN_CARRY_REORDER_MARGIN : (carryHp < CONFIG.LOW_HP_THRESHOLD ? 45 : 0);
            const baseCarryMargin = Math.max(0, CONFIG.MAIN_CARRY_REORDER_MARGIN + sustainMargin - lowHpReduction);
            const carryMargin = getMainCarryLeadProtectionMargin(preferredCarry, bossType, baseCarryMargin);

            if (carryLeadScore + carryMargin >= leadChoice.score) {
                log('debug', '🎯', `Protecting main carry lead [${preferredCarry.name}] vs [${leadChoice.unit.name}] (${carryLeadScore.toFixed(1)} + margin ${carryMargin} >= ${leadChoice.score.toFixed(1)}).`);
                recordRunEvent('carry-lead-protected', {
                    carry: preferredCarry.name,
                    contender: leadChoice.unit.name,
                    carryScore: Number(carryLeadScore.toFixed(1)),
                    contenderScore: Number(leadChoice.score.toFixed(1)),
                    margin: carryMargin,
                    opponent: compactOpponentProfile(bossType)
                });
                leadChoice = { unit: preferredCarry, score: carryLeadScore };
            }
        }

        const backupUnits = aliveUnits
            .filter(p => !leadChoice || p.index !== leadChoice.unit.index)
            .map(p => ({
                unit: p,
                score: scoreOrderCandidate(p, 1)
            }))
            .sort(compareOrderEntries);

        const faintedUnits = teamUnits
            .filter(p => p && p.isFainted)
            .map(p => ({ unit: p, score: -999 }))
            .sort((a, b) => a.unit.index - b.unit.index);

        const desiredOrder = [...(leadChoice ? [leadChoice] : []), ...backupUnits, ...faintedUnits];
        if (desiredOrder.length <= 1) return false;

        for (let targetIndex = 0; targetIndex < desiredOrder.length; targetIndex++) {
            const desired = desiredOrder[targetIndex];
            const current = teamUnits[targetIndex];
            if (!desired || !current || desired.unit.index === current.index) continue;

            const currentScore = current.isFainted ? -999 : scoreOrderCandidate(current, targetIndex);
            const improvement = desired.score - currentScore;
            let threshold = targetIndex === 0 ? 10 : 6;
            const duplicateSlotSwap = getPokemonIdentityKey(current.name) === getPokemonIdentityKey(desired.unit.name);
            if (duplicateSlotSwap && !current.isFainted && !desired.unit.isFainted) {
                threshold += CONFIG.TEAM_REORDER_DUPLICATE_EXTRA_MARGIN;
            }
            if (targetIndex === 0 && isMainCarryUnit(current) && !isMainCarryUnit(desired.unit)) {
                const currentHp = current.hp || 100;
                const baseCarryMargin = currentHp < CONFIG.CRITICAL_HP_THRESHOLD ? 0 :
                                        currentHp < CONFIG.LOW_HP_THRESHOLD ? Math.round(CONFIG.MAIN_CARRY_REORDER_MARGIN * 0.45) :
                                        CONFIG.MAIN_CARRY_REORDER_MARGIN;
                const carryMargin = getMainCarryLeadProtectionMargin(current, bossType, baseCarryMargin);
                threshold += carryMargin;
            } else if (targetIndex === 0 && !isMainCarryUnit(current) && isMainCarryUnit(desired.unit)) {
                const desiredHp = desired.unit.hp || 100;
                const baseCarryMargin = desiredHp < CONFIG.CRITICAL_HP_THRESHOLD ? 0 :
                                        desiredHp < CONFIG.LOW_HP_THRESHOLD ? Math.round(CONFIG.MAIN_CARRY_REORDER_MARGIN * 0.45) :
                                        CONFIG.MAIN_CARRY_REORDER_MARGIN;
                const carryMargin = getMainCarryLeadProtectionMargin(desired.unit, bossType, baseCarryMargin);
                threshold = -carryMargin;
            }

            if (current.isFainted || improvement > threshold) {
                const targetLabel = targetIndex === 0 ? 'lead' : `slot ${targetIndex + 1}`;
                log('info', '🎯', `Team order: [${desired.unit.name}] to ${targetLabel} vs [${getOpponentProfileLabel(bossType)}] (score: ${desired.score.toFixed(1)} > ${currentScore.toFixed(1)})`);
                return tryTeamReorder(desired.unit.element, current.element, desired.unit, current, 'battle-order');
            }
        }

        return false;
    }

    function getCurrentMapKey() {
        const mapInfo = foldText(document.getElementById('map-info')?.innerText || '');
        const stageInfo = foldText([
            document.getElementById('stage-title')?.innerText || '',
            document.getElementById('map-title')?.innerText || '',
            document.getElementById('region-title')?.innerText || '',
            document.querySelector('.stage-title, .map-title, .region-title')?.innerText || ''
        ].join(' '));

        if (mapInfo || stageInfo) {
            return `${stageInfo || 'stage'}::${mapInfo || 'map'}`;
        }

        const nodes = Array.from(document.querySelectorAll('.map-node, [class*="map-node"]')).map(node => {
            return `${node.getAttribute('transform') || ''}:${getNodeImageSrc(node)}`;
        }).join('|');

        return nodes ? `nodes::${nodes.slice(0, 1200)}` : currentMapKey;
    }

    function syncMapCaptureState() {
        const key = getCurrentMapKey();
        if (key && key !== currentMapKey) {
            currentMapKey = key;
            capturesThisMap = 0;
            lastMapClickSignature = '';
            repeatedMapClickCount = 0;
            log('debug', '🗺️', `New map detected. Capture counter reset. key=${key.slice(0, 80)}`);
        }
        return currentMapKey;
    }

    function resetMapCaptureState(reason = 'reset') {
        currentMapKey = '';
        capturesThisMap = 0;
        lastMapDecisionFingerprint = '';
        lastMapClickSignature = '';
        repeatedMapClickCount = 0;
        lastCatchRerollSignature = '';
        lastCatchRerollAt = 0;
        lastTeamReorderSignature = '';
        lastTeamReorderAt = 0;
        teamReorderAttemptsBySignature = {};
        catchRerollAttemptsBySignature = {};
        resetCatchScreenSession();
        log('debug', '🗺️', `Map capture state reset: ${reason}`);
    }

    function resetCatchScreenSession() {
        catchScreenSessionActive = false;
        catchRerollsThisEncounter = 0;
        lastCatchRerollSignature = '';
        lastCatchRerollAt = 0;
        catchRerollAttemptsBySignature = {};
    }

    function syncCatchScreenSession(currentState) {
        if (currentState === 'catch-screen') {
            if (!catchScreenSessionActive) {
                catchScreenSessionActive = true;
                catchRerollsThisEncounter = 0;
                lastCatchRerollSignature = '';
                lastCatchRerollAt = 0;
                catchRerollAttemptsBySignature = {};
            }
            return;
        }

        if (catchScreenSessionActive) {
            resetCatchScreenSession();
        }
    }

    function hasReachedMapCaptureCap() {
        return CONFIG.MAX_CATCHES_PER_MAP >= 0 && capturesThisMap >= CONFIG.MAX_CATCHES_PER_MAP;
    }

    function getMapNodeStateText(node) {
        if (!node) return '';
        const parts = [
            node.getAttribute('class') || '',
            node.getAttribute('aria-label') || '',
            node.getAttribute('title') || '',
            node.getAttribute('data-state') || '',
            node.getAttribute('data-status') || ''
        ];
        Array.from(node.querySelectorAll('[class], [aria-label], [title], use, image, img, svg')).slice(0, 10).forEach(child => {
            parts.push(
                child.getAttribute('class') || '',
                child.getAttribute('aria-label') || '',
                child.getAttribute('title') || '',
                child.getAttribute('href') || '',
                child.getAttribute('xlink:href') || '',
                child.getAttribute('src') || ''
            );
        });
        return foldText(parts.join(' '));
    }

    function isCompletedMapNode(node) {
        const text = getMapNodeStateText(node);
        return Boolean(text.match(/completed|complete|visited|cleared|finished|done|current|active|selected|checkmark|check-mark|check_icon|checked/));
    }

    function getClickableMapNodes() {
        const nodes = Array.from(document.querySelectorAll('.map-node--clickable'));
        const freshNodes = nodes.filter(node => isVisible(node) && !isCompletedMapNode(node));
        return freshNodes.length > 0 ? freshNodes : nodes.filter(node => isVisible(node));
    }

    function getMapNodeClickSignature(node) {
        if (!node) return '';
        const pos = getMapNodePosition(node);
        return `${currentMapKey || '-'}:${Math.round(pos.x)}:${Math.round(pos.y)}:${classifyMapNode(node)}`;
    }

    function forceClickAlternateMapNode(reason = 'recovery') {
        const nodes = getClickableMapNodes();
        if (nodes.length === 0) return false;
        const alternate = nodes.find(node => getMapNodeClickSignature(node) !== lastMapClickSignature) || nodes[0];
        const signature = getMapNodeClickSignature(alternate);
        lastMapClickSignature = signature;
        repeatedMapClickCount = 1;
        log('warn', '🗺️', `Map recovery click (${reason}) on ${classifyMapNode(alternate)} node.`);
        return triggerRealClick(alternate);
    }

    function classifyMapNode(node) {
        const text = getNodeClassificationText(node);

        if (text.match(/master.?ball|ball.?master|\bmaster\b|legendary[-_ ]?encounter|legendary.?pokemon|legendary|legendario|legendaria|mythical|mitico|mitica|legend.?battle|boss.?legend/)) return 'legendary';
        if (text.match(/poke.?center|pokecenter|center|heal/)) return 'center';
        if (text.match(/final.?boss|boss|gym|elite|leader|champion|campeon/)) return 'boss';
        if (text.match(/trainer|versus|battle|fisher|fisherman|hiker|swimmer|black.?belt|psychic|bird|sailor|camper|picnic|juggler|burglar|channeler|engineer|rocker|tamer|beauty|cue.?ball|lass|youngster|cooltrainer|ace|gentleman|super.?nerd|nerd|biker|gambler/)) return 'trainer';
        if (text.match(/pokeball|poke-ball|catch/)) return 'catch';
        if (text.match(/grass|wild/)) return 'grass';
        if (text.match(/item|backpack|bag/)) return 'item';
        if (text.match(/scientist|professor|passive|buff/)) return 'buff';
        if (text.match(/trade|npc/)) return 'trade';
        return 'unknown';
    }

    function getMapNodePosition(node) {
        const transform = node ? (node.getAttribute('transform') || '') : '';
        const matchTranslate = transform.match(/translate\(([-0-9.]+)[,\s]+([-0-9.]+)/);
        if (matchTranslate) {
            return { x: Number.parseFloat(matchTranslate[1]) || 0, y: Number.parseFloat(matchTranslate[2]) || 0 };
        }

        const rect = node ? node.getBoundingClientRect() : null;
        return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
    }

    function parseMapTree() {
        const mapSvg = document.getElementById('map-svg') || document.querySelector('#map-container svg');
        const rawNodes = Array.from(document.querySelectorAll('.map-node, [class*="map-node"]'));
        const seen = new Set();
        let nodes = rawNodes.filter(node => {
            if (!node || seen.has(node)) return false;
            seen.add(node);
            return getNodeImageSrc(node) || (node.getAttribute('class') || '').includes('map-node');
        }).map((node) => {
            const pos = getMapNodePosition(node);
            return {
                element: node,
                type: classifyMapNode(node),
                src: getNodeImageSrc(node),
                x: pos.x,
                y: pos.y,
                clickable: node.classList.contains('map-node--clickable') || node.matches('.map-node--clickable')
            };
        });

        // Sort from top to bottom, left to right
        nodes.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        
        // Re-assign index so that 0 is top-most (Boss) and 22 is bottom-most (Start)
        nodes.forEach((node, idx) => {
            node.index = idx;
        });

        const adjacency = new Map();
        const edges = [];

        // Exact known 23-node map structure
        if (nodes.length === 23) {
            const HARDCODED_MAP_ADJACENCY = {
                22: [20, 21],
                20: [17, 18],
                21: [18, 19],
                17: [13, 14],
                18: [14, 15],
                19: [15, 16],
                13: [10],
                14: [10, 11],
                15: [11, 12],
                16: [12],
                10: [6, 7],
                11: [7, 8],
                12: [8, 9],
                6: [3],
                7: [3, 4],
                8: [4, 5],
                9: [5],
                3: [1],
                4: [1, 2],
                5: [2],
                1: [0],
                2: [0],
                0: []
            };

            nodes.forEach(node => {
                const nextNodes = HARDCODED_MAP_ADJACENCY[node.index] || [];
                adjacency.set(node.index, nextNodes);
                nextNodes.forEach(to => {
                    edges.push({ from: node.index, to });
                });
            });

            return { nodes, edges, adjacency, hasRealEdges: true };
        }

        // Fallback for maps of different sizes
        nodes.forEach(node => adjacency.set(node.index, []));
        const findNodeAt = (x, y) => {
            let best = null;
            let bestDist = Infinity;
            nodes.forEach(node => {
                const dist = Math.hypot(node.x - x, node.y - y);
                if (dist < bestDist) {
                    best = node;
                    bestDist = dist;
                }
            });
            return bestDist <= 8 ? best : null;
        };

        if (mapSvg) {
            Array.from(mapSvg.querySelectorAll('line')).forEach(line => {
                const x1 = Number.parseFloat(line.getAttribute('x1'));
                const y1 = Number.parseFloat(line.getAttribute('y1'));
                const x2 = Number.parseFloat(line.getAttribute('x2'));
                const y2 = Number.parseFloat(line.getAttribute('y2'));
                if ([x1, y1, x2, y2].some(value => Number.isNaN(value))) return;

                const a = findNodeAt(x1, y1);
                const b = findNodeAt(x2, y2);
                if (!a || !b || a.index === b.index) return;

                const from = a.y <= b.y ? a : b;
                const to = a.y <= b.y ? b : a;
                edges.push({ from: from.index, to: to.index });
                if (!adjacency.get(from.index).includes(to.index)) {
                    adjacency.get(from.index).push(to.index);
                }
            });
        }

        return { nodes, edges, adjacency, hasRealEdges: edges.length > 0 };
    }

    function getNextMapLayerNodes(tree, node) {
        if (!tree || !node) return [];
        if (tree.hasRealEdges && tree.adjacency) {
            const nextIndexes = tree.adjacency.get(node.index) || [];
            return nextIndexes.map(index => tree.nodes.find(candidate => candidate.index === index)).filter(Boolean);
        }

        const ahead = tree.nodes.filter(candidate => candidate.y > node.y + 8);
        if (ahead.length === 0) return [];
        const nextY = Math.min(...ahead.map(candidate => candidate.y));
        return ahead.filter(candidate => Math.abs(candidate.y - nextY) < 12);
    }

    function scoreKnownBossNode(profile, context) {
        const lead = getAliveTeam(context.team)[0];
        const prep = getBossPrepStatus(context.team, profile);
        const deficitPenalty = prep.avgDeficit * 150 + prep.leadDeficit * 110;

        let score = context.avgHP > CONFIG.LOW_HP_THRESHOLD ? 320 : -850;
        if (profile && lead) score += scoreLeadCandidate(lead, profile) / 4;
        if (context.leadNeedsItem) score -= prep.ready ? 280 : 520;
        if (context.earlyLevelingPriority && !prep.ready) score -= 1400;
        if (!prep.ready) score -= 900 + deficitPenalty;
        else score += 620;

        return score;
    }

    function scoreLegendaryNode(context) {
        const team = context.team || [];
        const alive = getAliveTeam(team);
        const lead = alive[0];
        const prep = context.bossPrepStatus || getBossPrepStatus(team);
        const prepPressure = (prep.avgDeficit || 0) + (prep.leadDeficit || 0);
        let score = CONFIG.LEGENDARY_NODE_BASE_SCORE + CONFIG.LEGENDARY_NODE_ROUTE_BONUS;

        if (context.hasFainted) score -= 1500;
        if (context.avgHP < CONFIG.CRITICAL_HP_THRESHOLD) score -= CONFIG.LEGENDARY_NODE_LOW_HP_PENALTY;
        else if (context.avgHP < CONFIG.LOW_HP_THRESHOLD) score -= Math.round(CONFIG.LEGENDARY_NODE_LOW_HP_PENALTY * 0.45);
        if (alive.length < 3) score -= 900;
        if (prep.ready) score += CONFIG.LEGENDARY_NODE_READY_BONUS;
        else score -= Math.min(
            CONFIG.LEGENDARY_NODE_MAX_UNDERLEVEL_PENALTY,
            prepPressure * CONFIG.LEGENDARY_NODE_UNDERLEVEL_PENALTY
        );

        if (lead) {
            score += getPokemonCarryScore(lead) / 2.5;
            score += lead.heldItem ? 180 : -180;
            if (isMainCarryUnit(lead)) score += 420;
            if (lead.heldItem && isHealingItem(lead.heldItem)) score += 320;
            if ((lead.hp || 100) < CONFIG.LOW_HP_THRESHOLD) score -= 500;
        }

        return score;
    }

    function getBotControlTacticNodeBonus(type, context = {}) {
        const tactic = getBotControlTactic();
        if (tactic === 'auto') return 0;

        const team = context.team || [];
        const centerNeed = context.centerNeed || getCenterNeedStatus(team);
        const earlyExpansionClosed = Boolean(context.earlyExpansionClosed);
        const openTeamSlot = hasOpenTeamSlot(team);

        if (tactic === 'xp') {
            if (type === 'trainer') return 900;
            if (type === 'buff') return 180;
            if (type === 'catch' || type === 'grass') return -500;
            if (type === 'item') return -120;
            if (type === 'center' && centerNeed.canSkipCenter) return -300;
            return 0;
        }

        if (tactic === 'capture') {
            if (type === 'catch') return 850;
            if (type === 'grass') return 350;
            if (type === 'trade') return 120;
            if (type === 'trainer') return -180;
            return 0;
        }

        if (tactic === 'boss') {
            if (type === 'item') return 420;
            if (type === 'buff') return 300;
            if (type === 'trainer') return 220;
            if (type === 'legendary') return 260;
            if (type === 'boss') return 180;
            if (type === 'center') return centerNeed.canSkipCenter ? -100 : 400;
            if ((type === 'catch' || type === 'grass') && earlyExpansionClosed) return -200;
            return 0;
        }

        if (tactic === 'duplicate') {
            if (type === 'catch') return openTeamSlot ? 600 : 180;
            if (type === 'grass') return 260;
            if (type === 'trainer') return 120;
            if (type === 'trade') return 80;
            return 0;
        }

        return 0;
    }

    function scoreMapNodeImmediate(mapNode, context) {
        let score = 0;
        const {
            team, avgHP, hasFainted, lowHPCount, leadNeedsItem,
            buildingCoreTeam, trainingCore, earlyLevelingPriority, captureCapReached
        } = context;
        const openTeamSlot = hasOpenTeamSlot(team);
        const teamSize = (team || []).length;
        const needsEarlyRoster = openTeamSlot && teamSize < CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
        const earlyExpansionClosed = context.earlyExpansionClosed || false;
        const teamMaxLevel = Math.max(0, ...team.map(p => p.level || 0));
        const hasLowLevelForSwap = !openTeamSlot && team.some(p => (p.level || 0) < teamMaxLevel - 3);
        const prepStatus = context.bossPrepStatus || getBossPrepStatus(team);
        const prepPressure = (prepStatus.avgDeficit || 0) + (prepStatus.leadDeficit || 0);
        const bossLevelPressure = Math.max(0, prepPressure);
        const primaryCarry = getPrimaryCarry(team);
        const duplicateRouteScore = getDuplicatePairRouteScore(team);
        const centerNeed = context.centerNeed || getCenterNeedStatus(team);
        const sinnohTraining = context.sinnohTraining || getSinnohTowerTrainingContext(team);
        const carryNeedsHealingItem = Boolean(
            primaryCarry &&
            isMainCarryUnit(primaryCarry) &&
            !primaryCarry.isFainted &&
            !isHealingItem(primaryCarry.heldItem)
        );

        switch (mapNode.type) {
            case 'center':
                if (hasFainted) score += 5000;
                else if (avgHP < CONFIG.CRITICAL_HP_THRESHOLD) score += 4000;
                else if (avgHP < CONFIG.LOW_HP_THRESHOLD) score += 2000;
                else if (lowHPCount >= 2) score += 1500;
                else if (centerNeed.fullEnough) score -= CONFIG.CENTER_HEALTHY_PATH_PENALTY;
                else if (centerNeed.healthyCarryCanSkip) score -= CONFIG.CENTER_STRONG_CARRY_PATH_PENALTY;
                else if (centerNeed.almostFull) score -= CONFIG.CENTER_ALMOST_HEALTHY_PATH_PENALTY;
                else if (bossLevelPressure > 0 && avgHP >= CONFIG.CENTER_CARRY_SKIP_AVG_HP_THRESHOLD) {
                    score -= 650 + bossLevelPressure * 55;
                }
                else score -= 250;
                break;
            case 'buff':
                score += earlyLevelingPriority ? 360 + prepPressure * 45 : 500;
                if (bossLevelPressure > 0) score += bossLevelPressure * CONFIG.BOSS_LEVEL_PRESSURE_BUFF_BONUS;
                if (sinnohTraining.active) {
                    score += CONFIG.SINNOH_BUFF_NODE_BONUS;
                    if (sinnohTraining.needsOffense) score += CONFIG.SINNOH_OFFENSE_BUFF_NODE_BONUS;
                }
                break;
            case 'legendary':
                score += scoreLegendaryNode(context);
                break;
            case 'catch':
                if (earlyExpansionClosed && !hasLowLevelForSwap) score -= 1800 + prepPressure * 80;
                else if (captureCapReached && !needsEarlyRoster && !hasLowLevelForSwap) score -= 3200;
                else if (buildingCoreTeam) score += 700;
                else if (needsEarlyRoster) score += earlyLevelingPriority ? 520 : 380;
                else if (hasLowLevelForSwap) score += earlyLevelingPriority ? 450 : 350;
                else if (earlyLevelingPriority) score -= 900 + prepPressure * 55;
                else if (openTeamSlot) score += 120;
                else if (getAliveTeam(team).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE) score += 180;
                else score -= 450;
                if (bossLevelPressure > 0) score -= bossLevelPressure * CONFIG.BOSS_LEVEL_PRESSURE_CATCH_PENALTY;
                score += duplicateRouteScore;
                if (sinnohTraining.active && getAliveTeam(team).length >= CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE) {
                    score -= CONFIG.SINNOH_CATCH_NODE_PENALTY;
                }
                break;
            case 'grass':
                if (earlyExpansionClosed && !hasLowLevelForSwap) score -= 1400 + prepPressure * 60;
                else if (captureCapReached && !needsEarlyRoster && !hasLowLevelForSwap) score -= 2400;
                else if (buildingCoreTeam) score += 280;
                else if (needsEarlyRoster) score += earlyLevelingPriority ? 240 : 120;
                else if (hasLowLevelForSwap) score += earlyLevelingPriority ? 180 : 120;
                else if (earlyLevelingPriority) score -= 650 + prepPressure * 40;
                else if (openTeamSlot) score += 40;
                else score -= 250;
                if (bossLevelPressure > 0) score -= bossLevelPressure * Math.round(CONFIG.BOSS_LEVEL_PRESSURE_CATCH_PENALTY * 0.7);
                score += Math.round(duplicateRouteScore * 0.55);
                if (sinnohTraining.active && getAliveTeam(team).length >= CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE) {
                    score -= CONFIG.SINNOH_GRASS_NODE_PENALTY;
                }
                break;
            case 'item':
                if (earlyLevelingPriority) {
                    score += carryNeedsHealingItem ? 260 : (leadNeedsItem && !buildingCoreTeam ? 120 : -420);
                } else {
                    score += carryNeedsHealingItem ? 720 : (leadNeedsItem ? 520 : 260);
                }
                if (bossLevelPressure > 0 && !carryNeedsHealingItem && !leadNeedsItem) {
                    score -= bossLevelPressure * CONFIG.BOSS_LEVEL_PRESSURE_ITEM_PENALTY;
                }
                if (sinnohTraining.active) {
                    score += CONFIG.SINNOH_ITEM_NODE_BONUS;
                    if (sinnohTraining.needsTm) score += CONFIG.SINNOH_TM_NODE_BONUS;
                }
                break;
            case 'trainer': {
                const baseScore = avgHP > CONFIG.LOW_HP_THRESHOLD ? 820 : 220;
                const profile = detectNextOpponentProfile(mapNode.element);
                if (isBossOpponentProfile(profile)) {
                    score += scoreKnownBossNode(profile, context);
                    break;
                }
                const matchupScore = (isNodeSpecificOpponentProfile(profile) || isBossOpponentProfile(profile)) ? scoreLeadCandidate(getAliveTeam(team)[0], profile) / 3 : getTrainerMatchupScore(mapNode.src, team);
                score += baseScore + matchupScore - (leadNeedsItem ? 70 : 0) + (earlyLevelingPriority ? 1150 + prepPressure * 80 : 120);
                if (bossLevelPressure > 0) score += bossLevelPressure * CONFIG.BOSS_LEVEL_PRESSURE_TRAINER_BONUS;
                if (sinnohTraining.active) {
                    score += CONFIG.SINNOH_TRAINER_NODE_BONUS + prepPressure * 70;
                }
                break;
            }
            case 'boss': {
                const profile = detectNextOpponentProfile(mapNode.element);
                score += scoreKnownBossNode(profile, context);
                break;
            }
            case 'trade':
                score += captureCapReached ? -250 : 120;
                break;
            default:
                score += 1;
                break;
        }

        score += getBotControlTacticNodeBonus(mapNode.type, context);
        score += (mapNode.x % 17);
        return score;
    }

    function scorePathFromNode(mapNode, tree, context, depth = CONFIG.PATH_LOOKAHEAD_DEPTH, memo = new Map(), routeItemCount = 0) {
        let immediate = scoreMapNodeImmediate(mapNode, context);
        if (context.earlyLevelingPriority && mapNode.type === 'item' && routeItemCount > 0) {
            immediate -= 900 * routeItemCount;
        }
        const prepPressure = (context.bossPrepStatus?.avgDeficit || 0) + (context.bossPrepStatus?.leadDeficit || 0);
        if (prepPressure > 0 && mapNode.type === 'item' && routeItemCount > 0) {
            immediate -= Math.round(prepPressure * 80 * routeItemCount);
        }
        if (depth <= 1) return immediate;

        const nextRouteItemCount = routeItemCount + (mapNode.type === 'item' ? 1 : 0);
        const memoKey = `${mapNode.index}:${depth}:${Math.min(routeItemCount, 3)}`;
        if (memo.has(memoKey)) return memo.get(memoKey);

        const nextNodes = getNextMapLayerNodes(tree, mapNode);
        if (nextNodes.length === 0) {
            memo.set(memoKey, immediate);
            return immediate;
        }

        const bestFuture = Math.max(...nextNodes.map(next => scorePathFromNode(next, tree, context, depth - 1, memo, nextRouteItemCount)));
        const score = immediate + bestFuture * 0.55;
        memo.set(memoKey, score);
        return score;
    }

    function isRewardMapNodeType(type) {
        return ['item', 'buff', 'catch', 'grass', 'trainer', 'trade', 'legendary'].includes(type);
    }

    function getBestPathSummary(mapNode, tree, context, depth = CONFIG.PATH_LOOKAHEAD_DEPTH) {
        const path = [];
        const seen = new Set();
        let current = mapNode;
        let remaining = depth;
        let routeItemCount = 0;

        while (current && remaining > 0 && !seen.has(current.index)) {
            path.push(current.type);
            seen.add(current.index);
            routeItemCount += current.type === 'item' ? 1 : 0;
            const nextNodes = getNextMapLayerNodes(tree, current);
            if (nextNodes.length === 0) break;
            current = nextNodes
                .map(next => ({ node: next, score: scorePathFromNode(next, tree, context, remaining - 1, new Map(), routeItemCount) }))
                .sort((a, b) => b.score - a.score)[0]?.node || null;
            remaining--;
        }

        return path.join(' > ');
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║     🐾 AI: CATCH CANDIDATE SCORER (Trait-Aware Drafting)    ║
    // ╚══════════════════════════════════════════════════════════════╝

    function scoreCatchCandidate(candidateName, candidateTypes, team, isShiny = false, attackTypes = null, bossTypesOverride = null, options = {}) {
        let score = 0;
        const traitCounts = getTeamTraitCounts(team);
        const teamTypes = getTeamTypes(team);
        const bossTypes = bossTypesOverride || getCurrentCatchBossTypes();
        const aliveCount = getAliveTeam(team || []).length;
        const coverageWeight = aliveCount < CONFIG.EARLY_OPTIONAL_TEAM_SIZE
            ? CONFIG.EARLY_NEW_TYPE_COVERAGE_WEIGHT
            : CONFIG.SETTLED_NEW_TYPE_COVERAGE_WEIGHT;
        score += getTraitCompletionScore(candidateTypes, team);
        score += scoreSinnohPassivePlanForTypes(candidateTypes, team, { isShiny });
        score += scoreSinnohPowerCatchCandidate(candidateName, candidateTypes, team, {
            isShiny,
            attackTypes,
            level: options.level || 0
        }) * 0.45;
        score += scorePokemonStats(getPokemonBaseStats(candidateName)) * 0.6;

        // 1. Trait synergy score — prioritize completing trait thresholds
        candidateTypes.forEach(type => {
            const traitInfo = TRAIT_DATA[type];
            if (!traitInfo) return;
            const currentCount = traitCounts[type] || 0;
            const tierValue = TRAIT_TIER_VALUE[traitInfo.tier] || 1;

            // Near threshold (1 away from activating T1=2, T2=4, T3=6)
            if (currentCount === 1 || currentCount === 3 || currentCount === 5) {
                score += tierValue * 2; // About to unlock next tier!
            } else if (currentCount === 0) {
                score += tierValue * 0.5; // Starting a new synergy
            } else {
                score += tierValue * 0.3; // Adding to existing
            }
        });

        // 2. Type coverage — fill gaps
        candidateTypes.forEach(type => {
            if (!teamTypes.includes(type)) {
                score += coverageWeight;
            }
        });

        // 3. Boss counter-pick
        if (bossTypes.length > 0) {
            score += scoreCatchBossCounter(candidateTypes, attackTypes, bossTypes);
        }

        // 4. Grass support: sustain scales well when a protected carry keeps sweeping.
        score += getGrassSupportCatchScore(candidateTypes, team);

        // 5. Duplicate-pair strategy: early catches often enter twice while slots are open.
        score += getDuplicatePairCatchScore(candidateName, candidateTypes, team, attackTypes, bossTypes, options);

        // 6. Legendary/masterball rewards can decide late floors.
        if (isLegendaryPokemonName(candidateName)) {
            score += CONFIG.LEGENDARY_CATCH_SCORE_BONUS;
        }

        // 7. Shiny bonus: early shiny depth is stronger than chasing weak one-off type coverage.
        score += getShinyDraftScore(candidateTypes, team, isShiny);

        return score;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║       💰 AI: TRADE EVALUATOR                                ║
    // ╚══════════════════════════════════════════════════════════════╝

    function evaluateTrade(team) {
        const tradeScreen = document.getElementById('trade-screen');
        if (!tradeScreen) return;

        // Try to read the trade description to understand what's offered
        const tradeDesc = document.getElementById('trade-desc');
        const tradeList = document.querySelectorAll('#trade-team-list li, #trade-team-list .trade-option');

        // If we can parse the trade options, click the best one
        if (tradeList.length > 0) {
            // Look for clickable trade options
            let bestOption = null;
            let bestScore = -999;

            tradeList.forEach(option => {
                const text = option.innerText.toLowerCase().trim();
                // Try to identify the Pokémon being offered
                for (const { name, types } of getAllKnownPokemonEntries()) {
                    if (text.includes(name)) {
                        const score = scoreCatchCandidate(name, types, team);
                        if (score > bestScore) {
                            bestScore = score;
                            bestOption = option;
                        }
                    }
                }
            });

            const tradeAllowance = getEarlyCatchAllowance(team, bestScore, false);
            if (bestOption && bestScore > 3 && tradeAllowance !== 'skip') {
                log('info', '🔄', `Accepting trade (score: ${bestScore})`);
                triggerRealClick(bestOption);
                return;
            }
        }

        // Decline if no good trade found
        const declineBtn = document.getElementById('btn-skip-trade');
        if (declineBtn) {
            log('info', '🔄', 'Declining trade — no good candidates.');
            triggerRealClick(declineBtn);
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║   🗺️ SCREEN HANDLERS                                       ║
    // ╚══════════════════════════════════════════════════════════════╝

    // --- MAP SCREEN (Enhanced Pathfinding) ---
    function handleMapScreen() {
        const team = parseTeamStatus();
        if (team.length === 0) return;
        syncMapCaptureState();

        // 1. Fainted leader → drag first alive to slot 0
        if (team[0] && team[0].isFainted) {
            const firstAlive = team.find(p => !p.isFainted);
            if (firstAlive) {
                log('info', '💀', `Leader fainted → dragging ${firstAlive.name} to lead.`);
                tryTeamReorder(firstAlive.element, team[0].element, firstAlive, team[0], 'fainted-lead');
                return;
            }
        }

        // 2. Detect the known boss or visible enemy profile. Do not reorder only for held items on the map:
        // node-specific counter-picks below own the lead slot to avoid drag loops.
        const opponentProfile = detectNextOpponentProfile();

        // 3. Equip unassigned items from the bag (inventory)
        const bagItems = getBagItems();
        if (bagItems.length > 0) {
            const bestBagItem = pickBestBagItemForTeam(bagItems, team, opponentProfile);
            if (bestBagItem && shouldEquipBagItem(bestBagItem.name, team, opponentProfile)) {
                log('info', '🎒', `Found useful bag item: [${bestBagItem.name}]. Opening equip modal.`);
                lastChosenItemName = bestBagItem.name;
                triggerRealClick(bestBagItem.element);
                return; // Let the modal open and settle
            }
        }

        // 4. Navigate the map tree
        const clickableNodes = getClickableMapNodes();
        if (clickableNodes.length === 0) return;
        const mapDecisionFingerprint = getMapDecisionFingerprint(team, clickableNodes, opponentProfile);
        const mapChangedSinceLastDecision = mapDecisionFingerprint !== lastMapDecisionFingerprint;
        lastMapDecisionFingerprint = mapDecisionFingerprint;

        const avgHP = getTeamAverageHP(team);
        const hasFainted = team.some(p => p.isFainted);
        const lowHPCount = team.filter(p => !p.isFainted && p.hp < CONFIG.LOW_HP_THRESHOLD).length;
        const leadNeedsItem = team[0] && !team[0].isFainted && !team[0].heldItem;
        const buildingCoreTeam = shouldBuildCoreTeam(team);
        const bossPrepStatus = getBossPrepStatus(team, opponentProfile);
        const bossPrepTargets = bossPrepStatus.targets;
        const trainingCore = shouldPrioritizeEarlyTraining(team, opponentProfile);
        const aliveCount = getAliveTeam(team).length;
        const earlyLevelingPriority = trainingCore || aliveCount <= CONFIG.EARLY_OPTIONAL_TEAM_SIZE;
        const avgLevel = getTeamAverageLevel(team);
        const leadLevel = getLeadLevel(team);
        const earlyExpansionClosed = shouldStopEarlyExpansion(team, opponentProfile);
        const captureCapReached = hasReachedMapCaptureCap();
        const mapTree = parseMapTree();
        const centerNeed = getCenterNeedStatus(team, opponentProfile, bossPrepStatus);
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const context = {
            team,
            avgHP,
            hasFainted,
            lowHPCount,
            leadNeedsItem,
            buildingCoreTeam,
            trainingCore,
            earlyLevelingPriority,
            earlyExpansionClosed,
            bossPrepStatus,
            captureCapReached,
            centerNeed,
            sinnohTraining
        };

        let bestNode = null;
        let bestMapNode = null;
        let highestScore = -9999;
        const pathScoreMemo = new Map();

        const candidates = clickableNodes.map(node => {
            const mapNode = mapTree.nodes.find(item => item.element === node) || (() => {
                const pos = getMapNodePosition(node);
                return {
                    index: -1,
                    element: node,
                    type: classifyMapNode(node),
                    src: getNodeImageSrc(node),
                    x: pos.x,
                    y: pos.y,
                    clickable: true
                };
            })();
            const score = scorePathFromNode(mapNode, mapTree, context, CONFIG.PATH_LOOKAHEAD_DEPTH, pathScoreMemo);
            return { node, mapNode, score };
        }).sort((a, b) => b.score - a.score);

        const preferredCandidate = (() => {
            for (const candidate of candidates) {
                const signature = `${currentMapKey || '-'}:${candidate.mapNode.index}:${candidate.mapNode.type}:${Math.round(candidate.mapNode.x)}:${Math.round(candidate.mapNode.y)}`;
                if (signature !== lastMapClickSignature || repeatedMapClickCount < 2) return candidate;
            }
            return candidates[0] || null;
        })();

        candidates.forEach(candidate => {
            const { node, mapNode, score } = candidate;

            if (score > highestScore) {
                highestScore = score;
                bestNode = node;
                bestMapNode = mapNode;
            }
        });

        if (preferredCandidate && preferredCandidate.node !== bestNode && lastMapClickSignature) {
            bestNode = preferredCandidate.node;
            bestMapNode = preferredCandidate.mapNode;
            highestScore = preferredCandidate.score;
            log('warn', '🗺️', `Map click repeated without progress. Trying alternate ${bestMapNode.type} node.`);
        }

        if (bestMapNode?.type === 'center' && centerNeed.canSkipCenter) {
            const rewardAlternative = candidates.find(candidate =>
                candidate.mapNode.type !== 'center' &&
                isRewardMapNodeType(candidate.mapNode.type) &&
                candidate.score >= highestScore - CONFIG.CENTER_REWARD_ALTERNATE_MARGIN
            );
            if (rewardAlternative) {
                log('info', '🗺️', `Skipping center at ${centerNeed.avgHP.toFixed(1)}% avg HP (lowest ${centerNeed.lowestHP}%). Taking ${rewardAlternative.mapNode.type} reward instead.`);
                bestNode = rewardAlternative.node;
                bestMapNode = rewardAlternative.mapNode;
                highestScore = rewardAlternative.score;
            }
        }

        if (bestNode) {
            const nextProfile = ['trainer', 'boss', 'legendary'].includes(bestMapNode.type)
                ? (detectNextOpponentProfile(bestNode) || (bestMapNode.type === 'legendary'
                    ? makeOpponentProfile({ name: 'legendary node', types: [], sourceConfidence: 'legendary-node' })
                    : null))
                : null;
            const shouldReorderForNode = bestMapNode.type === 'boss' ||
                                         bestMapNode.type === 'legendary' ||
                                         (bestMapNode.type === 'trainer' && (isNodeSpecificOpponentProfile(nextProfile) || isBossOpponentProfile(nextProfile)));
            if (['trainer', 'boss', 'legendary'].includes(bestMapNode.type) && ensureLeadMeetsBattleLevel(team, bossPrepStatus, nextProfile)) return;
            if (nextProfile && shouldReorderForNode && optimizeTeamOrder(team, nextProfile, bossPrepStatus)) return;
            if (nextProfile && shouldReorderForNode && ensureLeadHasHeldItem(team, nextProfile)) return;

            const pathSummary = getBestPathSummary(bestMapNode, mapTree, context, CONFIG.PATH_LOOKAHEAD_DEPTH);
            const edgeMode = mapTree.hasRealEdges ? `real graph ${mapTree.edges.length} edges` : 'layer fallback';
            const allMapNodes = mapTree.nodes;
            const clickableMapNodes = allMapNodes.filter(node => node.clickable);
            const visibleLegendaryNodes = mapTree.nodes.filter(node => node.type === 'legendary').length;
            const shouldStoreUnknownHints = bestMapNode.type === 'unknown' || bestMapNode.type === 'legendary';
            const unknownNodeHints = shouldStoreUnknownHints
                ? allMapNodes
                    .filter(node => node.type === 'unknown')
                    .slice(0, 4)
                    .map(node => ({
                        index: node.index,
                        x: Math.round(node.x),
                        y: Math.round(node.y),
                        debug: getMapNodeDebugInfo(node.element)
                    }))
                : [];
            ensureRunTelemetry('map-screen');
            if (mapChangedSinceLastDecision) {
                recordRunEvent('map-choice', {
                    nodeType: bestMapNode.type,
                    nodeIndex: bestMapNode.index,
                    nodeDebug: getMapNodeDebugInfo(bestMapNode.element),
                    nodeTypeCounts: summarizeMapNodeTypes(allMapNodes),
                    clickableNodeTypeCounts: summarizeMapNodeTypes(clickableMapNodes),
                    totalMapNodes: allMapNodes.length,
                    clickableMapNodes: clickableMapNodes.length,
                    visibleLegendaryNodes,
                    unknownNodeHints,
                    score: Number(highestScore.toFixed(1)),
                    path: pathSummary,
                    edgeMode,
                    nextOpponent: compactOpponentProfile(nextProfile),
                    teamSize: team.length,
                    aliveCount,
                    avgHP: Number(avgHP.toFixed(1)),
                    avgLevel: Number(avgLevel.toFixed(1)),
                    leadLevel,
                    trainingCore,
                    earlyLevelingPriority,
                    earlyExpansionClosed,
                    bossPrepTargets,
                    bossPrepStatus,
                    capturesThisMap,
                    captureCapReached,
                    sinnohTraining: sinnohTraining.active ? {
                        assumedTowerSinnoh: sinnohTraining.progress.assumedTowerSinnoh,
                        mapOrdinal: sinnohTraining.progress.mapOrdinal,
                        carry: sinnohTraining.carry ? sinnohTraining.carry.name : null,
                        carryMoveTier: sinnohTraining.carryMoveTier,
                        observedCarryMoveTier: sinnohTraining.observedCarryMoveTier,
                        rememberedCarryMoveTier: sinnohTraining.rememberedCarryMoveTier,
                        needsTm: sinnohTraining.needsTm,
                        needsOffense: sinnohTraining.needsOffense,
                        needsSpeed: sinnohTraining.needsSpeed
                    } : null,
                    centerNeed
                });
                currentRunTelemetry.best.mapSteps = Math.max(currentRunTelemetry.best.mapSteps, currentRunTelemetry.events.filter(event => event.type === 'map-choice').length);
                currentRunTelemetry.best.battles = Math.max(currentRunTelemetry.best.battles, getRunBattleCount(currentRunTelemetry));
            }
            log('debug', '🗺️', `Map reevaluated ${clickableNodes.length} clickable options over ${allMapNodes.length} total nodes (${mapChangedSinceLastDecision ? 'fresh state' : 'repeat'}). ${edgeMode}. Path=${pathSummary}. Captures=${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP} target=${bossPrepTargets.reason}:${bossPrepTargets.avgLevel}/${bossPrepTargets.leadLevel} training=${trainingCore} earlyExpansionClosed=${earlyExpansionClosed} avgLv=${avgLevel.toFixed(1)} leadLv=${leadLevel}. Score=${highestScore.toFixed(1)}`);
            const clickSignature = `${currentMapKey || '-'}:${bestMapNode.index}:${bestMapNode.type}:${Math.round(bestMapNode.x)}:${Math.round(bestMapNode.y)}`;
            if (clickSignature === lastMapClickSignature) repeatedMapClickCount++;
            else {
                lastMapClickSignature = clickSignature;
                repeatedMapClickCount = 1;
            }
            triggerRealClick(bestNode);
        }
    }

    // --- BATTLE SCREEN ---
    function handleBattleScreen() {
        const continueBtn = document.getElementById('btn-continue-battle');
        if (continueBtn && isVisible(continueBtn)) {
            triggerRealClick(continueBtn);
            return;
        }
        const skipBtn = document.getElementById('btn-auto-battle');
        if (skipBtn && isVisible(skipBtn)) {
            ensureRunTelemetry('battle-screen');
            recordRunEvent('battle-auto', { team: compactTeamSnapshot(parseTeamStatus(), detectNextOpponentProfile()) });
            triggerRealClick(skipBtn);
        }
    }

    function isEnabledActionControl(control) {
        if (!control || !isVisible(control)) return false;
        if (control.disabled || control.getAttribute('aria-disabled') === 'true') return false;
        if (control.classList && control.classList.contains('disabled')) return false;

        const style = window.getComputedStyle(control);
        return style.pointerEvents !== 'none';
    }

    function isRerollControl(control) {
        if (!control) return false;
        const classText = typeof control.className === 'string' ? control.className : (control.getAttribute('class') || '');
        const idText = control.id || '';
        const dataText = Array.from(control.attributes || [])
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => `${attr.name} ${attr.value}`)
            .join(' ');
        const text = foldText([
            control.innerText || '',
            control.title || '',
            control.getAttribute('aria-label') || '',
            idText,
            classText,
            dataText
        ].join(' '));

        const structuralMatch = foldText(`${idText} ${classText} ${dataText}`)
            .match(/reroll|re-roll|reroll-placeholder|reroll-pla|data-reroll|roll-option/);

        if (structuralMatch && text.includes('reroll-placeholder') && !control.querySelector('button, .btn, [role="button"], [onclick]') && !control.onclick) {
            return false;
        }
        if (!text && !structuralMatch) return false;
        if (!structuralMatch && text.match(/skip|saltar|omitir|cancel|catch|captur|elegir|select/)) return false;
        return Boolean(structuralMatch || text.match(/reroll|re roll|re-roll|volver a tirar|volver tirar|tirar otra|nuevo intento|\broll\b|refresh|retry|again|cambiar|aleator/));
    }

    function getRerollActionTarget(control) {
        if (!control) return null;
        const childTarget = control.querySelector(
            'button:not([disabled]), .btn:not(.disabled), [role="button"]:not([aria-disabled="true"]), [onclick], svg, img'
        );
        if (childTarget && isVisible(childTarget)) return childTarget;
        return control;
    }

    function findRerollControlInScope(scope) {
        if (!scope) return null;

        const controls = Array.from(scope.querySelectorAll(
            'button, .btn, [role="button"], [onclick], [data-reroll], [class*="reroll"], [id*="reroll"], ' +
            '.reroll-placeholder, [class*="reroll-pla"], [aria-label], [title]'
        ));

        const control = controls.find(candidate => isEnabledActionControl(candidate) && isRerollControl(candidate));
        return control ? getRerollActionTarget(control) : null;
    }

    function findRerollControlForCard(card) {
        if (!card) return null;
        const wrapper = card.closest('.poke-choice-wrap, .catch-choice, .choice-card, .choice, li');
        return findRerollControlInScope(wrapper || card);
    }

    function getRerollCardSignature(item) {
        const card = item?.card;
        if (!card) {
            return `${item?.name || '?'}:${item?.score?.toFixed?.(1) || '?'}:${item?.isShiny ? 'S' : '-'}`;
        }

        const assets = Array.from(card.querySelectorAll('img, image')).slice(0, 4).map(asset => [
            asset.getAttribute('src') || '',
            asset.getAttribute('href') || '',
            asset.getAttribute('xlink:href') || '',
            asset.getAttribute('alt') || '',
            asset.getAttribute('title') || '',
            asset.getAttribute('class') || ''
        ].join('|')).join('~');
        const dataAttrs = Array.from(card.attributes || [])
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => `${attr.name}=${attr.value}`)
            .join('|');
        const text = foldText(card.innerText || '').slice(0, 280);
        const classText = foldText(card.getAttribute('class') || '').slice(0, 120);

        return [
            item.name || '?',
            Number.isFinite(item.score) ? item.score.toFixed(1) : '?',
            item.isShiny ? 'S' : '-',
            item.level || 0,
            (item.types || []).join('/'),
            classText,
            dataAttrs,
            assets,
            text
        ].join('::');
    }

    function getPokemonBaseStatTotal(stats) {
        if (!stats) return 0;
        return getPokemonStat(stats, 'hp') +
               getPokemonStat(stats, 'atk', 'attack') +
               getPokemonStat(stats, 'def') +
               getPokemonStat(stats, 'special', 'spa', 'spatk') +
               getPokemonStat(stats, 'spdef', 'spd') +
               getPokemonStat(stats, 'speed', 'spe');
    }

    function isPremiumCatchCandidate(cardScore, isShiny, name) {
        if (isShiny) return true;
        if (isLegendaryPokemonName(name)) return true;
        if (cardScore >= CONFIG.CATCH_REROLL_PROTECT_SCORE) return true;
        return getPokemonBaseStatTotal(getPokemonBaseStats(name)) >= 540;
    }

    function getCurrentCatchBossTypes() {
        const opponentProfile = detectNextOpponentProfile();
        return opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
    }

    function scoreCatchBossCounter(candidateTypes, attackTypes, bossTypes) {
        const targetTypes = normalizeTypeList(bossTypes);
        if (targetTypes.length === 0) return 0;
        return getAttackCoverageScore(attackTypes || candidateTypes, targetTypes) * 2.5 +
               getDefensiveMatchupScore(candidateTypes, targetTypes) * 2;
    }

    function isBossRelevantCatchCandidate(candidate, bossTypes) {
        if (!candidate || normalizeTypeList(bossTypes).length === 0) return false;
        const attackScore = getAttackCoverageScore(candidate.attackTypes || candidate.types, bossTypes);
        const defensiveScore = getDefensiveMatchupScore(candidate.types || [], bossTypes);
        return attackScore > 0 || defensiveScore > 0 || (candidate.bossMatchupScore || 0) >= 8;
    }

    function isDirectBossCounterCandidate(candidate, bossTypes) {
        if (!candidate || normalizeTypeList(bossTypes).length === 0) return false;
        const attackScore = getAttackCoverageScore(candidate.attackTypes || candidate.types, bossTypes);
        const defensiveScore = getDefensiveMatchupScore(candidate.types || [], bossTypes);
        return attackScore >= 5 ||
               (candidate.bossMatchupScore || 0) >= CONFIG.EARLY_EXPANSION_COUNTER_SCORE ||
               (attackScore > 0 && defensiveScore > 0);
    }

    function getBotControlCatchScoreBonus(candidate, team, bossTypes) {
        const tactic = getBotControlTactic();
        if (tactic === 'auto' || !candidate) return 0;

        if (tactic === 'capture') {
            return 18;
        }

        if (tactic === 'xp') {
            const protectedValue = candidate.isShiny ||
                candidate.isLegendary ||
                (candidate.duplicatePairScore || 0) >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE ||
                isBossRelevantCatchCandidate(candidate, bossTypes);
            return protectedValue ? 0 : -16;
        }

        if (tactic === 'boss') {
            const matchupBonus = Math.min(28, (candidate.bossMatchupScore || 0) * 1.4);
            return isDirectBossCounterCandidate(candidate, bossTypes)
                ? Math.max(10, matchupBonus)
                : matchupBonus;
        }

        if (tactic === 'duplicate') {
            const duplicateScore = candidate.duplicatePairScore || 0;
            if (duplicateScore > 0) return Math.max(18, duplicateScore);
            return hasOpenTeamSlot(team) ? 6 : 0;
        }

        return 0;
    }

    function isProtectedCatchCandidate(candidate, bossTypes) {
        if (!candidate) return false;
        return isPremiumCatchCandidate(candidate.score, candidate.isShiny, candidate.name) ||
               (candidate.duplicatePairScore || 0) >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE ||
               (candidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
               (candidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE ||
               isBossRelevantCatchCandidate(candidate, bossTypes);
    }

    function findCatchRerollButton(scoredCards, options = {}) {
        const bossTypes = getCurrentCatchBossTypes();
        const shouldProtect = item => {
            if (!item) return true;
            if (options.preserveShiny && item.isShiny) return true;
            if (options.ignoreProtectedForReroll) return false;
            return isProtectedCatchCandidate(item, bossTypes);
        };
        const hasProtectedVisible = scoredCards.some(item => shouldProtect(item));
        const sortedCards = [...scoredCards]
            .filter(item => item.rerollButton && !shouldProtect(item))
            .sort((a, b) => a.score - b.score);

        for (const item of sortedCards) {
            return { button: item.rerollButton, score: item.score, name: item.name || 'unknown' };
        }

        const catchScope = document.getElementById('catch-screen') || document.getElementById('catch-choices');
        const globalReroll = hasProtectedVisible && !options.allowProtectedGlobal ? null : findRerollControlInScope(catchScope);
        if (globalReroll) {
            return { button: globalReroll, score: null, name: 'global reroll', isGlobal: true };
        }

        return null;
    }

    function getCatchRerollReason(team, bestScore, bestIsShiny, earlyAllowance, scoredCards = [], opponentProfile = null) {
        const bossTypes = getCurrentCatchBossTypes();
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const bestCandidate = [...scoredCards].sort((a, b) => b.score - a.score)[0] || null;
        const bestPassivePlanScore = bestCandidate?.sinnohPassivePlanScore || 0;
        const bestPowerScore = bestCandidate?.sinnohPowerScore || 0;
        const worstRerollable = [...scoredCards]
            .filter(item => item.rerollButton && !isProtectedCatchCandidate(item, bossTypes))
            .sort((a, b) => a.score - b.score)[0];

        if (worstRerollable && worstRerollable.score < CONFIG.CATCH_REROLL_ALWAYS_BELOW_SCORE) {
            return `weak rerollable card ${worstRerollable.score.toFixed(1)} below ${CONFIG.CATCH_REROLL_ALWAYS_BELOW_SCORE}`;
        }

        if (sinnohTraining.active &&
            catchRerollsThisEncounter < CONFIG.SINNOH_CATCH_SCOUT_ATTEMPTS &&
            !bestIsShiny &&
            !bestCandidate?.isLegendary &&
            bestPassivePlanScore < CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE &&
            bestPowerScore < CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE) {
            return `Sinnoh scouting: best passive/power scores ${bestPassivePlanScore.toFixed(1)}/${bestPowerScore.toFixed(1)} below strong target`;
        }

        if (bestIsShiny) return '';
        if (bestScore >= CONFIG.CATCH_REROLL_PROTECT_SCORE) return '';

        if (earlyAllowance === 'skip') {
            return `XP focus: best option ${bestScore.toFixed(1)} is not worth a team slot`;
        }

        if (bestScore < CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE) {
            return `best option ${bestScore.toFixed(1)} below accept score ${CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE}`;
        }

        if (shouldPrioritizeEarlyTraining(team, opponentProfile) && bestScore < CONFIG.CATCH_REROLL_XP_FOCUS_SCORE) {
            return `training core: best option ${bestScore.toFixed(1)} below XP-focus score ${CONFIG.CATCH_REROLL_XP_FOCUS_SCORE}`;
        }

        return '';
    }

    function tryRerollCatchOptions(scoredCards, reason, options = {}) {
        if (catchRerollsThisEncounter >= CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER) {
            return false;
        }

        const reroll = findCatchRerollButton(scoredCards, options);
        if (!reroll) return false;

        const catchScreen = document.getElementById('catch-screen') || document.getElementById('catch-choices');
        const cardsSnapshot = scoredCards.map(item => getRerollCardSignature(item)).join('|');
        const buttonSnapshot = foldText([
            reroll.button.id || '',
            reroll.button.getAttribute('class') || '',
            reroll.button.getAttribute('aria-label') || '',
            reroll.button.title || '',
            catchScreen ? (catchScreen.innerText || '').slice(0, 240) : ''
        ].join(' '));
        const signature = `${cardsSnapshot}::${buttonSnapshot}`;
        const now = Date.now();
        const signatureAttempts = catchRerollAttemptsBySignature[signature] || 0;
        const scoutTarget = options.scoutTarget || CONFIG.CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER;
        const canUseScoutStaleRetry = Boolean(options.allowStaleScoutRetry) &&
                                      catchRerollsThisEncounter < scoutTarget;
        const maxAttemptsForSignature = canUseScoutStaleRetry
            ? Math.max(CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_STATE, scoutTarget)
            : CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_STATE;

        if (signature === lastCatchRerollSignature && now - lastCatchRerollAt < CONFIG.CATCH_REROLL_COOLDOWN_MS) {
            return false;
        }
        if (signatureAttempts >= maxAttemptsForSignature) {
            log('warn', '🔄', `Reroll state did not change after ${signatureAttempts} attempt(s). Falling back to catch/skip.`);
            return false;
        }

        lastCatchRerollSignature = signature;
        lastCatchRerollAt = now;
        catchRerollAttemptsBySignature[signature] = signatureAttempts + 1;
        catchRerollsThisEncounter++;
        engineStats.rerolls++;

        const weakestLabel = reroll.score !== null ? ` | weakest card score: ${reroll.score.toFixed(1)}` : ' | global reroll';
        ensureRunTelemetry('catch-reroll');
        recordRunEvent('catch-reroll', {
            reason,
            target: reroll.name,
            score: reroll.score === null ? null : Number(reroll.score.toFixed(1)),
            attemptsThisEncounter: catchRerollsThisEncounter,
            stateAttempts: signatureAttempts + 1,
            staleScoutRetry: signatureAttempts > 0 && canUseScoutStaleRetry
        });
        log('info', '🔄', `${reason}${weakestLabel}`);
        triggerRealClick(reroll.button);
        return true;
    }

    // --- CATCH SCREEN (Smart Drafting) ---
    function handleCatchScreen() {
        const team = parseTeamStatus();
        const openTeamSlot = hasOpenTeamSlot(team);
        if (!currentMapKey) syncMapCaptureState();
        const cards = document.querySelectorAll('#catch-choices .poke-card');
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = getCurrentCatchBossTypes();
        const earlyExpansionClosed = shouldStopEarlyExpansion(team, opponentProfile);
        const bossPrepStatus = getBossPrepStatus(team, opponentProfile);
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);
        const teamAvgLevelBeforeCatch = getTeamAverageLevel(team);
        const expectedCatchCopies = getExpectedCatchCopiesFromOpenSlots(team);

        if (cards.length === 0) {
            const skipBtn = document.getElementById('btn-skip-catch');
            if (skipBtn) {
                ensureRunTelemetry('catch-screen');
                recordRunEvent('catch-skip', { reason: 'no-cards', bossPrepStatus });
                triggerRealClick(skipBtn);
            }
            return;
        }

        if (hasReachedMapCaptureCap()) {
            log('debug', '🐾', `Capture cap reached (${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP}); scoring first in case this is a premium/legendary reward.`);
        }

        let bestCard = null;
        let bestScore = -999;
        let bestIsShiny = false;
        let bestName = '';
        let bestCandidate = null;
        let scoredCards = [];

        cards.forEach(card => {
            const learnedInfo = learnPokemonInfoFromCard(card, 'catch-card');
            const nameEl = card.querySelector('.poke-card-name, .poke-name, [class*="name"]');
            if (!nameEl && !learnedInfo?.name) return;
            const name = learnedInfo?.name || nameEl.innerText.toLowerCase().trim();
            let types = learnedInfo?.types?.length ? [...learnedInfo.types] : [...getKnownPokemonTypes(name)];

            // Try to read types from the card DOM if not in database
            if (types.length === 0) {
                const typeBadges = card.querySelectorAll('.type-badge, .poke-type, [class*="type"]');
                typeBadges.forEach(badge => {
                    const t = badge.innerText.trim();
                    if (TYPES.includes(t)) types.push(t);
                });
            }

            const isShiny = isPokemonElementShiny(card);
            const isLegendary = isLegendaryPokemonName(name);

            const attackTypes = learnedInfo?.attackTypes?.length ? learnedInfo.attackTypes : getAttackTypesFromElement(card, types);
            const candidateLevel = learnedInfo?.level || parseLevelText(card.querySelector('.poke-level, .team-slot-lv, [class*="level"]')?.innerText || card.innerText || '');
            const bossMatchupScore = scoreCatchBossCounter(types, attackTypes, bossTypes);
            const grassSupportScore = getGrassSupportCatchScore(types, team);
            const duplicatePairScore = getDuplicatePairCatchScore(name, types, team, attackTypes, bossTypes, { expectedCatchCopies });
            const sinnohPassivePlanScore = scoreSinnohPassivePlanForTypes(types, team, { isShiny, opponentProfile });
            const sinnohPowerScore = scoreSinnohPowerCatchCandidate(name, types, team, {
                isShiny,
                attackTypes,
                level: candidateLevel,
                opponentProfile
            });
            let score = scoreCatchCandidate(name, types, team, isShiny, attackTypes, bossTypes, {
                expectedCatchCopies,
                level: candidateLevel,
                opponentProfile
            });
            score += sinnohPowerScore * 0.55;
            const tacticScore = getBotControlCatchScoreBonus({
                name,
                score,
                isShiny,
                isLegendary,
                types,
                attackTypes,
                bossMatchupScore,
                grassSupportScore,
                duplicatePairScore,
                sinnohPassivePlanScore,
                sinnohPowerScore
            }, team, bossTypes);
            score += tacticScore;
            score += scoreTraitPreviewFromCard(card);
            score += scorePokemonStats(learnedInfo?.currentStats || parseCardStats(card));
            const projectedAvgLevel = getProjectedAverageLevelAfterCatch(team, candidateLevel);
            const avgLevelDrop = projectedAvgLevel === null ? 0 : Math.max(0, teamAvgLevelBeforeCatch - projectedAvgLevel);
            const rerollButton = findRerollControlForCard(card);
            log('debug', '🔎', `Catch candidate: ${name} [${types.join('/')}] score=${score.toFixed(1)} reroll=${rerollButton ? 'yes' : 'no'}`);

            const candidate = {
                card,
                score,
                name,
                isShiny,
                isLegendary,
                rerollButton,
                types,
                attackTypes,
                bossMatchupScore,
                grassSupportScore,
                duplicatePairScore,
                sinnohPassivePlanScore,
                sinnohPowerScore,
                tacticScore,
                level: candidateLevel || 0,
                projectedAvgLevel: projectedAvgLevel === null ? null : Number(projectedAvgLevel.toFixed(1)),
                avgLevelDrop: Number(avgLevelDrop.toFixed(1))
            };
            scoredCards.push(candidate);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
                bestIsShiny = isShiny;
                bestName = name;
                bestCandidate = candidate;
            }
        });

        const earlyAllowance = getEarlyCatchAllowance(team, bestScore, bestIsShiny);
        const teamMaxLevel = Math.max(0, ...team.map(p => p.level || 0));
        const hasLowLevelForSwap = !openTeamSlot && team.some(p => (p.level || 0) < teamMaxLevel - 3);
        const bestIsLegendary = Boolean(bestCandidate?.isLegendary);
        const bestIsDuplicatePlan = Boolean(bestCandidate && bestCandidate.duplicatePairScore >= CONFIG.DUPLICATE_PAIR_PROTECT_SCORE);
        const bestIsPremiumCatch = Boolean(bestCandidate && isPremiumCatchCandidate(bestCandidate.score, bestCandidate.isShiny, bestCandidate.name));
        const bestIsExceptional = Boolean(bestCandidate && (bestCandidate.isShiny || bestIsLegendary || bestScore >= CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE));
        const bestIsDirectCounter = isDirectBossCounterCandidate(bestCandidate, bossTypes);
        const bestIsSinnohPowerPlan = Boolean(
            bestCandidate &&
            (bestCandidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE
        );
        const bestIsSinnohPassivePlan = Boolean(
            bestCandidate &&
            (
                (bestCandidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_CATCH_PROTECT_SCORE ||
                bestIsSinnohPowerPlan
            )
        );
        const bestIsStrongSinnohPassivePlan = Boolean(
            bestCandidate &&
            (
                (bestCandidate.sinnohPassivePlanScore || 0) >= CONFIG.SINNOH_PASSIVE_PLAN_STRONG_SCORE ||
                (bestCandidate.sinnohPowerScore || 0) >= CONFIG.SINNOH_POWER_CATCH_PROTECT_SCORE
            )
        );
        const hasVisibleShiny = scoredCards.some(candidate => candidate.isShiny);
        const earlyShinyScoutWindow = isEarlyShinyRerollWindow(team);
        const settledCatchWindow = isSettledCatchDecisionWindow(team);
        const bestWouldDiluteLevels = Boolean(
            bestCandidate &&
            earlyExpansionClosed &&
            bestCandidate.avgLevelDrop > CONFIG.EARLY_MAX_CATCH_AVG_LEVEL_DROP &&
            !bestIsExceptional &&
            !bestIsPremiumCatch &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan
        );
        const recordCatchSkip = (skipReason) => {
            ensureRunTelemetry('catch-screen');
            recordRunEvent('catch-skip', {
                reason: skipReason,
                bestName: bestName || 'unknown',
                bestScore: Number(bestScore.toFixed(1)),
                bestLevel: bestCandidate?.level || 0,
                bestProjectedAvgLevel: bestCandidate?.projectedAvgLevel ?? null,
                bestAvgLevelDrop: bestCandidate?.avgLevelDrop || 0,
                bestTypes: bestCandidate?.types || [],
                bestAttackTypes: bestCandidate?.attackTypes || [],
                bestGrassSupportScore: bestCandidate?.grassSupportScore || 0,
                bestDuplicatePairScore: bestCandidate?.duplicatePairScore || 0,
                bestSinnohPassivePlanScore: bestCandidate?.sinnohPassivePlanScore || 0,
                bestSinnohPowerScore: bestCandidate?.sinnohPowerScore || 0,
                bestTacticScore: bestCandidate?.tacticScore || 0,
                expectedCatchCopies,
                bossTypes,
                earlyExpansionClosed,
                bossPrepStatus,
                openTeamSlot,
                capturesThisMap,
                teamAvgLevelBeforeCatch: Number(teamAvgLevelBeforeCatch.toFixed(1)),
                isExceptional: bestIsExceptional,
                isLegendary: bestIsLegendary,
                isPremium: bestIsPremiumCatch,
                isDuplicatePlan: bestIsDuplicatePlan,
                isSinnohPowerPlan: bestIsSinnohPowerPlan,
                isSinnohPassivePlan: bestIsSinnohPassivePlan,
                isDirectCounter: bestIsDirectCounter
            });
            const skipBtn = document.getElementById('btn-skip-catch');
            if (skipBtn) triggerRealClick(skipBtn);
        };

        const earlyShinyScoutTarget = Math.min(
            CONFIG.EARLY_SHINY_REROLL_ATTEMPTS,
            CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER
        );
        if (openTeamSlot &&
            earlyShinyScoutWindow &&
            !hasVisibleShiny &&
            !bestIsLegendary &&
            catchRerollsThisEncounter < earlyShinyScoutTarget) {
            const scoutReason = `Early shiny scout ${catchRerollsThisEncounter + 1}/${earlyShinyScoutTarget}`;
            if (tryRerollCatchOptions(scoredCards, scoutReason, {
                allowStaleScoutRetry: true,
                scoutTarget: earlyShinyScoutTarget,
                allowProtectedGlobal: true,
                ignoreProtectedForReroll: true,
                preserveShiny: true
            })) {
                return;
            }
        }

        if (!openTeamSlot && hasReachedMapCaptureCap() && !bestIsPremiumCatch && !bestIsDirectCounter && !bestIsSinnohPassivePlan && !hasLowLevelForSwap) {
            log('info', '🐾', `Skipping catch — map capture cap reached (${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP}) and best is not premium (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}).`);
            recordCatchSkip('map-capture-cap');
            return;
        }

        const scoutTarget = sinnohTraining.active
            ? Math.min(CONFIG.SINNOH_CATCH_SCOUT_ATTEMPTS, CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER)
            : Math.min(CONFIG.CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER, CONFIG.CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER);
        const shouldScoutMore = openTeamSlot &&
            catchRerollsThisEncounter < scoutTarget &&
            !bestIsShiny &&
            !bestIsLegendary &&
            !bestIsStrongSinnohPassivePlan;
        if (shouldScoutMore) {
            const scoutReason = `Reroll scout ${catchRerollsThisEncounter + 1}/${scoutTarget}`;
            if (tryRerollCatchOptions(scoredCards, scoutReason, { allowStaleScoutRetry: true, scoutTarget })) {
                return; // Scout the refreshed choices before committing a team slot.
            }
        }

        const rerollReason = getCatchRerollReason(team, bestScore, bestIsShiny, earlyAllowance, scoredCards, opponentProfile);
        if (rerollReason && tryRerollCatchOptions(scoredCards, rerollReason)) {
            return; // Settle and let the next loop score the refreshed choices.
        }

        if (openTeamSlot &&
            earlyShinyScoutWindow &&
            !hasVisibleShiny &&
            bestCandidate &&
            bestScore < CONFIG.EARLY_NON_SHINY_MIN_ACCEPT_SCORE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan) {
            log('info', '🐾', `Skipping early non-shiny low-value catch after scouting — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)} below ${CONFIG.EARLY_NON_SHINY_MIN_ACCEPT_SCORE}.`);
            recordCatchSkip('early-non-shiny-low-value');
            return;
        }

        if (openTeamSlot &&
            settledCatchWindow &&
            bestCandidate &&
            bestScore < CONFIG.SETTLED_CATCH_MIN_ACCEPT_SCORE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsDuplicatePlan &&
            !bestIsSinnohPassivePlan) {
            log('info', '🐾', `Skipping settled-run low-value catch — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)} below ${CONFIG.SETTLED_CATCH_MIN_ACCEPT_SCORE}.`);
            recordCatchSkip('settled-run-low-value');
            return;
        }

        if (sinnohTraining.active &&
            getAliveTeam(team).length >= CONFIG.SINNOH_TRAINING_CORE_TEAM_SIZE &&
            !bestIsPremiumCatch &&
            !bestIsExceptional &&
            !bestIsDirectCounter &&
            !bestIsSinnohPassivePlan) {
            log('info', 'sinnoh', `Skipping catch for Sinnoh carry training - XP/MT/passive plan have priority (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}).`);
            recordCatchSkip('sinnoh-carry-training');
            return;
        }

        if (openTeamSlot && bestCandidate && !shouldBuildCoreTeam(team)) {
            const isExceptional = bestIsExceptional;
            const isPremium = bestIsPremiumCatch;
            const isDuplicatePlan = bestIsDuplicatePlan;
            const isSinnohPassivePlan = bestIsSinnohPassivePlan;
            const isBossRelevant = isBossRelevantCatchCandidate(bestCandidate, bossTypes);
            const isDirectCounter = bestIsDirectCounter;
            const fillingEarlyRoster = getAliveTeam(team).length < CONFIG.EARLY_OPTIONAL_TEAM_SIZE &&
                                       bestScore >= CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE;
            const goodGeneralValue = !earlyExpansionClosed &&
                                     !shouldPrioritizeEarlyTraining(team, opponentProfile) &&
                                     !hasReachedMapCaptureCap() &&
                                     bestScore >= CONFIG.CATCH_REROLL_MIN_ACCEPT_SCORE;
            const shouldAcceptRosterFill = fillingEarlyRoster && (!hasReachedMapCaptureCap() || isPremium || bestScore >= CONFIG.EARLY_EXCEPTIONAL_CATCH_SCORE);
            const canBreakEarlyRosterCap = !earlyExpansionClosed || isExceptional || isPremium || isDirectCounter || isDuplicatePlan || isSinnohPassivePlan;

            if (bestWouldDiluteLevels || !canBreakEarlyRosterCap || (!isPremium && !isBossRelevant && !goodGeneralValue && !shouldAcceptRosterFill && !isExceptional && !isDirectCounter && !isDuplicatePlan && !isSinnohPassivePlan)) {
                const skipReason = bestWouldDiluteLevels
                    ? 'would dilute levels'
                    : earlyExpansionClosed && !isExceptional && !isPremium && !isDirectCounter && !isDuplicatePlan && !isSinnohPassivePlan
                    ? 'early roster closed'
                    : hasReachedMapCaptureCap()
                    ? 'already caught this map'
                    : shouldPrioritizeEarlyTraining(team, opponentProfile)
                        ? 'leveling focus'
                        : 'no strong boss value';
                log('info', '🐾', `Skipping catch for ${skipReason} — best: ${bestName || 'unknown'} ${bestScore.toFixed(1)}`);
                recordCatchSkip(skipReason);
                return;
            }
        }

        if (!openTeamSlot && hasLowLevelForSwap && bestCandidate?.level) {
            const minUsefulSwapLevel = Math.max(1, teamMaxLevel - CONFIG.EARLY_LOW_LEVEL_SWAP_GAP);
            if (bestCandidate.level < minUsefulSwapLevel && !bestIsPremiumCatch && !bestIsExceptional && !bestIsDirectCounter && !bestIsSinnohPassivePlan) {
                log('info', '🐾', `Skipping catch — replacement too low level (${bestCandidate.level} < ${minUsefulSwapLevel}).`);
                recordCatchSkip('replacement-too-low-level');
                return;
            }
        }

        if (!openTeamSlot && earlyAllowance === 'skip' && !hasLowLevelForSwap && !bestIsPremiumCatch && !bestIsSinnohPassivePlan) {
            log('info', '🐾', `Skipping catch for XP focus — core team needs levels (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)})`);
            recordCatchSkip('xp-focus');
            return;
        }

        // If team is full (6) and no candidate scores well, skip
        if (!openTeamSlot && bestScore < 2 && !hasLowLevelForSwap && !bestIsPremiumCatch && !bestIsSinnohPassivePlan) {
            log('info', '🐾', `Skipping catch — no good candidates (best: ${bestScore.toFixed(1)})`);
            recordCatchSkip('weak-candidate');
            return;
        }

        if (bestCard) {
            const catchReason = bestIsLegendary
                ? 'Catching legendary/masterball reward'
                : bestIsDuplicatePlan
                ? 'Catching duplicate-pair target'
                : bestIsSinnohPowerPlan
                ? 'Catching Sinnoh run-power target'
                : bestIsSinnohPassivePlan
                ? 'Catching Sinnoh passive-plan target'
                : (openTeamSlot ? 'Catching useful open-slot target' : 'Catching Pokemon');
            ensureRunTelemetry('catch-screen');
            recordRunEvent('catch-decision', {
                action: 'catch',
                reason: catchReason,
                name: bestName || 'unknown',
                score: Number(bestScore.toFixed(1)),
                types: bestCandidate?.types || [],
                attackTypes: bestCandidate?.attackTypes || [],
                bossTypes,
                grassSupportScore: bestCandidate?.grassSupportScore || 0,
                duplicatePairScore: bestCandidate?.duplicatePairScore || 0,
                sinnohPassivePlanScore: bestCandidate?.sinnohPassivePlanScore || 0,
                sinnohPowerScore: bestCandidate?.sinnohPowerScore || 0,
                tacticScore: bestCandidate?.tacticScore || 0,
                expectedCatchCopies,
                level: bestCandidate?.level || 0,
                projectedAvgLevel: bestCandidate?.projectedAvgLevel ?? null,
                avgLevelDrop: bestCandidate?.avgLevelDrop || 0,
                earlyExpansionClosed,
                bossPrepStatus,
                isExceptional: bestIsExceptional,
                isLegendary: bestIsLegendary,
                isPremium: bestIsPremiumCatch,
                isDuplicatePlan: bestIsDuplicatePlan,
                isSinnohPowerPlan: bestIsSinnohPowerPlan,
                isSinnohPassivePlan: bestIsSinnohPassivePlan,
                isDirectCounter: bestIsDirectCounter,
                teamAvgLevelBeforeCatch: Number(teamAvgLevelBeforeCatch.toFixed(1)),
                openTeamSlot,
                capturesThisMap
            });
            log('info', '🐾', `${catchReason} (best: ${bestName || 'unknown'} ${bestScore.toFixed(1)})`);
            triggerRealClick(bestCard);
            capturesThisMap++;
            engineStats.catches++;
        }
    }

    // --- ITEM SCREEN (Ranked Selection) ---
    function handleItemScreen() {
        const cards = document.querySelectorAll('#item-choices .item-card');
        if (cards.length === 0) return;

        const team = parseTeamStatus();
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();
        const bossType = opponentProfile || (bossTypes.length > 0 ? bossTypes : null);
        let bestCard = null;
        let bestScore = -1;
        let bestItemName = '';

        cards.forEach(card => {
            const name = getItemNameFromElement(card);
            if (!name) return;
            const tier = ITEM_TIERS[name] || 'D';
            const score = scoreItemForTeam(name, team, bossType);

            log('debug', '🎒', `Item: ${name} → Tier ${tier} (${score})`);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
                bestItemName = name;
            }
        });

        if (bestCard) {
            lastChosenItemName = bestItemName;
            ensureRunTelemetry('item-screen');
            recordRunEvent('item-choice', {
                item: bestItemName,
                score: Number(bestScore.toFixed(1)),
                opponent: compactOpponentProfile(opponentProfile),
                team: compactTeamSnapshot(team, bossType)
            });
            log('info', '🎒', `Picking item (score: ${bestScore})`);
            triggerRealClick(bestCard);
            engineStats.items++;
        } else {
            // Fallback: pick first
            triggerRealClick(cards[0]);
        }
    }

    // --- PASSIVE SCREEN (Battle Tower passive items) ---
    function handlePassiveScreen() {
        const cards = document.querySelectorAll('#passive-choices .item-card, #passive-choices .passive-card');
        if (cards.length === 0) return;

        const team = parseTeamStatus();
        const opponentProfile = detectNextOpponentProfile();
        const teamProfile = getPassiveTeamProfile(team, opponentProfile);
        let bestCard = null;
        let bestScore = -1;

        cards.forEach(card => {
            const score = scorePassiveCard(card, team, opponentProfile);

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        });

        log('info', '🧩', `Picking passive (score: ${bestScore.toFixed(1)})`);
        ensureRunTelemetry('passive-screen');
        recordRunEvent('passive-choice', {
            choice: (bestCard?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100),
            score: Number(bestScore.toFixed(1)),
            opponent: compactOpponentProfile(opponentProfile),
            teamTypes: getTeamTypes(team),
            hasShiny: teamProfile.hasShiny,
            weakCore: teamProfile.weakCore,
            bossCoveragePoor: teamProfile.bossCoveragePoor,
            uncoveredBossTypes: teamProfile.uncoveredBossTypes,
            bestBst: teamProfile.bestBst
        });
        triggerRealClick(bestCard || cards[0]);
    }

    // --- ITEM EQUIP MODAL ---
    function handleItemEquipModal() {
        const modal = getActiveItemModal();
        if (!modal) return;

        const rows = Array.from(modal.querySelectorAll('.equip-pokemon-row'));
        const team = parseTeamStatus();
        const isUsableModal = modal.id === 'usable-item-modal';
        if (rows.length === 0) return;

        // Identify the item name being equipped to check its score/tier
        const titleEl = modal.querySelector('.equip-item-name, [class*="item-name"], .modal-title');
        let equipItemName = '';
        if (titleEl) {
            equipItemName = normalizeItemName(titleEl.innerText);
        } else {
            const img = modal.querySelector('img[src*="items/"]');
            if (img) {
                const src = img.src || '';
                const match = src.match(/\/items\/([^\/\.]+)/);
                if (match) {
                    equipItemName = normalizeItemName(match[1]);
                }
            }
        }
        if (!equipItemName && lastChosenItemName) {
            equipItemName = lastChosenItemName;
        }
        lastChosenItemName = '';

        const equipItemTier = ITEM_TIERS[equipItemName] || 'D';
        const equipItemScore = TIER_SCORE[equipItemTier] || 10;
        const bossTypes = detectBossTypes();
        const bossType = bossTypes.length > 0 ? bossTypes : null;
        const sinnohTraining = getSinnohTowerTrainingContext(team, bossType);

        log('info', '🎒', `${isUsableModal ? 'Using' : 'Equipping'} item: [${equipItemName}] (Tier ${equipItemTier}, Score ${equipItemScore})`);

        if (!isUsableModal && isLowValueHeldItem(equipItemName)) {
            const bagBtn = document.getElementById('btn-equip-to-bag');
            if (bagBtn) {
                log('info', '🎒', `Low-value held item [${equipItemName}] is not worth equipping. Sending to bag.`);
                markItemKeptInBag(equipItemName);
                triggerRealClick(bagBtn);
                return;
            }
        }

        if (isUsableModal &&
            equipItemName === 'tm normal' &&
            sinnohTraining.active &&
            !sinnohTraining.needsTm) {
            const cancelBtn = document.getElementById('btn-cancel-use') || document.getElementById('btn-equip-cancel');
            if (cancelBtn && isVisible(cancelBtn)) {
                log('info', 'tm', `Skipping MT Normal: carry already has max move tier (${sinnohTraining.carryMoveTier + 1}).`);
                recordRunEvent('item-skip', {
                    item: equipItemName,
                    reason: 'sinnoh-carry-max-move-tier',
                    carry: sinnohTraining.carry ? sinnohTraining.carry.name : null,
                    carryMoveTier: sinnohTraining.carryMoveTier
                });
                triggerRealClick(cancelBtn);
                return;
            }
        }

        const candidates = rows.map((row, rowPosition) => {
            const rowIndex = Number.parseInt(row.getAttribute('data-idx'), 10);
            const teamIdx = Number.isNaN(rowIndex) ? rowPosition : rowIndex;
            const unit = team[teamIdx] || parseModalRowUnit(row, teamIdx);
            return {
                row,
                target: getPokemonRowActionTarget(row),
                teamIdx,
                unit
            };
        }).filter(candidate => {
            if (!candidate.target || !candidate.unit) return false;
            if (isUsableModal && equipItemName === 'sacred ash') return true;
            return !candidate.unit.isFainted;
        });

        if (candidates.length === 0) {
            const fallbackBtn = document.getElementById(isUsableModal ? 'btn-cancel-use' : 'btn-equip-cancel') ||
                                document.getElementById('btn-equip-to-bag');
            if (fallbackBtn && isVisible(fallbackBtn)) {
                log('warn', '🎒', `No valid target for [${equipItemName}]. Closing item modal.`);
                triggerRealClick(fallbackBtn);
            }
            return;
        }

        const boostType = getItemBoostType(equipItemName);
        if (!isUsableModal && boostType && !candidates.some(candidate => hasMatchingAttackForItem(candidate.unit, equipItemName))) {
            const bagBtn = document.getElementById('btn-equip-to-bag');
            if (bagBtn) {
                log('info', '🎒', `No real ${boostType} attacker for [${equipItemName}]. Sending to bag.`);
                markItemKeptInBag(equipItemName);
                triggerRealClick(bagBtn);
                return;
            }
        }

        // Find the best candidate unit to equip this item to:
        // - Priority 1: Alive units with NO item currently equipped (to fill slots first)
        // - Priority 2: Swap/replace if the new item is better than their current item
        let bestCandidate = null;
        let bestTargetScore = -999;
        const teamMainCarry = getMainCarry(team);
        const itemIsCarryPreferred = !isUsableModal && isMainCarryPreferredHeldItem(equipItemName);
        const mainCarryWouldLikeItem = Boolean(
            teamMainCarry &&
            itemIsCarryPreferred &&
            (
                !teamMainCarry.heldItem ||
                !isMainCarryPreferredHeldItem(teamMainCarry.heldItem) ||
                scoreHeldItemForPokemon(teamMainCarry, equipItemName, bossType) >
                    scoreHeldItemForPokemon(teamMainCarry, teamMainCarry.heldItem, bossType) + 8
            )
        );

        candidates.forEach(candidate => {
            const p = candidate.unit;

            let score = p.hp / 20 + getPokemonCarryScore(p) / 8;
            const candidateIsMainCarry = isMainCarryUnit(p);
            const mainCarryHealingLock = !isUsableModal &&
                                         candidateIsMainCarry &&
                                         p.heldItem &&
                                         isHealingItem(p.heldItem) &&
                                         !isMainCarryPreferredHeldItem(equipItemName);
            const healingUpgradeForCarry = !isUsableModal &&
                                           candidateIsMainCarry &&
                                           isHealingItem(equipItemName) &&
                                           (!p.heldItem || !isHealingItem(p.heldItem));
            if (mainCarryWouldLikeItem) {
                score += candidateIsMainCarry
                    ? CONFIG.MAIN_CARRY_ITEM_RESERVE_BONUS
                    : -CONFIG.MAIN_CARRY_ITEM_RESERVE_PENALTY;
            }

            if (isUsableModal) {
                // For consumables, the game decides valid targets via disabled rows.
                score += scoreConsumableTarget(p, equipItemName);
                if ((equipItemName === 'tm normal' || equipItemName === 'rare candy') && sinnohTraining.active) {
                    const isCarryTarget = Boolean(
                        sinnohTraining.carry &&
                        (
                            candidate.teamIdx === sinnohTraining.carry.index ||
                            getPokemonIdentityKey(p.name) === sinnohTraining.carryKey
                        )
                    );
                    const shouldFeedCarry = equipItemName === 'rare candy' || sinnohTraining.needsTm;
                    score += shouldFeedCarry
                        ? (isCarryTarget ? CONFIG.SINNOH_TM_TARGET_BONUS : -CONFIG.SINNOH_NON_CARRY_TM_TARGET_PENALTY)
                        : -CONFIG.SINNOH_NON_CARRY_TM_TARGET_PENALTY;
                }
            } else if (!p.heldItem) {
                const newScore = scoreHeldItemForPokemon(p, equipItemName, bossType);
                score += newScore;
                if (healingUpgradeForCarry) score += CONFIG.MAIN_CARRY_HEAL_KEEP_MARGIN;
                if (boostType && !hasMatchingAttackForItem(p, equipItemName)) score -= 220;
                if (candidate.teamIdx === 0 && newScore > 0) score += 35; // Keep the first fighter itemized when possible.
                if (newScore > 20) score += 45; // Fill empty slots only when the item actually helps.
            } else {
                const currentScore = scoreHeldItemForPokemon(p, p.heldItem, bossType);
                const newScore = scoreHeldItemForPokemon(p, equipItemName, bossType);
                
                if (mainCarryHealingLock) {
                    score -= 500;
                } else if (healingUpgradeForCarry || newScore > currentScore + 12) {
                    score += newScore - currentScore; // Upgrade value
                    if (healingUpgradeForCarry) score += CONFIG.MAIN_CARRY_HEAL_KEEP_MARGIN;
                } else {
                    score -= 150; // Heavy penalty for downgrades/sidegrades
                }
            }

            if (score > bestTargetScore) {
                bestTargetScore = score;
                bestCandidate = candidate;
            }
        });

        // Decide: equip or send to bag (if it's a downgrade for all current holders)
        if (bestCandidate) {
            const targetUnit = bestCandidate.unit;
            const currentScore = targetUnit.heldItem ? scoreHeldItemForPokemon(targetUnit, targetUnit.heldItem, bossType) : 0;
            const newTargetScore = scoreHeldItemForPokemon(targetUnit, equipItemName, bossType);

            if (!isUsableModal &&
                isMainCarryUnit(targetUnit) &&
                targetUnit.heldItem &&
                isHealingItem(targetUnit.heldItem) &&
                !isMainCarryPreferredHeldItem(equipItemName)) {
                const bagBtn = document.getElementById('btn-equip-to-bag');
                if (bagBtn) {
                    log('info', '🎒', `Keeping healing item [${targetUnit.heldItem}] on main carry [${targetUnit.name}]. Sending [${equipItemName}] to bag.`);
                    markItemKeptInBag(equipItemName);
                    triggerRealClick(bagBtn);
                    return;
                }
            }
            
            if (!isUsableModal && !targetUnit.heldItem && newTargetScore <= 10) {
                const bagBtn = document.getElementById('btn-equip-to-bag');
                if (bagBtn) {
                    log('info', '🎒', `Item [${equipItemName}] is not useful for any empty slot. Sending to bag.`);
                    markItemKeptInBag(equipItemName);
                    triggerRealClick(bagBtn);
                    return;
                }
            }

            if (!isUsableModal && targetUnit.heldItem && newTargetScore <= currentScore + 12) {
                const bagBtn = document.getElementById('btn-equip-to-bag');
                if (bagBtn) {
                    log('info', '🎒', `Item [${equipItemName}] is not an upgrade. Sending to bag.`);
                    markItemKeptInBag(equipItemName);
                    triggerRealClick(bagBtn);
                    return;
                }
            }
            
            log('info', '🎒', `${isUsableModal ? 'Using' : 'Assigning'} [${equipItemName}] on [${targetUnit.name}] (Replacing: [${targetUnit.heldItem || 'none'}])`);
            const targetIsSinnohCarry = Boolean(
                isUsableModal &&
                equipItemName === 'tm normal' &&
                sinnohTraining.active &&
                sinnohTraining.carry &&
                (
                    bestCandidate.teamIdx === sinnohTraining.carry.index ||
                    getPokemonIdentityKey(targetUnit.name) === sinnohTraining.carryKey
                )
            );
            if (targetIsSinnohCarry && sinnohTraining.carryKey) {
                const nextTier = Math.min(
                    CONFIG.SINNOH_TM_MAX_MOVE_TIER,
                    Math.max(sinnohTraining.carryMoveTier, -1) + 1
                );
                sinnohCarryKnownTmTiers[sinnohTraining.carryKey] = nextTier;
            }
            recordRunEvent('item-target', {
                item: equipItemName,
                action: isUsableModal ? 'use' : 'equip',
                target: targetUnit.name,
                targetIndex: bestCandidate.teamIdx,
                targetScore: Number(bestTargetScore.toFixed(1)),
                sinnohTraining: sinnohTraining.active ? {
                    carry: sinnohTraining.carry ? sinnohTraining.carry.name : null,
                    carryMoveTier: sinnohTraining.carryMoveTier,
                    observedCarryMoveTier: sinnohTraining.observedCarryMoveTier,
                    rememberedCarryMoveTier: sinnohTraining.carryKey ? (sinnohCarryKnownTmTiers[sinnohTraining.carryKey] ?? sinnohTraining.rememberedCarryMoveTier) : null,
                    needsTm: sinnohTraining.needsTm,
                    needsOffense: sinnohTraining.needsOffense,
                    needsSpeed: sinnohTraining.needsSpeed,
                    targetIsCarry: targetIsSinnohCarry
                } : null
            });
            triggerRealClick(bestCandidate.target);
            return;
        }

        // Fallback
        const firstTarget = candidates[0].target;
        if (firstTarget) triggerRealClick(firstTarget);
    }

    // --- EVOLUTION OVERLAY ---
    function handleEvoOverlay() {
        const overlay = document.getElementById('evo-overlay');
        if (overlay) triggerRealClick(overlay);
    }

    // --- EEVEE CHOICE OVERLAY ---
    function handleEeveeChoice() {
        const overlay = document.getElementById('eevee-choice-overlay');
        if (!overlay) return;

        const choices = overlay.querySelectorAll('#eevee-choices > *');
        if (choices.length === 0) return;

        // If user has a specific preference, use it
        if (CONFIG.EEVEE_EVOLUTION_PREFERENCE !== 'auto') {
            const pref = CONFIG.EEVEE_EVOLUTION_PREFERENCE.toLowerCase();
            for (const choice of choices) {
                if (choice.innerText.toLowerCase().includes(pref)) {
                    log('info', '🦊', `Eevee → ${CONFIG.EEVEE_EVOLUTION_PREFERENCE} (user preference)`);
                    triggerRealClick(choice);
                    return;
                }
            }
        }

        // Auto mode: pick based on team needs
        const team = parseTeamStatus();
        const teamTypes = getTeamTypes(team);
        const traitCounts = getTeamTraitCounts(team);

        let bestChoice = null;
        let bestScore = -999;

        choices.forEach(choice => {
            const text = choice.innerText.toLowerCase().trim();
            let evoName = null;
            let evoType = null;

            for (const [name, type] of Object.entries(EEVEE_EVOLUTIONS)) {
                if (text.includes(name.toLowerCase())) {
                    evoName = name;
                    evoType = type;
                    break;
                }
            }

            if (!evoType) return;

            let score = 0;

            // Trait synergy
            const traitInfo = TRAIT_DATA[evoType];
            if (traitInfo) {
                const tierVal = TRAIT_TIER_VALUE[traitInfo.tier] || 1;
                const current = traitCounts[evoType] || 0;
                if (current === 1 || current === 3 || current === 5) score += tierVal * 3;
                else score += tierVal;
            }

            // Type coverage gap fill
            if (!teamTypes.includes(evoType)) score += 8;

            // Boss counter
            const bossTypes = detectBossTypes();
            if (bossTypes.length > 0) {
                score += getAttackCoverageScore([evoType], bossTypes) * 2;
            }

            log('debug', '🦊', `Eevee option: ${evoName} (${evoType}) score=${score}`);

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        if (bestChoice) {
            log('info', '🦊', `Eevee evolution chosen (score: ${bestScore})`);
            triggerRealClick(bestChoice);
        } else {
            triggerRealClick(choices[0]);
        }
    }

    // --- SWAP SCREEN ---
    function handleSwapScreen() {
        const team = parseTeamStatus();
        const swapChoices = document.querySelectorAll('#swap-choices .poke-card, #swap-choices .team-slot');
        const incoming = document.querySelector('#swap-incoming .poke-card');

        if (!incoming) {
            // If there's no visible incoming, try cancel
            const cancelBtn = document.getElementById('btn-cancel-swap');
            if (cancelBtn) triggerRealClick(cancelBtn);
            return;
        }

        // Read the incoming Pokémon info
        const incomingNameEl = incoming.querySelector('.poke-card-name, .poke-name, [class*="name"]');
        const incomingName = incomingNameEl ? incomingNameEl.innerText.toLowerCase().trim() : '';
        const incomingTypes = getKnownPokemonTypes(incomingName);
        const incomingAttackTypes = getAttackTypesFromElement(incoming, incomingTypes);
        const incomingIsShiny = isPokemonElementShiny(incoming);
        const incomingScore = scoreCatchCandidate(incomingName, incomingTypes, team, incomingIsShiny, incomingAttackTypes) +
                              getDuplicateIncomingSwapScore(incomingName, team);

        // Find the weakest team member
        let weakestIdx = -1;
        let weakestScore = 999;

        if (swapChoices.length > 0) {
            swapChoices.forEach((choice, idx) => {
                const nameEl = choice.querySelector('.poke-card-name, .team-slot-name, [class*="name"]');
                if (!nameEl) return;
                const name = nameEl.innerText.toLowerCase().trim();
                const types = getKnownPokemonTypes(name);
                const attackTypes = getAttackTypesFromElement(choice, types);
                const teamUnit = team[idx] || { index: idx, name, types, attackTypes, isFainted: false };
                teamUnit.isShiny = Boolean(teamUnit.isShiny || isPokemonElementShiny(choice));
                const lockBonus = isBotControlLockedUnit(teamUnit) ? CONFIG.BOT_CONTROL_LOCK_KEEP_BONUS : 0;
                const score = scoreCatchCandidate(name, types, team, teamUnit.isShiny, attackTypes) +
                              getDuplicatePairReplacementProtectionScore(teamUnit, team, incomingName) +
                              getShinyReplacementKeepScore(teamUnit, team) +
                              lockBonus;
                if (score < weakestScore) {
                    weakestScore = score;
                    weakestIdx = idx;
                }
            });
        }

        // Swap if incoming is significantly better
        if (incomingScore > weakestScore + 2 && weakestIdx >= 0) {
            log('info', '🔄', `Swapping: ${incomingName} (${incomingScore.toFixed(1)}) replaces weakest (${weakestScore.toFixed(1)})`);
            triggerRealClick(swapChoices[weakestIdx]);
            engineStats.swaps++;
        } else {
            log('info', '🔄', `Keeping team as-is (incoming: ${incomingScore.toFixed(1)} vs weakest: ${weakestScore.toFixed(1)})`);
            const cancelBtn = document.getElementById('btn-cancel-swap');
            if (cancelBtn) triggerRealClick(cancelBtn);
        }
    }

    // --- TRADE SCREEN ---
    function handleTradeScreen() {
        const team = parseTeamStatus();
        evaluateTrade(team);
    }

    // --- SHINY SCREEN ---
    function handleShinyScreen() {
        const shinyContent = document.getElementById('shiny-content');
        if (shinyContent) {
            const btn = shinyContent.querySelector('button, .btn-primary, [class*="btn"]');
            if (btn) triggerRealClick(btn);
            else triggerRealClick(shinyContent);
        }
    }

    // --- BADGE SCREEN ---
    function handleBadgeScreen() {
        const nextBtn = document.getElementById('btn-next-map');
        if (nextBtn) triggerRealClick(nextBtn);
    }

    // --- TRANSITION SCREEN ---
    function handleTransitionScreen() {
        // Transition screens auto-resolve, but click to speed up
        const screen = document.getElementById('transition-screen');
        if (screen) triggerRealClick(screen);
    }

    // --- STAT BUFF SCREEN (EV Allocation) ---
    function handleStatBuffScreen() {
        const choices = document.querySelectorAll('#stat-buff-choices .stat-card, #stat-buff-choices > *');
        if (choices.length === 0) return;

        const team = parseTeamStatus();
        const carry = getPrimaryCarry(team);
        const preferSpecial = carry ? getOffenseRole(carry) === 'special' : true;
        const opponentProfile = detectNextOpponentProfile();
        const sinnohTraining = getSinnohTowerTrainingContext(team, opponentProfile);

        let bestChoice = null;
        let bestScore = -999;

        choices.forEach(choice => {
            const text = foldText(choice.innerText || '');
            const specialAttack = Boolean(text.match(/sp\.?\s*atk|sp atk|special attack|spa|ataque especial|ataque esp|atq esp|atk esp/));
            const specialDefense = Boolean(text.match(/sp\.?\s*def|sp def|special defense|defensa especial|def esp/));
            const plainAttack = Boolean(text.match(/(^|[^a-z])(atk|attack|ataque|atq)([^a-z]|$)/)) && !specialAttack;
            const speed = Boolean(text.match(/speed|velocidad|spe|(^|[^a-z])spd([^a-z]|$)/)) && !specialDefense;
            const hp = Boolean(text.match(/(^|[^a-z])(hp|ps)([^a-z]|$)|hit points|salud|vida/));
            const defense = Boolean(text.match(/defense|defensa|(^|[^a-z])def([^a-z]|$)/)) && !specialDefense;

            let score = 0;
            if (preferSpecial) {
                if (specialAttack) score += 140;
                if (plainAttack) score += 85;
            } else {
                if (plainAttack) score += 140;
                if (specialAttack) score += 85;
            }
            if (speed) score += 50;
            if (hp) score += 25;
            if (defense || specialDefense) score += 8;
            if (text.match(/random|azar|aleator/)) score -= 20;
            if (sinnohTraining.active) {
                if (preferSpecial) {
                    if (specialAttack) score += 120;
                    if (plainAttack) score += 45;
                } else {
                    if (plainAttack) score += 120;
                    if (specialAttack) score += 45;
                }
                if (sinnohTraining.needsOffense) {
                    if (preferSpecial) {
                        if (specialAttack) score += 180;
                        if (plainAttack) score += 70;
                    } else {
                        if (plainAttack) score += 180;
                        if (specialAttack) score += 70;
                    }
                }
                if (speed) score += sinnohTraining.needsSpeed ? 130 : 55;
                if (hp) score += 20;
                if (defense || specialDefense) score += 34;
                if (text.match(/random|azar|aleator/)) score -= 35;
            }

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        ensureRunTelemetry('stat-buff-screen');
        recordRunEvent('stat-buff-choice', {
            carry: carry ? carry.name : null,
            offenseRole: carry ? getOffenseRole(carry) : null,
            choice: (bestChoice?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            score: bestScore,
            sinnohTraining: sinnohTraining.active ? {
                carryMoveTier: sinnohTraining.carryMoveTier,
                needsTm: sinnohTraining.needsTm,
                needsOffense: sinnohTraining.needsOffense,
                needsSpeed: sinnohTraining.needsSpeed
            } : null
        });
        log('info', '📈', `Stat buff: picking for ${carry ? carry.name : 'team'} (${carry ? getOffenseRole(carry) : 'auto'}, score ${bestScore}).`);
        triggerRealClick(bestChoice || choices[0]);
    }

    // --- ELITE PREP SCREEN ---
    function handleElitePrepScreen() {
        // 1. Reorder team for type advantage
        const opponentProfile = detectNextOpponentProfile();
        const bossTypes = opponentProfile ? getOpponentTeamTypes(opponentProfile) : detectBossTypes();

        // Try reading from the elite prep enemy section
        let detectedTypes = [...bossTypes];
        if (detectedTypes.length === 0) {
            const enemyTraits = document.getElementById('elite-prep-enemy-traits');
            if (enemyTraits) {
                const traitBadges = enemyTraits.querySelectorAll('.trait-badge, [class*="trait"]');
                traitBadges.forEach(badge => {
                    const t = badge.innerText.trim();
                    if (TYPES.includes(t) && !detectedTypes.includes(t)) detectedTypes.push(t);
                });
            }
        }
        const prepProfile = opponentProfile || makeOpponentProfile({ name: 'elite prep', types: detectedTypes, sourceConfidence: 'elite-prep-types' });
        const detectedTypeLabel = getOpponentProfileLabel(prepProfile);

        const team = parseTeamStatus();
        if (team.length > 0) {
            const prepStatus = getBossPrepStatus(team, prepProfile);
            if (ensureLeadMeetsBattleLevel(team, prepStatus, prepProfile)) return;
            if (optimizeTeamOrder(team, prepProfile, prepStatus)) return;

            const bagItems = getBagItems();
            const bestBagItem = pickBestBagItemForTeam(bagItems, team, prepProfile);
            if (bestBagItem && shouldEquipBagItem(bestBagItem.name, team, prepProfile)) {
                log('info', '🎒', `Elite prep: equipping/using [${bestBagItem.name}] before FIGHT.`);
                lastChosenItemName = bestBagItem.name;
                triggerRealClick(bestBagItem.element);
                return;
            }

            if (ensureLeadHasHeldItem(team, prepProfile)) return;
        }

        const playerSide = document.getElementById('elite-prep-player-side');
        if (playerSide && detectedTypes.length > 0) {
            const slots = Array.from(playerSide.querySelectorAll('.poke-card, .battle-poke'))
                .filter(slot => isVisible(slot) && !slot.querySelector('.poke-card, .battle-poke'));
            if (slots.length > 1) {
                // Find best counter among the visible Pokémon
                let bestSlot = null;
                let bestScore = -999;

                slots.forEach((slot, idx) => {
                    const nameEl = slot.querySelector('[class*="name"]');
                    if (!nameEl) return;
                    const name = nameEl.innerText.toLowerCase().trim();
                    const types = getKnownPokemonTypes(name);
                    const attackTypes = getAttackTypesFromElement(slot, types);
                    const unit = { name, types, attackTypes, hp: 100, level: 0, isFainted: false, heldItem: null };
                    const score = scoreLeadCandidate(unit, prepProfile);

                    if (score > bestScore) {
                        bestScore = score;
                        bestSlot = { slot, idx };
                    }
                });

                if (bestSlot && bestSlot.idx !== 0) {
                    log('info', '⚔️', `Elite prep: reordering for ${detectedTypeLabel}`);
                    if (tryTeamReorder(bestSlot.slot, slots[0], null, null, 'elite-prep-fallback')) {
                        return; // Let the reorder settle before clicking fight.
                    }
                }
            }
        }

        // 2. Click the FIGHT button
        const fightBtn = document.getElementById('btn-elite-prep-continue') || document.querySelector('.elite-prep-fight-btn');
        if (fightBtn && isEnabledActionControl(fightBtn)) {
            ensureRunTelemetry('elite-prep-screen');
            recordRunEvent('fight-start', {
                opponent: compactOpponentProfile(prepProfile),
                detectedTypeLabel,
                team: compactTeamSnapshot(team, prepProfile)
            });
            currentRunTelemetry.best.battles = Math.max(currentRunTelemetry.best.battles, getRunBattleCount(currentRunTelemetry));
            log('info', '⚔️', 'Elite prep: clicking FIGHT!');
            triggerRealClick(fightBtn);
        }
    }

    // --- GAME OVER SCREEN ---
    function handleGameOverScreen() {
        const retryBtn = document.getElementById('btn-retry');
        if (retryBtn) {
            finalizeRunTelemetry('gameover', {
                autoRestart: getBotControlAutoRestartEnabled(),
                gameoverText: (document.getElementById('gameover-stats')?.innerText || '').replace(/\s+/g, ' ').trim()
            });
        }
        if (!getBotControlAutoRestartEnabled()) return;
        if (retryBtn) {
            log('info', '💀', 'Game Over → Auto-restarting...');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('game over');
            triggerRealClick(retryBtn);
        }
    }

    // --- WIN SCREEN ---
    function handleWinScreen() {
        if (!getBotControlAutoRestartEnabled()) return;
        // Prefer tower climb, otherwise play again
        const towerBtn = document.querySelector('#win-screen [onclick*="showEndlessStageSelect"], #win-screen .btn-secondary--gold');
        if (towerBtn) {
            ensureRunTelemetry('win-screen');
            recordRunEvent('win-screen', { action: 'climb-tower', snapshot: getRunProgressSnapshot('win-screen') });
            log('info', '🏆', 'Victory → Climbing tower!');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('win tower');
            triggerRealClick(towerBtn);
            return;
        }
        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            finalizeRunTelemetry('win', { action: 'play-again' });
            log('info', '🏆', 'Victory → Playing again!');
            sinnohCarryKnownTmTiers = {};
            resetMapCaptureState('win play again');
            triggerRealClick(playAgainBtn);
        }
    }

    function getAutoStartModeEnabled(mode) {
        const runMode = getBotControlRunMode();
        if (runMode === 'manual') return false;
        if (runMode === 'battleTower') return mode === 'battleTower' || mode === 'resumeBattleTower';
        if (runMode === 'weeklyChallenges') return mode === 'weeklyChallenges';
        if (runMode === 'challengeMode') {
            return mode === 'challengeMode' || (mode === 'resumeChallenge' && !getBotControlMapPreference());
        }
        if (runMode === 'story') return mode === 'story';

        const modes = CONFIG.AUTO_START_MODES || {};
        if (mode === 'battleTower' || mode === 'resumeBattleTower') {
            if (Object.prototype.hasOwnProperty.call(modes, mode)) {
                return Boolean(modes[mode] || CONFIG.AUTO_START_BATTLE_TOWER);
            }
            return Boolean(CONFIG.AUTO_START_BATTLE_TOWER);
        }

        if (Object.prototype.hasOwnProperty.call(modes, mode)) {
            return Boolean(modes[mode]);
        }

        return false;
    }

    function getAutoStartPriority() {
        const runMode = getBotControlRunMode();
        const hasMapPreference = Boolean(getBotControlMapPreference());
        if (runMode === 'manual') return [];
        if (runMode === 'battleTower') {
            return hasMapPreference
                ? ['battleTower', 'resumeBattleTower']
                : ['resumeBattleTower', 'battleTower'];
        }
        if (runMode === 'weeklyChallenges') return ['weeklyChallenges'];
        if (runMode === 'challengeMode') return hasMapPreference ? ['challengeMode'] : ['resumeChallenge', 'challengeMode'];
        if (runMode === 'story') return ['story'];

        const configured = Array.isArray(CONFIG.AUTO_START_PRIORITY) ? CONFIG.AUTO_START_PRIORITY : [];
        return configured.length > 0 ? configured : [
            'resumeChallenge',
            'weeklyChallenges',
            'challengeMode',
            'resumeBattleTower',
            'battleTower'
        ];
    }

    function isChallengeAutoRunMode(mode = activeAutoRunMode) {
        return mode === 'weekly-challenge' || mode === 'challenge-mode';
    }

    function getVisibleControl(selectors) {
        return Array.from(document.querySelectorAll(selectors))
            .find(control => isEnabledActionControl(control)) || null;
    }

    function getChoiceSearchText(element) {
        if (!element) return '';
        const attrs = Array.from(element.attributes || [])
            .filter(attr => attr.name.startsWith('data-') || ['id', 'class', 'title', 'aria-label'].includes(attr.name))
            .map(attr => `${attr.name} ${attr.value}`);
        return foldText([
            element.innerText || '',
            element.textContent || '',
            ...attrs
        ].join(' '));
    }

    function isLockedChoice(element) {
        if (!element) return true;
        return Boolean(
            element.disabled ||
            element.hasAttribute?.('disabled') ||
            element.getAttribute?.('aria-disabled') === 'true' ||
            element.classList?.contains('locked') ||
            element.classList?.contains('disabled') ||
            element.classList?.contains('history-region-btn--locked')
        );
    }

    function findPreferredChoice(choices, preference = getBotControlMapPreference()) {
        const visibleChoices = Array.from(choices || []).filter(choice => isVisible(choice) && !isLockedChoice(choice));
        if (visibleChoices.length === 0) return null;
        if (preference) {
            const preferred = visibleChoices.find(choice => getChoiceSearchText(choice).includes(preference));
            if (preferred) return preferred;
            log('warn', '🧭', `No visible map/region matched [${preference}]. Falling back to best available.`);
        }
        return visibleChoices[visibleChoices.length - 1] || null;
    }

    function getStoryLaunchControl() {
        return getVisibleControl([
            '#btn-story-run',
            '#btn-history-run',
            '#btn-regions-run',
            '#btn-adventure-run',
            '#btn-continue-story',
            '#btn-continue-history',
            '[onclick*="showHistoryRegionSelect"]',
            '[onclick*="history"]',
            '[onclick*="History"]',
            '[id*="history"]',
            '[id*="story"]',
            '[class*="history"]',
            '[class*="story"]'
        ].join(', '));
    }

    function prepareAutoRun(reason, mode, context = null, eventType = 'run-start') {
        activeAutoRunMode = mode;
        activeChallengeContext = context;
        if (eventType === 'run-start') sinnohCarryKnownTmTiers = {};
        currentRunTelemetry = makeRunTelemetry(reason);
        recordRunEvent(eventType, {
            reason,
            mode,
            context,
            labels: getProgressLabels()
        });
        resetMapCaptureState(reason);
    }

    function parseProgressRatio(text) {
        const match = foldText(text || '').match(/(\d+)\s*(?:\/|of|de)\s*(\d+)/);
        if (!match) return null;
        const current = Number.parseInt(match[1], 10);
        const total = Number.parseInt(match[2], 10);
        if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
        return { current, total };
    }

    function isWeeklyChallengeComplete() {
        try {
            if (typeof window.isWeeklyBeaten === 'function') {
                return Boolean(window.isWeeklyBeaten());
            }
        } catch (e) {
            log('debug', '⚔️', `Weekly completion helper failed: ${e.message}`);
        }

        const weeklyCard = document.getElementById('chal-weekly') || document.querySelector('.chal-weekly-card');
        const weeklyText = [
            weeklyCard?.innerText || '',
            document.querySelector('.chal-weekly-count')?.innerText || '',
            document.querySelector('.weekly-status')?.innerText || ''
        ].join(' ');

        const ratio = parseProgressRatio(weeklyText);
        if (ratio) return ratio.current >= ratio.total;

        const classText = weeklyCard ? String(weeklyCard.getAttribute('class') || '') : '';
        return Boolean(classText.match(/done|complete|completed|cleared|chal-weekly-card--d/));
    }

    function isWeeklySubComplete(subId, tile = null) {
        try {
            if (typeof window.isWeeklySubCleared === 'function') {
                return Boolean(window.isWeeklySubCleared(subId));
            }
        } catch (e) {
            log('debug', '⚔️', `Weekly sub completion helper failed: ${e.message}`);
        }

        if (!tile) return false;

        const classText = String(tile.getAttribute('class') || '');
        if (classText.match(/done|complete|completed|cleared|weekly-sub--d/)) return true;

        const text = tile.innerText || '';
        if (text.includes('✓')) return true;

        const ctaText = (tile.querySelector('.chal-intro-cta')?.innerText || '').trim();
        if (ctaText && !ctaText.match(/[▸>]/)) return true;

        return false;
    }

    function getWeeklySubAllowedTypes(tile) {
        if (!tile) return [];
        let types = getTypeListFromElements(tile.querySelectorAll('.type-badge, [data-type], [class*="type-"]'));
        if (types.length === 0) {
            types = detectTypesInText([
                tile.innerText || '',
                tile.getAttribute('class') || '',
                tile.getAttribute('data-sub') || ''
            ].join(' '));
        }
        return normalizeTypeList(types);
    }

    function getWeeklySubTiles() {
        return Array.from(document.querySelectorAll('.weekly-sub[data-sub]'))
            .filter(tile => isVisible(tile));
    }

    function getNextWeeklySubTile() {
        const tiles = getWeeklySubTiles();
        if (tiles.length === 0) return null;

        const byId = new Map(tiles.map(tile => [foldText(tile.getAttribute('data-sub') || ''), tile]));
        const preference = getBotControlMapPreference();
        if (preference) {
            const preferred = tiles.find(tile =>
                !isWeeklySubComplete(tile.getAttribute('data-sub') || '', tile) &&
                getChoiceSearchText(tile).includes(preference)
            );
            if (preferred) {
                return { subId: preferred.getAttribute('data-sub') || preference, tile: preferred };
            }
            log('warn', '⚔️', `Weekly target [${preference}] not visible/incomplete. Falling back to configured order.`);
        }

        const orderedIds = [
            ...(CONFIG.WEEKLY_CHALLENGE_ORDER || []),
            ...tiles.map(tile => tile.getAttribute('data-sub') || '')
        ].map(foldText).filter(Boolean);

        for (const subId of [...new Set(orderedIds)]) {
            const tile = byId.get(subId);
            if (tile && !isWeeklySubComplete(subId, tile)) {
                return { subId, tile };
            }
        }

        return null;
    }

    function handleChallengeSelectScreen() {
        const weeklyEnabled = getAutoStartModeEnabled('weeklyChallenges');
        const challengeEnabled = getAutoStartModeEnabled('challengeMode');

        if (weeklyEnabled && !isWeeklyChallengeComplete()) {
            const weeklyBtn = getVisibleControl('#chal-weekly, .chal-weekly-card');
            if (weeklyBtn) {
                activeAutoRunMode = 'weekly-challenge';
                activeChallengeContext = null;
                log('info', '⚔️', 'Opening weekly challenge list...');
                resetMapCaptureState('open weekly challenges');
                triggerRealClick(weeklyBtn);
                return;
            }
        }

        if (challengeEnabled) {
            const challengeBtn = getVisibleControl('#chal-intro, .chal-intro--launch');
            if (challengeBtn) {
                const context = { kind: 'challenge-mode', subId: null, allowedTypes: [] };
                prepareAutoRun('start challenge mode', 'challenge-mode', context);
                log('info', '⚔️', 'Starting Challenge Mode...');
                triggerRealClick(challengeBtn);
                return;
            }
        }

        const backBtn = getVisibleControl('#challenge-back');
        if (backBtn && (getAutoStartModeEnabled('battleTower') || getAutoStartModeEnabled('resumeBattleTower'))) {
            triggerRealClick(backBtn);
        }
    }

    function handleWeeklySelectScreen() {
        const next = getNextWeeklySubTile();
        if (next) {
            const allowedTypes = getWeeklySubAllowedTypes(next.tile);
            const context = {
                kind: 'weekly-subchallenge',
                subId: next.subId,
                allowedTypes
            };
            prepareAutoRun(`start weekly challenge ${next.subId}`, 'weekly-challenge', context);
            recordRunEvent('weekly-sub-start', context);
            log('info', '⚔️', `Starting weekly challenge [${next.subId}]${allowedTypes.length ? ` (${allowedTypes.join('/')})` : ''}...`);
            triggerRealClick(next.tile);
            return;
        }

        activeChallengeContext = null;
        const backBtn = getVisibleControl('#weekly-back');
        if (backBtn) {
            log('info', '⚔️', 'Weekly challenges complete. Returning to Challenge menu...');
            triggerRealClick(backBtn);
        }
    }

    // --- STAGE COMPLETE SCREEN ---
    function handleStageComplete() {
        // Try to continue to next stage
        const continueBtn = document.getElementById('btn-stage-continue');
        if (continueBtn) {
            const completedMode = activeAutoRunMode;
            const completedContext = activeChallengeContext;
            ensureRunTelemetry('stage-complete');
            recordRunEvent('stage-complete', {
                mode: completedMode,
                context: completedContext,
                snapshot: getRunProgressSnapshot('stage-complete')
            });
            if (isChallengeAutoRunMode(completedMode)) {
                finalizeRunTelemetry('stage-complete', {
                    action: 'challenge-continue',
                    mode: completedMode,
                    context: completedContext
                });
                activeAutoRunMode = null;
                activeChallengeContext = null;
            }
            resetMapCaptureState('stage complete');
            triggerRealClick(continueBtn);
            return;
        }
        const againBtn = document.getElementById('btn-stage-again');
        if (againBtn) {
            finalizeRunTelemetry('stage-complete-again', { action: 'stage-again' });
            resetMapCaptureState('stage again');
            triggerRealClick(againBtn);
        }
    }

    // --- TITLE SCREEN ---
    function handleTitleScreen() {
        for (const mode of getAutoStartPriority()) {
            if (!getAutoStartModeEnabled(mode)) continue;

            if (mode === 'resumeChallenge') {
                const resumeChallenge = getVisibleControl('#btn-continue-challenge');
                if (resumeChallenge) {
                    const context = { kind: 'resume-challenge', subId: null, allowedTypes: [] };
                    prepareAutoRun('resume challenge', 'challenge-mode', context, 'run-resume');
                    log('info', '⚔️', 'Resuming Challenge run...');
                    triggerRealClick(resumeChallenge);
                    return;
                }
            }

            if (mode === 'weeklyChallenges' || mode === 'challengeMode') {
                const challengeBtn = getVisibleControl('#btn-challenges-run');
                if (challengeBtn) {
                    activeAutoRunMode = mode === 'weeklyChallenges' ? 'weekly-challenge' : 'challenge-mode';
                    activeChallengeContext = null;
                    log('info', '⚔️', 'Opening Challenges...');
                    resetMapCaptureState('open challenges');
                    triggerRealClick(challengeBtn);
                    return;
                }
            }

            if (mode === 'story') {
                const storyBtn = getStoryLaunchControl();
                if (storyBtn) {
                    prepareAutoRun('open story mode', 'story', {
                        kind: 'story-mode',
                        target: getBotControlMapPreference() || null
                    });
                    log('info', '🧭', 'Opening Story mode...');
                    triggerRealClick(storyBtn);
                    return;
                }
            }

            if (mode === 'resumeBattleTower') {
                const resumeTower = getVisibleControl('#btn-continue-endless');
                if (resumeTower) {
                    prepareAutoRun('resume tower', 'battle-tower', null, 'run-resume');
                    log('info', '🏠', 'Resuming Battle Tower run...');
                    triggerRealClick(resumeTower);
                    return;
                }
            }

            if (mode === 'battleTower') {
                const towerBtn = getVisibleControl('#btn-endless-run');
                if (towerBtn) {
                    prepareAutoRun('start tower', 'battle-tower');
                    log('info', '🏠', 'Starting Battle Tower...');
                    triggerRealClick(towerBtn);
                    return;
                }
            }
        }
    }

    // --- TRAINER SELECT SCREEN ---
    function handleTrainerScreen() {
        const trainerBoy = document.getElementById('trainer-boy');
        if (trainerBoy) triggerRealClick(trainerBoy);
    }

    function getStarterChoiceSearchableText(choice) {
        if (!choice) return '';
        const imgs = Array.from(choice.querySelectorAll('img'));
        return foldText([
            choice.innerText || '',
            choice.title || '',
            choice.getAttribute('aria-label') || '',
            choice.getAttribute('data-species') || '',
            choice.getAttribute('data-name') || '',
            choice.getAttribute('class') || '',
            ...imgs.map(img => `${img.alt || ''} ${img.title || ''} ${img.src || ''}`)
        ].join(' '));
    }

    function getStarterChoiceTypes(choice) {
        if (!choice) return [];

        let types = getTypeListFromElements(choice.querySelectorAll(
            '.type-badge, .poke-type, [data-type], [data-poke-type], [class*="type-"]'
        ));
        if (types.length > 0) return types;

        const searchableText = getStarterChoiceSearchableText(choice);
        for (const { name, types: knownTypes } of getAllKnownPokemonEntries()) {
            if (searchableText.includes(foldText(name))) {
                return normalizeTypeList(knownTypes);
            }
        }

        return normalizeTypeList(detectTypesInText(searchableText));
    }

    function getAllowedStarterChoices(choices) {
        const allowedTypes = normalizeTypeList(activeChallengeContext?.allowedTypes || []);
        if (allowedTypes.length === 0) return choices;

        const filtered = choices.filter(choice => {
            const choiceTypes = getStarterChoiceTypes(choice);
            return choiceTypes.some(type => allowedTypes.includes(type));
        });

        if (filtered.length > 0) {
            log('info', '🐾', `Starter filter for challenge types [${allowedTypes.join('/')}] kept ${filtered.length}/${choices.length} choice(s).`);
            return filtered;
        }

        log('warn', '🐾', `No starter matched challenge types [${allowedTypes.join('/')}]. Using all visible choices.`);
        return choices;
    }

    // --- STARTER SELECT SCREEN ---
    function handleStarterScreen() {
        let choices = Array.from(document.querySelectorAll('#starter-choices .dex-card, #starter-choices .poke-card'));
        if (choices.length === 0) {
            choices = Array.from(document.querySelectorAll('#starter-choices > *'));
        }
        if (choices.length === 0) return;
        choices = getAllowedStarterChoices(choices);

        const botState = getBotControlState();
        const starterMode = botState.starterMode || 'auto';
        if (starterMode === 'manual') {
            log('debug', '🐾', 'Starter mode is manual; waiting for player choice.');
            return;
        }

        const stateStarter = botState.starterPreference;
        const configuredStarter = starterMode === 'preferred'
            ? stateStarter
            : (CONFIG.STARTER_PREFERENCE || '');
        const starterPreference = foldText(configuredStarter || '');
        if (starterPreference) {
            for (const choice of choices) {
                const searchableText = getStarterChoiceSearchableText(choice);

                if (searchableText.includes(starterPreference)) {
                    log('info', '🐾', `Starter preference matched: ${configuredStarter}`);
                    triggerRealClick(choice);
                    return;
                }
            }

            log('warn', '🐾', `Starter preference [${configuredStarter}] not visible. Falling back to auto starter scoring.`);
        }

        // Score visible starters by configured carry value, shiny value, and Sinnoh trait goals.
        let bestChoice = null;
        let bestScore = -1;

        choices.forEach(choice => {
            const text = getStarterChoiceSearchableText(choice);
            let score = 0;
            let matchedName = '';
            let matchedTypes = [];

            // Score known type traits and remember the matched Pokemon for carry/stat bonuses.
            for (const { name, types } of getAllKnownPokemonEntries()) {
                if (text.includes(foldText(name))) {
                    matchedName = name;
                    matchedTypes = normalizeTypeList(types);
                    types.forEach(t => {
                        const traitInfo = TRAIT_DATA[t];
                        if (traitInfo) score += TRAIT_TIER_VALUE[traitInfo.tier] || 1;
                    });
                    break;
                }
            }
            if (matchedName && isMainCarryName(matchedName)) score += 90;
            if (matchedName) score += scorePokemonStats(getPokemonBaseStats(matchedName)) * 0.8;

            // Shiny bonus for starters (they count as 2x for traits and are rare)
            const isShiny = isPokemonElementShiny(choice);
            if (isShiny) {
                score += 35 + getShinyDraftScore(matchedTypes, [], true);
            }
            if (isSinnohTowerRunContext()) {
                score += scoreSinnohPassivePlanForTypes(matchedTypes, [], { isShiny });
                const matchedAttackTypes = matchedName
                    ? getLikelyAttackTypes({ name: matchedName, types: matchedTypes, level: 0 })
                    : matchedTypes;
                score += scoreSinnohBossRunPlanFit(matchedTypes, matchedAttackTypes, [], null, {
                    bossWeight: 0.6,
                    arceusWeight: 0.8,
                    postArceusWeight: 0.7
                });
                if (matchedTypes.includes('Rock')) score += 24;
                if (matchedTypes.includes('Water')) score += 24;
                if (matchedTypes.includes('Dragon')) score += 24;
                if (matchedTypes.includes('Fairy')) score += 34;
                if (isShiny && (matchedTypes.includes('Normal') || matchedTypes.includes('Bug'))) score += 8;
            }

            if (score > bestScore) {
                bestScore = score;
                bestChoice = choice;
            }
        });

        triggerRealClick(bestChoice || choices[0]);
    }

    // --- ENDLESS STAGE SELECT ---
    function handleEndlessStageSelect() {
        const stages = document.querySelectorAll('#stage-select-list .region-card, #stage-select-list .history-region-btn, #stage-select-list > *');
        if (stages.length === 0) return;

        const selectedStage = findPreferredChoice(stages);

        if (selectedStage) {
            log('info', '🗼', `Selecting Endless Stage: ${selectedStage.innerText.split('\n')[0]}`);
            ensureRunTelemetry('stage select');
            recordRunEvent('stage-select', {
                label: selectedStage.innerText.split('\n')[0],
                target: getBotControlMapPreference() || null,
                labels: getProgressLabels()
            });
            resetMapCaptureState('stage select');
            triggerRealClick(selectedStage);
        }
    }

    function handleHistoryRegionSelect() {
        const regions = document.querySelectorAll(
            '#history-region-list .history-region-btn, #history-region-list .region-card, ' +
            '#region-select-list .history-region-btn, #region-select-list .region-card, ' +
            '.history-region-btn, .region-card, #history-region-select > *'
        );
        if (regions.length === 0) return;

        const selectedRegion = findPreferredChoice(regions);
        if (!selectedRegion) return;

        ensureRunTelemetry('history-region-select');
        recordRunEvent('story-region-select', {
            label: selectedRegion.innerText.split('\n')[0],
            target: getBotControlMapPreference() || null,
            labels: getProgressLabels()
        });
        resetMapCaptureState('story region select');
        log('info', '🧭', `Selecting Story region: ${selectedRegion.innerText.split('\n')[0]}`);
        triggerRealClick(selectedRegion);
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║          🛡️ ANTI-STUCK WATCHDOG                             ║
    // ╚══════════════════════════════════════════════════════════════╝

    function antiStuckCheck(currentState) {
        if (currentState === lastStateForStuck) {
            stuckCounter++;
        } else {
            stuckCounter = 0;
            lastStateForStuck = currentState;
        }

        if (stuckCounter >= CONFIG.STUCK_PANIC_THRESHOLD) {
            log('error', '🚨', `PANIC: Stuck for ${stuckCounter} loops on [${currentState}]. Attempting recovery...`);
            if (currentState === 'map-screen' && forceClickAlternateMapNode('panic')) {
                stuckCounter = 0;
                return true;
            }
            // Try clicking any visible button on the page
            const allBtns = document.querySelectorAll('button:not([disabled]), .btn-primary, .btn-secondary, [role="button"]');
            for (const btn of allBtns) {
                if (isVisible(btn)) {
                    triggerRealClick(btn);
                    stuckCounter = 0;
                    return true;
                }
            }
        } else if (stuckCounter >= CONFIG.STUCK_FORCE_THRESHOLD) {
            log('warn', '⚠️', `Force-clicking generic navigation (stuck: ${stuckCounter}x on [${currentState}])`);
            if (currentState === 'map-screen' && forceClickAlternateMapNode('force-threshold')) {
                stuckCounter = 0;
                return true;
            }
            const navBtns = document.querySelectorAll(
                '.btn-next, #btn-stage-continue, .choice-skip-btn, #btn-skip-catch, #btn-skip-trade, ' +
                '#btn-cancel-swap, #btn-equip-to-bag, #btn-equip-cancel, #btn-cancel-use, #btn-next-map, ' +
                '#btn-continue-battle, #btn-auto-battle, #btn-elite-prep-continue, .elite-prep-fight-btn, #btn-retry, #btn-play-again, ' +
                '#btn-challenges-run, #btn-continue-challenge, #chal-intro, #chal-weekly, #weekly-back, .weekly-sub'
            );
            for (const btn of navBtns) {
                if (isVisible(btn)) {
                    triggerRealClick(btn);
                    stuckCounter = 0;
                    return true;
                }
            }
        } else if (stuckCounter >= CONFIG.STUCK_WARN_THRESHOLD) {
            log('warn', '⚠️', `Potential stuck: ${stuckCounter}x on [${currentState}]`);
        }

        return false;
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║            🔄 MAIN ENGINE LOOP                              ║
    // ╚══════════════════════════════════════════════════════════════╝

    function engineLoop() {
        engineStats.loops++;
        const currentState = getActiveScreen();
        refreshVisiblePokemonInfoCache();
        ensureBotControlPanel();
        syncCatchScreenSession(currentState);

        if (isBotPaused()) {
            return;
        }

        const shouldTrackRunState = ![
            'title-screen',
            'challenge-select',
            'weekly-select',
            'history-region-select',
            'endless-stage-select',
            'IDLE_TRANSITION'
        ].includes(currentState);
        const suppressRecentGameOverTelemetry = currentState === 'gameover-screen' &&
                                                !currentRunTelemetry &&
                                                Date.now() - lastRunFinalizedAt < 10000;
        if ((shouldTrackRunState || currentRunTelemetry) && !suppressRecentGameOverTelemetry) {
            updateRunProgress(currentState);
        }

        // Log state transitions
        if (currentState !== lastLoggedState) {
            log('info', '🤖', `State: [${currentState}]`);
            engineStats.screens[currentState] = (engineStats.screens[currentState] || 0) + 1;
            if (currentRunTelemetry) {
                recordRunEvent('screen-enter', { screen: currentState });
            }
            lastLoggedState = currentState;
        }

        // Anti-stuck check
        if (antiStuckCheck(currentState)) return;

        // State machine
        switch (currentState) {
            // --- Overlays (highest priority) ---
            case 'EEVEE_CHOICE':
                handleEeveeChoice();
                break;

            case 'EVO_OVERLAY':
                handleEvoOverlay();
                break;

            case 'ITEM_EQUIP_MODAL':
                handleItemEquipModal();
                break;

            // --- Core gameplay screens ---
            case 'map-screen':
                handleMapScreen();
                break;

            case 'battle-screen':
                handleBattleScreen();
                break;

            case 'catch-screen':
                handleCatchScreen();
                break;

            case 'item-screen':
                handleItemScreen();
                break;

            case 'passive-screen':
                handlePassiveScreen();
                break;

            case 'swap-screen':
                handleSwapScreen();
                break;

            case 'trade-screen':
                handleTradeScreen();
                break;

            case 'shiny-screen':
                handleShinyScreen();
                break;

            case 'badge-screen':
                handleBadgeScreen();
                break;

            case 'stat-buff-screen':
                handleStatBuffScreen();
                break;

            case 'elite-prep-screen':
                handleElitePrepScreen();
                break;

            case 'transition-screen':
                handleTransitionScreen();
                break;

            // --- Meta screens ---
            case 'gameover-screen':
                handleGameOverScreen();
                break;

            case 'win-screen':
                handleWinScreen();
                break;

            case 'endless-stage-complete':
                handleStageComplete();
                break;

            case 'title-screen':
                handleTitleScreen();
                break;

            case 'challenge-select':
                handleChallengeSelectScreen();
                break;

            case 'weekly-select':
                handleWeeklySelectScreen();
                break;

            case 'trainer-screen':
                handleTrainerScreen();
                break;

            case 'starter-screen':
                handleStarterScreen();
                break;

            case 'endless-stage-select':
                handleEndlessStageSelect();
                break;

            case 'history-region-select':
                handleHistoryRegionSelect();
                break;

            // --- Fallback / transitions ---
            default:
                const nextBtn = document.querySelector(
                    '.btn-next, #btn-stage-continue, .choice-skip-btn, ' +
                    '#btn-continue-battle, #btn-auto-battle'
                );
                if (nextBtn && isVisible(nextBtn)) {
                    triggerRealClick(nextBtn);
                }
                break;
        }
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║           🚀 INITIALIZATION                                 ║
    // ╚══════════════════════════════════════════════════════════════╝

    function printBanner() {
        console.log('%c╔══════════════════════════════════════════════════╗', 'color: #00ff88; font-weight: bold');
        console.log('%c║  Pokelike Tower Engine v8.7 - Sinnoh Run AI    ║', 'color: #00ff88; font-weight: bold');
        console.log('%c╠══════════════════════════════════════════════════╣', 'color: #00ff88; font-weight: bold');
        console.log('%c║  18-type chart • 15+ screen handlers            ║', 'color: #88ffaa');
        console.log('%c║  Trait-aware drafting • Smart counter-picks     ║', 'color: #88ffaa');
        console.log('%c║  Trade evaluation • Anti-stuck watchdog         ║', 'color: #88ffaa');
        console.log('%c║  Auto-restart • Configurable Eevee evolution    ║', 'color: #88ffaa');
        console.log('%c╚══════════════════════════════════════════════════╝', 'color: #00ff88; font-weight: bold');
        console.log(`%c  Loop: ${CONFIG.LOOP_SPEED_MS}ms | Eevee: ${CONFIG.EEVEE_EVOLUTION_PREFERENCE} | Restart: ${getBotControlAutoRestartEnabled()}`, 'color: #aaaaaa');
    }

    // Stats reporter
    function reportStats() {
        const s = engineStats;
        log('info', '📊', `Stats — Loops: ${s.loops} | Catches: ${s.catches} | Map catches: ${capturesThisMap}/${CONFIG.MAX_CATCHES_PER_MAP} | Rerolls: ${s.rerolls} | Items: ${s.items} | Swaps: ${s.swaps}`);
    }

    // Start the engine
    printBanner();
    exposeRunHistoryHelpers();
    setInterval(engineLoop, CONFIG.LOOP_SPEED_MS);
    setInterval(reportStats, 60000); // Report every 60s

})();
