# Easy Pokelike 9.5 - Fusion Engine

Userscript de Tampermonkey para automatizar runs de Pokelike. La version 9.5 fusiona la base 9.3 con mejoras recuperadas de la rama 8.7: historia, desafios, shiny, duplicados por tactica, items, MT, rutas con diagnostico, panel visual, anti-stuck y auto-restart.

## Indice

- [Instalacion](#instalacion)
- [Panel de control](#panel-de-control)
- [Tacticas](#tacticas)
- [Modos de run](#modos-de-run)
- [Caracteristicas](#caracteristicas)
- [Toma de decisiones](#toma-de-decisiones)
- [Sistemas principales](#sistemas-principales)
- [Pantallas manejadas](#pantallas-manejadas)
- [Datos incluidos](#datos-incluidos)
- [Persistencia y telemetria](#persistencia-y-telemetria)
- [Anti-stuck](#anti-stuck)
- [Notas de version 9.5](#notas-de-version-95)

## Instalacion

1. Instala Tampermonkey o un gestor compatible de userscripts.
2. Crea un nuevo userscript.
3. Pega el contenido de [`easy-pokelike.user.js`](easy-pokelike.user.js).
4. Guarda el script y abre `pokelike.xyz`.
5. Comprueba que aparece el panel flotante `Engine 7`.

El userscript se ejecuta con:

- `@match *://*.pokelike.xyz/*`
- `@run-at document-start`
- `@grant none`

## Panel de control

El panel flotante es persistente y se guarda en `localStorage` con la key `engine7_bot_controls_v1`. Tambien migra datos antiguos desde `pokelike_bot_controls`.

Controles actuales:

- `Modo run`: selecciona Torre batalla, Historia, Desafio semanal, Desafio, Auto config o Manual.
- `Mapa/region`: texto opcional para elegir mapa, region o subdesafio visible. Ejemplos: `Sinnoh`, `Kanto`, `Lorelei`.
- `Tactica`: cambia las prioridades del bot durante la run.
- `Principal`: fuerza un Pokemon visible como carry principal.
- `Starter`: permite `Auto IA`, `Forzar nombre` o `Jugador`.
- `Nombre starter`: nombre usado cuando `Starter` esta en `Forzar nombre`.
- `Restart automatico`: activa o desactiva el reinicio automatico tras victoria o derrota.
- Boton por Pokemon `M/+`: marca o desmarca el Pokemon como principal.
- Click sobre sprite del Pokemon: bloquea o libera ese Pokemon frente a reemplazos.

El panel visual de 9.5 usa una cuadricula compacta:

- verde: Pokemon normal;
- naranja: vida baja;
- rojo: bloqueado;
- borde amarillo: principal;
- barra inferior: HP actual;
- redimensionable con `resize: both`;
- plegable para ocupar menos espacio.

Ya no existe la casilla `Permitir duplicados`. Los duplicados se activan solo con la tactica `Duplicados`; al usar cualquier otra tactica quedan desactivados.

## Tacticas

Las tacticas disponibles son:

- `Auto`: scoring general equilibrado.
- `Boss prep`: prioriza preparacion para jefes, items, buffs, nivel y supervivencia.
- `Captura`: favorece nodos de captura y grass cuando el equipo aun necesita opciones.
- `Shiny`: prioriza scouting shiny, con limites para no sacrificar runs con presion de nivel.
- `XP`: prioriza trainers y rutas de entrenamiento.
- `Duplicados`: activa capturas duplicadas y estrategia de parejas duplicadas.

Regla importante:

- Solo `Duplicados` habilita capturas duplicadas.
- Las demas tacticas fuerzan duplicados desactivados, incluso si habia un estado antiguo guardado.

## Modos de run

`Modo run` controla como arranca o reanuda el bot:

- `Torre batalla`: reanuda o inicia Battle Tower.
- `Historia`: abre modo historia y usa `Mapa/region` para seleccionar region.
- `Desafio semanal`: abre desafios semanales y escoge subdesafio por texto u orden configurado.
- `Desafio`: abre challenge mode.
- `Auto config`: usa `CONFIG.AUTO_START_MODES` y `CONFIG.AUTO_START_PRIORITY`.
- `Manual`: no inicia runs automaticamente.

## Caracteristicas

- Automatizacion de Torre, Historia, Challenge Mode y desafios semanales.
- Panel visual redimensionable con carry, locks, starter, mapa y auto-restart.
- Scoring de rutas con lookahead profundo (`PATH_LOOKAHEAD_DEPTH`).
- Clasificacion de nodos por texto y por sprite.
- Diagnostico de rutas candidatas: indices, tipos, fuente del grafo y estrategia elegida.
- Capturas con valoracion de stats, tipos, traits, shiny, legendarios, counters y duplicados.
- Reroll de capturas con limites por estado y por encuentro.
- Proteccion de shinies visibles al usar tactica Shiny.
- Estrategia de duplicados solo en tactica Duplicados.
- Items inteligentes: equipar, usar, mandar a bolsa y evitar loops de modales.
- Soporte para MT Normal / Move Tutor con seleccion de objetivo.
- Preparacion de bosses por nivel medio, nivel de lead y matchup.
- Reordenamiento de equipo con proteccion de carry y locks.
- Deteccion de mapas Sinnoh y plan especial para Arceus/Cynthia.
- Estrategias especificas para Historia y Desafios.
- Telemetria de run y resumen de eventos.
- Anti-stuck con click alternativo en mapa y fallback de navegacion.

## Toma de decisiones

### Mapa

El bot parsea el arbol del mapa y puntua cada nodo clicable. Tiene soporte para:

- grafo hardcoded de 23 nodos;
- lineas SVG reales;
- fallback por capas si no hay grafo suficiente;
- clasificacion por sprite (`masterball`, `pokecenter`, `trainer`, `grass`, `item`, etc.);
- logs de ruta con `routeIndexes`, `routeTypes`, `routeKnowledge`, `routeStrategy` y `edgeMode`.

Prioridades tipicas:

- `trainer`: sube si falta nivel o la tactica es XP/Duplicados.
- `buff`: sube si falta ofensiva, velocidad o preparacion de boss.
- `item`: sube si hay carry sin item, MT util, rare candy o item decisivo.
- `center`: sube si hay fainted o HP critico; baja si el equipo esta sano.
- `catch/grass`: sube si falta equipo, shiny, counter, legendario o duplicado tactico.
- `legendary`: se valora alto si el equipo esta preparado.
- `boss`: se evita si faltan niveles o HP, salvo que la preparacion ya sea suficiente.

### Capturas

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
- duplicados utiles si la tactica Duplicados esta activa.

En tactica Shiny, el bot puede scoutear mas nodos de captura, pero reduce esa prioridad si hay demasiada presion de entrenamiento o boss prep.

### Duplicados

La version 9.5 deja duplicados como una tactica explicita:

- `getBotControlDuplicateCatchesEnabled()` solo devuelve true si `tactic === 'duplicate'`.
- La estrategia intenta abrir una primera pareja duplicada si hay espacio.
- Protege parejas duplicadas frente a reemplazos.
- Puede reordenar el equipo para liderar con una unidad de la pareja.
- Limita nodos de captura dedicados con `DUPLICATE_PRIORITY_CATCH_NODE_LIMIT`.

### Items y MT

El bot detecta items en barra normal y en elite prep. Antes de abrir un modal comprueba:

- si el item esta en cooldown;
- si el mismo estado de equipo ya rechazo esa asignacion;
- si hay target valido;
- si el item mejora realmente a algun Pokemon;
- si la MT Normal aun es necesaria.

Evita equipar items de bajo valor como:

- `lagging tail`;
- `king's rock`;
- `eviolite`;
- `focus band`;
- `focus sash`;
- `air balloon`.

Incluye protecciones contra loops:

- `shouldAttemptMapBagItem`;
- `shouldAttemptElitePrepBagItem`;
- `markItemKeptInBag`;
- fallback de botones de modal, incluyendo `btn-skip-tutor`.

### Orden de equipo

Antes de trainer, boss o legendary:

- detecta el perfil del rival si esta disponible;
- calcula mejor lead por ofensiva, defensa, nivel e item;
- mantiene el carry si el cambio no compensa;
- respeta locks del panel;
- evita swaps repetidos o equivalentes;
- en tactica Duplicados puede ordenar por pareja duplicada incluso sin rival detectado.

### Centro Pokemon

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

### Starter, pasivas, buffs y Eevee

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

Buffs:

- prefieren carry o rol ofensivo;
- en Sinnoh suben mucho ofensiva, velocidad y MT si faltan.

Eevee:

- respeta `CONFIG.EEVEE_EVOLUTION_PREFERENCE`;
- en auto decide por cobertura, traits y boss objetivo.

## Sistemas principales

- `engineLoop`: loop central cada `CONFIG.LOOP_SPEED_MS`.
- `getActiveScreen`: deteccion de pantalla y modales.
- `ensureBotControlPanel`: render del panel flotante.
- `handleMapScreen`: ruta, items de mapa y reordenamiento previo.
- `handleCatchScreen`: scoring, captura y reroll.
- `handleItemScreen`: eleccion de recompensa.
- `handleItemEquipModal`: equipar/usar items y MT.
- `handlePassiveScreen`: pasivas y cartas bloqueadas.
- `handleElitePrepScreen`: preparacion final antes de combate elite.
- `antiStuckCheck`: watchdog contra bucles.
- `recordRunEvent` / `updateRunProgress`: telemetria.

## Pantallas manejadas

El motor maneja:

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

## Datos incluidos

El script incluye:

- tabla de efectividad de 18 tipos;
- sistema de traits por tipo y tier;
- base de Pokemon conocida;
- overrides de stats y tipo de ataque principal;
- pools de movimientos por tipo;
- base de bosses de Kanto, Johto, Hoenn, Sinnoh y Unova;
- planes especiales de Sinnoh para Arceus y Cynthia;
- tier list de items;
- traducciones de items ingles/espanol;
- evoluciones de Eevee;
- heuristicas de clases de trainer por sprite/nombre.

## Persistencia y telemetria

Keys principales:

- `engine7_bot_controls_v1`: estado del panel.
- `pokelike_bot_controls`: key legacy migrada.
- `engine7_run_history_v1`: historial de runs.
- `pokelike_run_history`: historial legacy migrado.

La telemetria registra eventos como:

- inicio/reinicio de run;
- cambios de pantalla;
- eleccion de mapa;
- capturas;
- rerolls;
- items omitidos;
- pasivas elegidas;
- auto battle;
- fin de run.

## Anti-stuck

El watchdog compara una firma de progreso por pantalla. En mapa incluye:

- key del mapa;
- capturas del mapa;
- nodos clicables;
- estado resumido del equipo.

Si detecta bloqueo:

- primero avisa;
- luego fuerza navegacion generica;
- en mapa intenta otro nodo;
- en panico intenta cualquier boton visible habilitado.

## Notas de version 9.5

- README actualizado a `Easy Pokelike 9.5`.
- Banner de consola actualizado a `Easy Pokelike v9.5 - Fusion Engine`.
- Panel visual compacto recuperado: cuadricula de sprites, HP, lock, principal y resize.
- Eliminada la casilla `Permitir duplicados`.
- Duplicados ahora dependen solo de la tactica `Duplicados`.
- Estados guardados antiguos ya no pueden activar duplicados fuera de esa tactica.
- Fusionadas mejoras de 8.7: rutas por sprite, logs de ruta, fallback de modales, proteccion de items repetidos y estrategia de duplicados.
- Conservadas mejoras de 9.3/9.4: historia, desafios, shiny, MT, Sinnoh, Arceus/Cynthia, telemetry y auto-restart.
