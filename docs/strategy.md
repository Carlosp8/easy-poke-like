# Estrategia Del Bot

Esta pagina resume como el motor toma decisiones. El objetivo es que una persona
pueda entender por que el bot eligio una ruta, captura, item o cambio de equipo
sin leer todo el core.

## Mapa

El bot parsea el arbol del mapa y puntua cada nodo clicable. Usa varias fuentes:

- grafo hardcoded de 23 nodos;
- lineas SVG reales;
- fallback por capas cuando no hay grafo suficiente;
- clasificacion por sprite y texto;
- contexto de equipo, boss, tactic, HP, nivel y run mode.

Prioridades habituales:

| Nodo              | Sube cuando                                                   |
| ----------------- | ------------------------------------------------------------- |
| `trainer`         | Falta nivel o la tactica es XP/Duplicados.                    |
| `buff`            | Falta ofensiva, velocidad o preparacion de boss.              |
| `item`            | Hay carry sin item, MT util, rare candy o item decisivo.      |
| `center`          | Hay fainted, HP critico o boss cercano.                       |
| `catch` / `grass` | Falta equipo, shiny, counter, legendario o duplicado tactico. |
| `legendary`       | El equipo esta preparado y puede sobrevivir.                  |
| `boss`            | La preparacion ya cumple nivel, HP y matchup.                 |

Los logs de ruta incluyen indices, tipos, fuente del grafo y estrategia elegida.

## Capturas

El scoring de captura considera:

- shiny nuevo o repetido;
- stats base y rol ofensivo;
- tipos y traits;
- cobertura contra boss;
- ataques probables;
- nivel proyectado;
- valor de legendario;
- plan Sinnoh/Arceus/Cynthia;
- plan de desafio o historia;
- soporte Grass/sustain;
- duplicados si la tactica `Duplicados` esta activa.

Las reglas puras relacionadas viven principalmente en
`src/core/lib/strategy/catch-scoring.ts`, con soporte de `type-matchups.ts`,
`team-utils.ts` y `card-scoring.ts`. El runtime prepara datos desde el DOM y
estas funciones calculan scores, razones y detalles testeables.

En tactica `Shiny`, el bot puede scoutear mas nodos de captura, pero reduce esa
prioridad si hay demasiada presion de entrenamiento o boss prep.

## Duplicados

Los duplicados son una tactica explicita:

- `getBotControlDuplicateCatchesEnabled()` solo devuelve true si
  `tactic === 'duplicate'`.
- La estrategia intenta abrir una primera pareja duplicada si hay espacio.
- Protege parejas duplicadas frente a reemplazos.
- Puede reordenar el equipo para liderar con una unidad de la pareja.
- Limita nodos de captura dedicados con `DUPLICATE_PRIORITY_CATCH_NODE_LIMIT`.

## Items Y MT

Antes de abrir un modal de item, el bot comprueba:

- cooldown del item;
- si la misma asignacion ya fue rechazada;
- si hay target valido;
- si mejora realmente a algun Pokemon;
- si la MT Normal aun es necesaria.

Items de bajo valor evitados:

- `lagging tail`;
- `king's rock`;
- `eviolite`;
- `focus band`;
- `focus sash`;
- `air balloon`.

Protecciones contra loops:

- `shouldAttemptMapBagItem`;
- `shouldAttemptElitePrepBagItem`;
- `markItemKeptInBag`;
- fallback de botones de modal, incluyendo `btn-skip-tutor`.

## Orden De Equipo

Antes de trainer, boss o legendary:

- detecta el perfil del rival si esta disponible;
- calcula mejor lead por ofensiva, defensa, nivel e item;
- mantiene el carry si el cambio no compensa;
- respeta locks del panel;
- evita swaps repetidos o equivalentes;
- en tactica `Duplicados` puede ordenar por pareja duplicada incluso sin rival
  detectado.

## Centro Pokemon

El centro se evita si:

- no hay fainted;
- no hay HP critico;
- la media de HP esta alta;
- el carry puede sobrevivir y esta preparado.

Se prioriza si:

- hay fainted;
- hay varios miembros con poca vida;
- el carry esta en peligro;
- se acerca un boss y falta margen de supervivencia.

## Starter, Pasivas, Buffs Y Eevee

Starter:

- modo manual no toca nada;
- modo forzado busca el nombre configurado;
- auto valora carry, stats, traits, shiny y planes de modo.

Pasivas:

- valora tipos del equipo y del carry;
- traits de alto impacto;
- shiny passive cards;
- sustain, survival, damage, speed y scaling;
- contexto de boss, historia, desafio y Sinnoh.

El scoring puro de pasivas vive en `src/core/lib/strategy/passive-scoring.ts`.
`03-detection-strategy.js` conserva el parsing de cards y equipo visible, pero
la puntuacion reusable se calcula con snapshots explicitos.

Buffs:

- prefieren carry o rol ofensivo;
- en Sinnoh suben mucho ofensiva, velocidad y MT si faltan.

Eevee:

- respeta `CONFIG.EEVEE_EVOLUTION_PREFERENCE`;
- en auto decide por cobertura, traits y boss objetivo.

## Pantallas Manejadas

- title screen;
- challenge select;
- weekly select;
- trainer screen;
- starter screen;
- endless stage select;
- history region select;
- starting item screen;
- map screen;
- battle screen;
- catch screen;
- item screen;
- passive screen;
- swap screen;
- trade screen;
- shiny screen;
- badge screen;
- stat buff screen;
- elite prep screen;
- transition screen;
- game over;
- win screen;
- overlays de evolucion y Eevee;
- modal de equipar/usar item.
