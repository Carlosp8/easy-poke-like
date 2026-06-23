# 🐾 Pokelike Tower Engine v7.4 — Ultimate AI

> Motor de automatización completo para el Battle Tower de [Pokelike.xyz](https://pokelike.xyz).  
> 25 estados de pantalla · 18 tipos · 250+ Pokémon · IA de drafting por sinergias · carry protegido · scouting de legendarios/masterball · Auto-restart infinito.

---

## 📋 Tabla de Contenidos

- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Características](#-características)
- [Arquitectura del Motor](#-arquitectura-del-motor)
- [Referencia de Datos del Juego](#-referencia-de-datos-del-juego)
  - [Tabla de Efectividad de Tipos](#-tabla-de-efectividad-de-tipos-18-tipos)
  - [Sistema de Rasgos (Traits)](#-sistema-de-rasgos-traits)
  - [Movimientos por Tipo y Nivel](#-movimientos-por-tipo-y-nivel)
  - [Base de Datos de Jefes](#️-base-de-datos-de-jefes-60-entradas)
  - [Tier List de Items](#-tier-list-de-items)
  - [Evoluciones de Eevee](#-evoluciones-de-eevee)
- [Sistemas de IA](#-sistemas-de-ia)
- [Pantallas Manejadas](#-pantallas-manejadas-25-estados)
- [Anti-Stuck Watchdog](#️-anti-stuck-watchdog)
- [Física del Motor](#-física-del-motor)
- [Selectores DOM Clave](#-selectores-dom-clave)
- [Changelog v6.0 → v7.4](#-changelog-v60--v74)

---

## 🚀 Instalación

### Requisitos
- Navegador con soporte para extensiones (Chrome, Firefox, Edge)
- [Tampermonkey](https://www.tampermonkey.net/) instalado

### Pasos

1. Abre **Tampermonkey** → haz clic en **Crear un nuevo script** (o pestaña `+`)
2. Borra el contenido de la plantilla
3. Copia y pega todo el contenido de [`pokelike-engine-v7.user.js`](pokelike-engine-v7.user.js)
4. Guarda con `Ctrl+S`
5. Navega a [https://pokelike.xyz](https://pokelike.xyz)
6. El motor arranca automáticamente — abre la consola del navegador (`F12`) para ver:

```
╔══════════════════════════════════════════════════╗
║  🐾 Pokelike Tower Engine — Ultimate AI         ║
╠══════════════════════════════════════════════════╣
║  18-type chart • 25 screen states               ║
║  Trait-aware drafting • Smart counter-picks      ║
║  Catch rerolls • Legendary/masterball scouting   ║
║  Auto-restart • Configurable Eevee evolution     ║
╚══════════════════════════════════════════════════╝
```

---

## ⚙️ Configuración

Todas las opciones editables están en el objeto `CONFIG`, al inicio de [`pokelike-engine-v7.user.js`](pokelike-engine-v7.user.js). Cambia esos valores en Tampermonkey y guarda el script; no hace falta tocar el resto del motor.

### Referencia rápida

| Grupo | Opción | Default | Para qué sirve |
|---|---:|---:|---|
| Timing | `LOOP_SPEED_MS` | `1000` | Frecuencia del loop principal. Más bajo = más rápido, pero más agresivo. |
| Timing | `DRAG_SETTLE_MS` | `300` | Pausa tras drag & drop antes de la siguiente acción. |
| HP | `CRITICAL_HP_THRESHOLD` | `30` | HP medio/crítico que dispara prioridad máxima de PokéCenter. |
| HP | `LOW_HP_THRESHOLD` | `50` | HP bajo que penaliza rutas peligrosas y jefes. |
| Equipo early | `EARLY_CORE_TEAM_SIZE` | `2` | Núcleo mínimo vivo antes de dejar de buscar capturas urgentes. |
| Equipo early | `EARLY_OPTIONAL_TEAM_SIZE` | `4` | Tamaño cómodo antes de cerrar expansión temprana. |
| Equipo | `TEAM_TARGET_SIZE` | `6` | Tamaño final objetivo del equipo. |
| Capturas | `MAX_CATCHES_PER_MAP` | `2` | Límite normal de capturas por mapa. Premium/shiny/legendarios pueden saltarse la intención del límite. |
| Pathfinding | `PATH_LOOKAHEAD_DEPTH` | `99` | Profundidad de evaluación de rutas del mapa. |
| Jefes | `BOSS_LEAD_WEIGHT` | `24` | Peso del matchup contra el lead enemigo. |
| Jefes | `BOSS_TEAM_WEIGHT` | `8` | Peso de cobertura contra el equipo completo del jefe. |
| Cooldowns | `ITEM_BAG_RETRY_COOLDOWN_MS` | `45000` | Evita reintentar mandar el mismo item a la bolsa demasiado seguido. |
| Cooldowns | `TEAM_REORDER_REPEAT_COOLDOWN_MS` | `3500` | Evita repetir el mismo reordenamiento de equipo en bucle. |
| Historial | `RUN_HISTORY_STORAGE_KEY` | `engine7_run_history_v1` | Clave de `localStorage` para guardar telemetría de runs. |
| Historial | `RUN_HISTORY_MAX_ENTRIES` | `80` | Máximo de runs guardadas. |
| Historial | `RUN_EVENT_LOG_MAX_ENTRIES` | `160` | Máximo de eventos detallados por run. |
| Anti-stuck | `STUCK_WARN_THRESHOLD` | `5` | Loops iguales antes del warning. |
| Anti-stuck | `STUCK_FORCE_THRESHOLD` | `10` | Loops iguales antes de forzar navegación. |
| Anti-stuck | `STUCK_PANIC_THRESHOLD` | `30` | Loops iguales antes de pulsar cualquier control visible. |
| Eevee | `EEVEE_EVOLUTION_PREFERENCE` | `'auto'` | Evolución automática o nombre fijo de evolución. |
| Starter | `STARTER_PREFERENCE` | comentado | Si lo descomentas, fuerza un starter cuando esté visible. |
| Auto-start | `AUTO_RESTART` | `true` | Reinicia automáticamente al perder o ganar. |
| Auto-start | `AUTO_START_MODES` | ver abajo | Decide qué modos puede arrancar o reanudar el bot. |
| Auto-start | `AUTO_START_PRIORITY` | ver abajo | Orden de preferencia al estar en title screen. |
| Challenges | `WEEKLY_CHALLENGE_ORDER` | `['lorelei','bruno','agatha','lance']` | Orden de subretos semanales. |
| Logging | `LOG_LEVEL` | `'info'` | `debug`, `info`, `warn` o `error`. |

### Niveles mínimos de preparación

El motor usa estos umbrales para decidir si conviene entrenar, curar, capturar o entrar a un jefe. Cada par representa `nivel medio / nivel del lead`.

| Momento | Config | Default |
|---|---|---:|
| Primer boss temprano | `EARLY_BOSS_MIN_AVG_LEVEL` / `EARLY_BOSS_MIN_LEAD_LEVEL` | `13 / 15` |
| Mapa 2 temprano | `EARLY_MAP2_MIN_AVG_LEVEL` / `EARLY_MAP2_MIN_LEAD_LEVEL` | `20 / 22` |
| Región 1, mapa 2 | `R1_MAP2_MIN_AVG_LEVEL` / `R1_MAP2_MIN_LEAD_LEVEL` | `28 / 32` |
| Big boss temprano | `EARLY_BIG_BOSS_MIN_AVG_LEVEL` / `EARLY_BIG_BOSS_MIN_LEAD_LEVEL` | `36 / 40` |
| Región 2, mapa 1 | `R2_MAP1_MIN_AVG_LEVEL` / `R2_MAP1_MIN_LEAD_LEVEL` | `42 / 46` |
| Región 2, mapa 2 | `R2_MAP2_MIN_AVG_LEVEL` / `R2_MAP2_MIN_LEAD_LEVEL` | `52 / 56` |
| Región 2, big boss | `R2_BIG_BOSS_MIN_AVG_LEVEL` / `R2_BIG_BOSS_MIN_LEAD_LEVEL` | `60 / 65` |
| Región 3, mapa 1 | `R3_MAP1_MIN_AVG_LEVEL` / `R3_MAP1_MIN_LEAD_LEVEL` | `66 / 70` |
| Región 3, mapa 2 | `R3_MAP2_MIN_AVG_LEVEL` / `R3_MAP2_MIN_LEAD_LEVEL` | `76 / 82` |
| Región 3, final/big boss | `R3_BIG_BOSS_MIN_AVG_LEVEL` / `R3_BIG_BOSS_MIN_LEAD_LEVEL` | `84 / 90` |

### Capturas y rerolls

| Opción | Default | Efecto |
|---|---:|---|
| `EARLY_EXCEPTIONAL_CATCH_SCORE` | `42` | Score a partir del cual una captura se considera excepcional. |
| `EARLY_EXPANSION_COUNTER_SCORE` | `12` | Score de counter que permite expandir equipo temprano. |
| `EARLY_MAX_CATCH_AVG_LEVEL_DROP` | `2.5` | Evita aceptar capturas que bajen demasiado el nivel medio. |
| `EARLY_LOW_LEVEL_SWAP_GAP` | `5` | Diferencia máxima aceptable contra el nivel alto del equipo para swaps tempranos. |
| `CATCH_REROLL_MIN_ACCEPT_SCORE` | `18` | Score mínimo razonable antes de aceptar cartas normales. |
| `CATCH_REROLL_ALWAYS_BELOW_SCORE` | `22` | Si una carta rerolleable queda por debajo, se intenta mejorar. |
| `CATCH_REROLL_MAX_ATTEMPTS_PER_STATE` | `1` | Intentos por estado visual idéntico. |
| `CATCH_REROLL_MIN_ATTEMPTS_PER_ENCOUNTER` | `2` | Mínimo de intentos por encuentro si el bot sigue viendo malas opciones. |
| `CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER` | `4` | Límite duro de rerolls por encuentro. |
| `CATCH_REROLL_PROTECT_SCORE` | `34` | Score que protege una carta buena de ser rerolleada. |
| `CATCH_REROLL_XP_FOCUS_SCORE` | `24` | Umbral especial cuando el bot prioriza levear el core. |
| `CATCH_REROLL_COOLDOWN_MS` | `900` | Pausa mínima entre rerolls. |

### Carry principal

Esta estrategia protege sweepers concretos y evita sacarlos del lead salvo que el matchup sea claramente malo.

| Opción | Default | Efecto |
|---|---:|---|
| `MAIN_CARRY_NAMES` | `['Thundurus','Lapras','Genesect','Dialga']` | Pokémon tratados como carry principal. |
| `MAIN_CARRY_LEAD_STICKINESS` | `170` | Bonus para mantener el carry como lead. |
| `MAIN_CARRY_REORDER_MARGIN` | `130` | Margen que debe superar otro Pokémon para desplazar al carry. |
| `MAIN_CARRY_HEAL_ITEM_BONUS` | `210` | Bonus para equipar curación al carry. |
| `MAIN_CARRY_OFFENSE_ITEM_BONUS` | `55` | Bonus para items ofensivos en carry. |
| `MAIN_CARRY_CONSUMABLE_BONUS` | `70` | Bonus para consumibles útiles en carry. |
| `MAIN_CARRY_HEAL_KEEP_MARGIN` | `90` | Resistencia a reemplazar un item curativo ya bueno. |
| `GRASS_SUPPORT_CATCH_BONUS` | `18` | Bonus por soporte Grass/sustain. |
| `GRASS_SUPPORT_THRESHOLD_BONUS` | `24` | Bonus extra si ayuda a completar trait threshold. |

### Legendarios y nodos masterball

El motor detecta nodos con textos como `masterball`, `legendary`, `legendario`, `mythical` o similares. Los prioriza si la run está preparada y penaliza si el equipo llega bajo de HP o nivel.

| Opción | Default | Efecto |
|---|---:|---|
| `LEGENDARY_NODE_BASE_SCORE` | `3600` | Prioridad base del nodo legendario/masterball. |
| `LEGENDARY_NODE_ROUTE_BONUS` | `2400` | Bonus por ruta hacia recompensa legendaria. |
| `LEGENDARY_NODE_READY_BONUS` | `900` | Bonus si el equipo está preparado. |
| `LEGENDARY_NODE_LOW_HP_PENALTY` | `2600` | Penalización por entrar con HP bajo. |
| `LEGENDARY_NODE_MAX_UNDERLEVEL_PENALTY` | `1400` | Tope de penalización por falta de nivel. |
| `LEGENDARY_NODE_UNDERLEVEL_PENALTY` | `850` | Penalización incremental por underlevel. |
| `LEGENDARY_CATCH_SCORE_BONUS` | `120` | Bonus al evaluar una captura legendaria. |
| `LEGENDARY_CATCH_MIN_BST` | `540` | BST mínimo para tratar una captura como legendaria si se conoce su stat base total. |
| `LEGENDARY_POKEMON_NAMES` | lista Gen 1-5 | Nombres reconocidos como legendarios/míticos. |

### Bloque base actual

```javascript
const CONFIG = {
    // --- Timing ---
    LOOP_SPEED_MS: 1000,
    DRAG_SETTLE_MS: 300,

    // --- HP Thresholds ---
    CRITICAL_HP_THRESHOLD: 30,
    LOW_HP_THRESHOLD: 50,

    // --- Early Battle Tower economy ---
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
    CATCH_REROLL_MAX_ATTEMPTS_PER_ENCOUNTER: 4,
    CATCH_REROLL_PROTECT_SCORE: 34,
    CATCH_REROLL_XP_FOCUS_SCORE: 24,
    CATCH_REROLL_COOLDOWN_MS: 900,
    TEAM_TARGET_SIZE: 6,
    MAX_CATCHES_PER_MAP: 2,
    PATH_LOOKAHEAD_DEPTH: 99,
    BOSS_LEAD_WEIGHT: 24,
    BOSS_TEAM_WEIGHT: 8,
    ITEM_BAG_RETRY_COOLDOWN_MS: 45000,
    TEAM_REORDER_REPEAT_COOLDOWN_MS: 3500,
    RUN_HISTORY_STORAGE_KEY: 'engine7_run_history_v1',
    RUN_HISTORY_MAX_ENTRIES: 80,
    RUN_EVENT_LOG_MAX_ENTRIES: 160,

    // --- Main carry strategy ---
    MAIN_CARRY_NAMES: ['Thundurus', 'Lapras', 'Genesect', 'Dialga'],
    MAIN_CARRY_LEAD_STICKINESS: 170,
    MAIN_CARRY_REORDER_MARGIN: 130,
    MAIN_CARRY_HEAL_ITEM_BONUS: 210,
    MAIN_CARRY_OFFENSE_ITEM_BONUS: 55,
    MAIN_CARRY_CONSUMABLE_BONUS: 70,
    MAIN_CARRY_HEAL_KEEP_MARGIN: 90,
    GRASS_SUPPORT_CATCH_BONUS: 18,
    GRASS_SUPPORT_THRESHOLD_BONUS: 24,

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

    // --- Evolución de Eevee ---
    // 'auto' = elige según necesidades del equipo
    EEVEE_EVOLUTION_PREFERENCE: 'auto',

    // --- Starter Preference ---
    // STARTER_PREFERENCE: 'Dialga',

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
    AUTO_START_BATTLE_TOWER: true,

    // --- Logging ---
    LOG_LEVEL: 'info',
};
```

### Ejemplos de ajuste

Arranque solo Battle Tower, sin retos:

```javascript
AUTO_START_MODES: {
    resumeChallenge: false,
    weeklyChallenges: false,
    challengeMode: false,
    resumeBattleTower: true,
    battleTower: true
}
```

Forzar starter o evolución de Eevee:

```javascript
STARTER_PREFERENCE: 'Dialga',
EEVEE_EVOLUTION_PREFERENCE: 'Umbreon',
```

Jugar más conservador:

```javascript
LOOP_SPEED_MS: 1400,
MAX_CATCHES_PER_MAP: 3,
CRITICAL_HP_THRESHOLD: 40,
LOW_HP_THRESHOLD: 60,
```

Depurar decisiones del bot:

```javascript
LOG_LEVEL: 'debug',
```

---

## ✨ Características

| Característica | Descripción |
|---|---|
| **25 estados de pantalla** | Maneja Battle Tower, retos, overlays, menús y transiciones sin quedarse atascado |
| **18 tipos completos** | Tabla de efectividad ofensiva y defensiva completa |
| **250+ Pokémon** | Base de datos Gen 1 + Gen 2 + Gen 3 con tipos |
| **60+ jefes** | Kanto, Johto, Hoenn, Sinnoh + todos los E4 y campeones |
| **Drafting por sinergias** | IA que evalúa candidatos de captura por progreso de traits |
| **Reroll de capturas** | Reintenta cartas débiles sin gastar rerolls en opciones premium |
| **Economía early game** | Controla tamaño de equipo, nivel medio y capturas por mapa |
| **Counter-picking dinámico** | Reordena el equipo antes de cada jefe por ventaja de tipo |
| **Carry principal protegido** | Mantiene sweepers clave como lead salvo matchup claramente inseguro |
| **Evaluación de trades** | Analiza si el intercambio mejora el equipo en lugar de rechazar |
| **Asignación inteligente de items** | Prioriza items S-Tier y equipa al carry del equipo |
| **Scouting legendario/masterball** | Detecta rutas y recompensas legendarias con scoring propio |
| **Challenges semanales** | Puede abrir retos semanales y seguir un orden configurable |
| **Evolución de Eevee configurable** | Automática por necesidades o forzada a una evolución |
| **Anti-stuck de 3 niveles** | Escalamiento: advertencia → forzar navegación → pánico |
| **Auto-restart infinito** | Game over → retry, victoria → escalar torre |
| **Historial de runs** | Guarda telemetría resumida en `localStorage` |
| **Estadísticas en consola** | Reporte cada 60s de loops, capturas, capturas por mapa, rerolls, items y swaps |

---

## 🏗 Arquitectura del Motor

```
┌─────────────────────────────────────────────────────┐
│                    ENGINE LOOP                       │
│                  (cada 1000ms)                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. getActiveScreen()      ← Detección de estado    │
│     ├── Eevee Overlay (z:201)                       │
│     ├── Evo Overlay (z:200)                         │
│     ├── Item Equip Modal                            │
│     └── .screen.active                              │
│                                                     │
│  2. antiStuckCheck()       ← Watchdog               │
│     ├── Tier 1: warn (5x)                           │
│     ├── Tier 2: force (10x)                         │
│     └── Tier 3: panic (15x)                         │
│                                                     │
│  3. switch(state)          ← State Machine          │
│     ├── Overlays (3)                                │
│     ├── Gameplay (10)                               │
│     ├── Meta (7)                                    │
│     └── Fallback                                    │
│                                                     │
│  4. AI subsystems          ← Decisiones             │
│     ├── Counter-Pick Optimizer                      │
│     ├── Catch Candidate Scorer + Rerolls            │
│     ├── Trade Evaluator                             │
│     ├── Map Node / Legendary Route Scorer           │
│     └── Run Telemetry                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Referencia de Datos del Juego

### ⚔️ Tabla de Efectividad de Tipos (18 tipos)

> Los tipos con ventaja ofensiva hacen **2x daño**. Los resistidos hacen **0.5x**. Las inmunidades hacen **0x**.

| Atacante ↓ \ Defensor → | Normal | Fire | Water | Electric | Grass | Ice | Fighting | Poison | Ground | Flying | Psychic | Bug | Rock | Ghost | Dragon | Dark | Steel | Fairy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Normal** | · | · | · | · | · | · | · | · | · | · | · | · | ½ | ✕ | · | · | ½ | · |
| **Fire** | · | ½ | ½ | · | 2 | 2 | · | · | · | · | · | 2 | ½ | · | ½ | · | 2 | · |
| **Water** | · | 2 | ½ | · | ½ | · | · | · | 2 | · | · | · | 2 | · | ½ | · | · | · |
| **Electric** | · | · | 2 | ½ | ½ | · | · | · | ✕ | 2 | · | · | · | · | ½ | · | · | · |
| **Grass** | · | ½ | 2 | · | ½ | · | · | ½ | 2 | ½ | · | ½ | 2 | · | ½ | · | ½ | · |
| **Ice** | · | ½ | ½ | · | 2 | ½ | · | · | 2 | 2 | · | · | · | · | 2 | · | ½ | · |
| **Fighting** | 2 | · | · | · | · | 2 | · | ½ | · | ½ | ½ | ½ | 2 | ✕ | · | 2 | 2 | ½ |
| **Poison** | · | · | · | · | 2 | · | · | ½ | ½ | · | · | · | ½ | ½ | · | · | ✕ | 2 |
| **Ground** | · | 2 | · | 2 | ½ | · | · | 2 | · | ✕ | · | ½ | 2 | · | · | · | 2 | · |
| **Flying** | · | · | · | ½ | 2 | · | 2 | · | · | · | · | 2 | ½ | · | · | · | ½ | · |
| **Psychic** | · | · | · | · | · | · | 2 | 2 | · | · | ½ | · | · | · | · | ✕ | ½ | · |
| **Bug** | · | ½ | · | · | 2 | · | ½ | ½ | · | ½ | 2 | · | · | ½ | · | 2 | ½ | ½ |
| **Rock** | · | 2 | · | · | · | 2 | ½ | · | ½ | 2 | · | 2 | · | · | · | · | ½ | · |
| **Ghost** | ✕ | · | · | · | · | · | · | · | · | · | 2 | · | · | 2 | · | ½ | · | · |
| **Dragon** | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 2 | · | ½ | ✕ |
| **Dark** | · | · | · | · | · | · | ½ | · | · | · | 2 | · | · | 2 | · | ½ | · | ½ |
| **Steel** | · | ½ | ½ | ½ | · | 2 | · | · | · | · | · | · | 2 | · | · | · | ½ | 2 |
| **Fairy** | · | ½ | · | · | · | · | 2 | ½ | · | · | · | · | · | · | 2 | 2 | ½ | · |

> `2` = Super Efectivo · `½` = No Muy Efectivo · `✕` = Inmune · `·` = Normal

---

### 🧬 Sistema de Rasgos (Traits)

Los rasgos se activan al tener suficientes Pokémon del mismo tipo en el equipo.  
**Los Pokémon Shiny cuentan como 2x** para los umbrales de rasgos.

| Tipo | Tier | Rasgo Lv.1 | Rasgo Lv.2 | Rasgo Lv.3 |
|------|------|-----------|-----------|-----------|
| **Bug** | B | Nivel +10% post-combate | +20% | +30% |
| **Dark** | S | +25% probabilidad de crítico | +50% | +75% |
| **Dragon** | S | +1 Atk/SpA al noquear | +2 | +3 |
| **Electric** | B | +20% ataque adicional | +40% | +60% |
| **Fairy** | B | +1 Atk/SpA al inicio | -2 Atk/SpA enemigo | -3 |
| **Flying** | B | +1 Speed al inicio | +2 | +3 |
| **Fire** | S | +1 Atk/SpA al inicio | +2 | +3 |
| **Fighting** | A | +1 Atk/SpA si aliado cae | +2 | +3 |
| **Grass** | A | Curar 15% del daño dado | 30% | 45% |
| **Ghost** | S | Ejecutar si HP <15% | <30% | <45% |
| **Ground** | B | -1 Speed enemigo al inicio | -2 | -3 |
| **Ice** | B | 12% Congelación +8% HP | 24% +16% | 36% +24% |
| **Normal** | A | +25% HP máximo | +50% | +75% |
| **Poison** | C | 1x Veneno on-hit (5%/stack) | 2x | 3x |
| **Psychic** | A | 10% Splash de daño al morir | 20% | 30% |
| **Rock** | B | +1 Def/SpDef post-ataque (33%) | +2 (66%) | +3 (100%) |
| **Steel** | A | 15% daño reducido | 30% | 45% |
| **Water** | A | -1 Atk/SpA/Spd enemigo (33%) | -2 (66%) | -3 (100%) |

#### Prioridad de Sinergias para Drafting

| Tier | Tipos | Razón |
|------|-------|-------|
| **S-Tier** | Ghost, Dark, Fire, Dragon | Ejecución, crit scaling, snowball ofensivo |
| **A-Tier** | Steel, Normal, Grass, Water, Fighting, Psychic | Tanqueo, sustain, debuffs |
| **B-Tier** | Bug, Electric, Ice, Ground, Flying, Fairy, Rock | Utilidad, leveleo, control |
| **C-Tier** | Poison | Efecto débil comparado |

---

### 🗡️ Movimientos por Tipo y Nivel

Cada tipo tiene 6 movimientos (3 Físicos + 3 Especiales), escalonados por nivel:

| Tipo | Físico Lv.1 | Físico Lv.2 | Físico Lv.3 | Especial Lv.1 | Especial Lv.2 | Especial Lv.3 |
|------|------------|------------|------------|--------------|--------------|--------------|
| **Bug** | Bug Bite (60) | X-Scissor (80) | Megahorn (120) | Struggle Bug (50) | Bug Buzz (90) | Pollen Puff (110) |
| **Dark** | Bite (40) | Crunch (80) | Knock Off (120) | Snarl (40) | Dark Pulse (80) | Night Daze (110) |
| **Dragon** | Twister (40) | Dragon Claw (80) | Outrage (120) | Dragon Breath (60) | Dragon Pulse (85) | Draco Meteor (130) |
| **Electric** | Spark (40) | Thunder Punch (75) | Bolt Strike (130) | Thunder Shock (40) | Thunderbolt (90) | Thunder (110) |
| **Fairy** | Fairy Wind (40) | Play Rough (90) | Spirit Break (130) | Disarming Voice (40) | Dazzling Gleam (80) | Moonblast (130) |
| **Flying** | Peck (50) | Aerial Ace (60) | Sky Attack (140) | Gust (40) | Air Slash (75) | Hurricane (110) |
| **Fire** | Ember (40) | Fire Punch (75) | Hare Blitz (120) | Incinerate (60) | Flamethrower (90) | Fire Blast (110) |
| **Fighting** | Karate Chop (50) | Cross Chop (100) | Close Combat (120) | Force Palm (60) | Aura Sphere (80) | Focus Blast (120) |
| **Grass** | Vine Whip (40) | Razor Leaf (65) | Power Whip (120) | Magical Leaf (40) | Energy Ball (90) | Solar Beam (120) |
| **Ghost** | Astonish (40) | Shadow Claw (70) | Phantom Force (90) | Lick (40) | Shadow Ball (80) | Shadow Force (100) |
| **Ground** | Mud Shot (55) | Earthquake (100) | Precipice Blades (120) | Bulldoze (60) | Earth Power (90) | Land's Wrath (110) |
| **Ice** | Powder Snow (40) | Ice Punch (75) | Icicle Crash (110) | Icy Wind (40) | Ice Beam (90) | Blizzard (110) |
| **Normal** | Tackle (40) | Body Slam (85) | Giga Impact (150) | Swift (60) | Hyper Voice (90) | Boomburst (140) |
| **Poison** | Poison Sting (40) | Poison Jab (80) | Gunk Shot (130) | Acid (40) | Sludge Bomb (100) | Acid Spray (120) |
| **Psychic** | Confusion (50) | Zen Headbutt (80) | Psycho Boost (140) | Psybeam (65) | Psychic (90) | Psystrike (100) |
| **Rock** | Rock Throw (50) | Rock Slide (75) | Stone Edge (100) | Smack Down (50) | Power Gem (80) | Rock Wrecker (150) |
| **Steel** | Metal Claw (50) | Iron Tail (100) | Heavy Slam (130) | Steel Wing (60) | Flash Cannon (90) | Doom Desire (140) |
| **Water** | Bubble (50) | Waterfall (80) | Aqua Tail (110) | Water Gun (50) | Surf (80) | Hydro Pump (110) |

---

### 🏟️ Base de Datos de Jefes (60+ entradas)

#### Kanto — Líderes de Gimnasio

| # | Líder | Ciudad | Tipo |
|---|-------|--------|------|
| 1 | Brock | Pewter City | Rock |
| 2 | Misty | Cerulean City | Water |
| 3 | Lt. Surge | Vermilion City | Electric |
| 4 | Erika | Celadon City | Grass |
| 5 | Koga | Fuchsia City | Poison |
| 6 | Sabrina | Saffron City | Psychic |
| 7 | Blaine | Cinnabar Island | Fire |
| 8 | Giovanni | Viridian City | Ground |

#### Kanto — Elite Four

| # | Miembro | Tipo |
|---|---------|------|
| 1 | Lorelei | Ice |
| 2 | Bruno | Fighting |
| 3 | Agatha | Ghost |
| 4 | Lance | Dragon |
| C | Blue / Gary | Mixed |

#### Johto — Líderes de Gimnasio

| # | Líder | Tipo |
|---|-------|------|
| 1 | Falkner | Flying |
| 2 | Bugsy | Bug |
| 3 | Whitney | Normal |
| 4 | Morty | Ghost |
| 5 | Chuck | Fighting |
| 6 | Jasmine | Steel |
| 7 | Pryce | Ice |
| 8 | Clair | Dragon |

#### Johto — Elite Four

| # | Miembro | Tipo |
|---|---------|------|
| 1 | Will | Psychic |
| 2 | Koga | Poison |
| 3 | Bruno | Fighting |
| 4 | Karen | Dark |
| C | Lance | Dragon |

#### Hoenn — Líderes de Gimnasio

| # | Líder | Tipo |
|---|-------|------|
| 1 | Roxanne | Rock |
| 2 | Brawly | Fighting |
| 3 | Wattson | Electric |
| 4 | Flannery | Fire |
| 5 | Norman | Normal |
| 6 | Winona | Flying |
| 7 | Tate & Liza | Psychic |
| 8 | Wallace | Water |

#### Hoenn — Elite Four

| # | Miembro | Tipo |
|---|---------|------|
| 1 | Sidney | Dark |
| 2 | Phoebe | Ghost |
| 3 | Glacia | Ice |
| 4 | Drake | Dragon |
| C | Steven | Steel |

#### Sinnoh — Líderes de Gimnasio

| # | Líder | Tipo |
|---|-------|------|
| 1 | Roark | Rock |
| 2 | Gardenia | Grass |
| 3 | Maylene | Fighting |
| 4 | Crasher Wake | Water |
| 5 | Fantina | Ghost |
| 6 | Byron | Steel |
| 7 | Candice | Ice |
| 8 | Volkner | Electric |

#### Sinnoh — Elite Four

| # | Miembro | Tipo |
|---|---------|------|
| 1 | Aaron | Bug |
| 2 | Bertha | Ground |
| 3 | Flint | Fire |
| 4 | Lucian | Psychic |
| C | Cynthia | Dragon (Mixed) |

---

### 🎒 Tier List de Items

| Tier | Item | Efecto |
|------|------|--------|
| **S** | Shell Bell | Cura ~1/8 del daño infligido |
| **S** | Lucky Egg | +30% prob. de ganar +1 nivel post-combate |
| **S** | Leftovers | Restaura 1/16 HP máximo por turno |
| **A** | Assault Vest | +50% Defensa Especial |
| **A** | Rocky Helmet | Daña al atacante en contacto |
| **A** | Choice Band | +Ataque (bloqueado a un movimiento) |
| **A** | Choice Specs | +Ataque Especial (bloqueado a un movimiento) |
| **A** | Rare Candy | Sube 1 nivel instantáneamente |
| **B** | Scope Lens | +Probabilidad de crítico |
| **B** | Wide Lens | +Precisión |
| **B** | Choice Scarf | +Velocidad (bloqueado a un movimiento) |
| **B** | Items de tipo | Charcoal, Mystic Water, Magnet, etc. (+tipo) |
| **C** | Eviolite | +Def/SpDef para Pokémon no completamente evolucionados |
| **C** | Life Orb | +30% daño, pierde HP por ataque |
| **C** | Expert Belt | +Daño super efectivo |
| **C** | Focus Band | Prob. de sobrevivir KO a 1 HP |
| **D** | Muscle Band | Pequeño boost de Ataque |
| **D** | Wise Glasses | Pequeño boost de Ataque Especial |
| **D** | Air Balloon | Inmune a Ground hasta ser golpeado |
| **D** | Focus Sash | Sobrevive 1 KO a 1 HP (una vez) |
| **F** | Metronome | Boost por movimiento consecutivo |

---

### 🦊 Evoluciones de Eevee

| Evolución | Tipo | Mejor Para |
|-----------|------|------------|
| **Vaporeon** | Water | Debuff enemigo, tank |
| **Jolteon** | Electric | Ataques adicionales |
| **Flareon** | Fire | Snowball ofensivo (S-tier trait) |
| **Espeon** | Psychic | Splash de daño al morir |
| **Umbreon** | Dark | Crit scaling (S-tier trait) |
| **Leafeon** | Grass | Sustain (heal on damage) |
| **Glaceon** | Ice | CC (freeze on-hit) |
| **Sylveon** | Fairy | Debuff enemigo al inicio |

En modo `auto`, el motor elige la evolución que:
1. Completa un rasgo cercano al siguiente tier
2. Cubre un tipo que falta en el equipo
3. Tiene ventaja contra el jefe actual

---

## 🧠 Sistemas de IA

### 1. Counter-Pick Optimizer

Antes de cada combate contra un jefe, el motor:
- Lee `#map-info` o `#elite-prep-enemy-name` para identificar al jefe
- Busca el jefe en la base de datos (60+ entradas) → obtiene su tipo
- Calcula un **score compuesto** para cada miembro del equipo:
  - `+5` por ventaja ofensiva de tipo
  - `-2` por desventaja ofensiva
  - `-10` por inmunidad del enemigo
  - `-3` por debilidad defensiva al tipo del jefe
  - `+HP/20` bonus por salud actual
- Arrastra al Pokémon con mejor score a la posición de líder (Slot 0)

### 2. Catch Candidate Scorer (Drafting por Sinergias)

Al aparecer candidatos de captura (`#catch-screen`):

```
Score = Trait Synergy + Type Coverage + Boss Counter

Trait Synergy:
  - Near threshold (1 away from T1/T2/T3) = tierValue × 2
  - Starting new synergy                   = tierValue × 0.5
  - Adding to existing                     = tierValue × 0.3

Type Coverage:
  - New type not in team = +5

Boss Counter:
  - Type advantage vs next boss = +2.5
```

Si el equipo tiene 6 y ningún candidato supera score 2 → skip.

### 3. Trade Evaluator

Al recibir una oferta de trade (`#trade-screen`):
- Calcula el score del Pokémon ofrecido usando el Catch Scorer
- Calcula el score del miembro más débil del equipo
- Acepta si `incomingScore > weakestScore + 2`
- Rechaza en caso contrario

### 4. Map Pathing & Node Scorer (Graph AI)

El motor mapea el árbol de niveles asegurando una navegación perfecta, eliminando "saltos ciegos". Dado que el mapa siempre tiene una topología predecible de 23 nodos en forma de diamante (filas de 1-2-3-4-3-4-3-2-1), la IA utiliza un grafo de adyacencia (Adjacency List) exacto y precalculado que conecta perfectamente el punto de inicio (abajo, nodo 22) con el Jefe Final (arriba, nodo 0). Nunca asume conexiones erróneas: evalúa explícitamente cada ruta posible hacia el jefe y escoge el camino óptimo simulando recursivamente la profundidad configurada en `PATH_LOOKAHEAD_DEPTH`.

Calcula una prioridad dinámica para cada nodo que se encuentra en esas rutas seguras:

| Nodo | Score Base | Modificador HP & Táctico |
|------|-----------|----------------|
| PokéCenter | -200 ~ +5000 | +5000 si hay muertos, +4000 si HP<30%, -200 si el equipo está sano. |
| Científico/Buff | +500 | Sinergia alta si el equipo requiere entrenamiento (`earlyLevelingPriority`). |
| Item | +450 | Bonus masivos (+720) si el Carry principal no tiene objeto equipado. |
| Pokéball / Grass | +150 ~ +400 | Altísima prioridad si el equipo es pequeño. Penaliza si excede el límite por mapa o la expansión ya cerró. |
| Entrenador | +100 ~ +300 | +300 si HP>50%, compensa mucho más el XP si el core está underleveled. |
| Jefe/Gym/Legendario | -500 ~ +3600 | Score masivo (+3600) pero penaliza dramáticamente si falta nivel (`underlevel penalty`) o vida. |
| Trade/NPC | +200 | Prioridad media-baja, valioso solo si la oferta supera nuestro equipo. |

**Tácticas y Scoring Lookahead:** 
En vez de evaluar solo el paso inmediato, el motor simula todas las bifurcaciones a X pisos de profundidad. Por ejemplo, evalúa que ir a la izquierda otorga un Entrenador y un Centro, pero ir a la derecha da Item y Batalla Legendaria. Usa heurísticas de estado general (`context`) para sumar puntos globales a una rama entera si la ruta resuelve carencias del equipo (ej. resta miles de puntos a ramas con capturas si ya llenamos el cupo de `MAX_CATCHES_PER_MAP` en este piso). Finalmente usa un desempate numérico espacial `xCoord % 17` para evitar atascarse en la parte izquierda del mapa cuando las rutas son simétricas.

### 5. Early Economy Controller

En los primeros mapas no intenta llenar 6 huecos a cualquier precio. Mantiene un core mínimo (`EARLY_CORE_TEAM_SIZE`), permite una banca cómoda (`EARLY_OPTIONAL_TEAM_SIZE`) y compara el nivel medio/lead contra los umbrales de preparación antes de entrar a jefes.

Si una captura baja demasiado el nivel medio (`EARLY_MAX_CATCH_AVG_LEVEL_DROP`) o no supera el score mínimo, el motor prefiere entrenar, curar o rerollear.

### 6. Catch Reroll Controller

En `catch-screen`, además de puntuar candidatos, detecta controles de reroll por carta o globales. Protege cartas buenas (`CATCH_REROLL_PROTECT_SCORE`), shiny, premium o legendarias, y gasta rerolls en cartas débiles hasta los límites configurados por encuentro.

### 7. Main Carry Protector

Los nombres de `MAIN_CARRY_NAMES` reciben stickiness para seguir como lead. Otro Pokémon solo desplaza al carry si supera el margen configurado o si el matchup del carry es peligroso. La misma idea se usa para items: curaciones y upgrades importantes reciben bonus si van al carry.

### 8. Run Telemetry

El motor guarda historial local de runs en `localStorage` con capturas, rerolls, pantallas visitadas, nodos legendarios, decisiones de mapa y resultado. El límite se controla con `RUN_HISTORY_MAX_ENTRIES` y `RUN_EVENT_LOG_MAX_ENTRIES`.

---

## 📺 Pantallas Manejadas (25 estados)

### Overlays (Prioridad Máxima)

| Estado | Handler | Acción |
|--------|---------|--------|
| `EEVEE_CHOICE` | `handleEeveeChoice()` | Elige evolución por necesidad del equipo o preferencia |
| `EVO_OVERLAY` | `handleEvoOverlay()` | Click para bypass de animación |
| `ITEM_EQUIP_MODAL` | `handleItemEquipModal()` | Equipa al Pokémon con más HP |

### Gameplay Core

| Estado | Handler | Acción |
|--------|---------|--------|
| `map-screen` | `handleMapScreen()` | Pathfinding con HP scoring |
| `battle-screen` | `handleBattleScreen()` | Skip/Continue automático |
| `catch-screen` | `handleCatchScreen()` | Drafting inteligente por traits |
| `item-screen` | `handleItemScreen()` | Selección rankeada por tier |
| `passive-screen` | `handlePassiveScreen()` | Selección de items pasivos |
| `swap-screen` | `handleSwapScreen()` | Evalúa incoming vs weakest |
| `trade-screen` | `handleTradeScreen()` | Evalúa trade offers |
| `shiny-screen` | `handleShinyScreen()` | Aceptar/continuar |
| `badge-screen` | `handleBadgeScreen()` | Click "Next Map" |
| `stat-buff-screen` | `handleStatBuffScreen()` | EV a Atk > Speed > HP |
| `elite-prep-screen` | `handleElitePrepScreen()` | Reordena equipo + click FIGHT |
| `transition-screen` | `handleTransitionScreen()` | Auto-continue |

### Meta / Menús

| Estado | Handler | Acción |
|--------|---------|--------|
| `gameover-screen` | `handleGameOverScreen()` | Auto-restart (Play Again) |
| `win-screen` | `handleWinScreen()` | Escalar torre o jugar de nuevo |
| `endless-stage-complete` | `handleStageComplete()` | Continuar a siguiente stage |
| `title-screen` | `handleTitleScreen()` | Auto-start Battle Tower |
| `challenge-select` | `handleChallengeSelectScreen()` | Abrir challenges o weekly según configuración |
| `weekly-select` | `handleWeeklySelectScreen()` | Elegir el siguiente subreto semanal |
| `trainer-screen` | `handleTrainerScreen()` | Selección automática |
| `starter-screen` | `handleStarterScreen()` | Starter por mejor trait tier |
| `endless-stage-select` | `handleEndlessStageSelect()` | Último stage desbloqueado |
| `history-region-select` | — | Story/history detectado, pero no automatizado |

---

## 🛡️ Anti-Stuck Watchdog

El motor rastrea loops consecutivos en el mismo estado:

| Nivel | Loops | Acción |
|-------|-------|--------|
| ⚠️ Warning | 5 | Log de advertencia en consola |
| 🔧 Force | 10 | Intenta clickear botones de navegación genéricos |
| 🚨 Panic | 30 | Click en CUALQUIER botón visible en la página |

Selectores de navegación genéricos:
```css
.btn-next, #btn-stage-continue, .choice-skip-btn,
#btn-skip-catch, #btn-skip-trade, #btn-cancel-swap,
#btn-equip-to-bag, #btn-equip-cancel, #btn-cancel-use, #btn-next-map,
#btn-continue-battle, #btn-auto-battle, #btn-elite-prep-continue,
.elite-prep-fight-btn, #btn-retry, #btn-play-again,
#btn-challenges-run, #btn-continue-challenge, #chal-intro,
#chal-weekly, #weekly-back, .weekly-sub
```

---

## 🎮 Física del Motor

### Click en SVG

Los nodos del mapa son SVG inline con `<rect>` y `<image>` internos. El `.click()` estándar no funciona. El motor simula una secuencia completa de hardware:

```javascript
PointerDown → MouseDown → PointerUp → MouseUp → Click
```

Con coordenadas calculadas desde `getBoundingClientRect()`.

### Drag & Drop Cinemático

El reordenamiento del equipo usa gesture-gating. El motor simula arrastre físico con **5 pasos de interpolación**:

```
1. PointerDown + MouseDown en el centro del origen
2. 5× PointerMove + MouseMove interpolados entre origen y destino
3. PointerUp + MouseUp en el centro del destino
```

---

## 🔍 Selectores DOM Clave

| Elemento | Selector |
|----------|----------|
| Equipo (slots) | `#team-bar .team-slot` |
| Nombre Pokémon | `.team-slot-name` |
| Barra HP | `.hp-bar-fill` (width = HP%) |
| Mapa SVG | `#map-container` |
| Nodos clickeables | `.map-node--clickable` |
| Info del mapa/jefe | `#map-info` |
| Panel de traits | `#endless-trait-panel` |
| Items reward | `#item-choices .item-card` |
| Items pasivos | `#passive-choices` |
| Equip modal rows | `#item-equip-modal .equip-pokemon-row` |
| Catch candidates | `#catch-choices .poke-card` |
| Catch reroll | `[data-reroll]`, `[class*="reroll"]`, `[id*="reroll"]` |
| Swap choices | `#swap-choices` |
| Evo overlay | `#evo-overlay` |
| Eevee overlay | `#eevee-choice-overlay` |
| Battle skip | `#btn-auto-battle` |
| Battle continue | `#btn-continue-battle` |
| Stat buffs | `#stat-buff-choices` |
| Elite prep fight | `#btn-elite-prep-continue` |
| Game over retry | `#btn-retry` |
| Win play again | `#btn-play-again` |
| Badge next map | `#btn-next-map` |
| Challenge run | `#btn-challenges-run`, `#btn-continue-challenge` |
| Weekly challenge | `#chal-weekly`, `#weekly-back`, `.weekly-sub` |

---

## 📝 Changelog v6.0 → v7.4

| Área | v6.0 | v7.4 |
|------|------|------|
| **Pantallas** | 6 | **25** |
| **Tipo chart** | 4 tipos parciales | **18 tipos completos** |
| **Pokémon DB** | 11 hardcoded | **250+** (Gen 1-3) |
| **Jefes** | 5 entries | **60+** (4 regiones + E4) |
| **Traits** | No implementado | **18 × 3 tiers** con S/A/B/C ranking |
| **Items** | Tomar el primero | **30+ items** rankeados S→F |
| **Catch AI** | Tomar el primero | **Drafting por sinergias + rerolls controlados** |
| **Early game** | Sin economía | **Core mínimo, capturas por mapa y umbrales de nivel** |
| **Trades** | No manejado | **Evaluación** vs equipo actual |
| **Carry** | No protegido | **Lead stickiness + prioridad de items** |
| **Legendarios** | No detectados | **Scoring de nodos masterball/legendary** |
| **Challenges** | No manejados | **Challenge mode y weekly challenge select** |
| **Run history** | No | **Telemetría en localStorage** |
| **Anti-stuck** | Ninguno | **3 niveles** de escalamiento |
| **Eevee** | No manejado | **Configurable** (auto o manual) |
| **Auto-restart** | No | **Sí** (game over + win) |
| **Drag & Drop** | 1-step | **5-step interpolación** |
| **Logging** | Básico | **4 niveles** + stats cada 60s |

---

## 📄 Licencia

Proyecto personal de automatización. No afiliado con Nintendo, Game Freak o The Pokémon Company.  
Pokelike.xyz es un proyecto fan-made independiente.
