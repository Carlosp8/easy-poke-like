# Pokelike Tower Engine v8.7 - Documentacion y Toma de Decisiones

## Indice

- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Caracteristicas](#caracteristicas)
- [Arquitectura del Motor](#arquitectura-del-motor)
- [Resumen de Toma de Decisiones](#resumen-de-toma-de-decisiones)
- [Referencia de Datos del Juego](#referencia-de-datos-del-juego)
  - [Tabla de Efectividad de Tipos](#tabla-de-efectividad-de-tipos)
  - [Sistema de Rasgos Traits](#sistema-de-rasgos-traits)
  - [Movimientos por Tipo y Nivel](#movimientos-por-tipo-y-nivel)
  - [Base de Datos de Jefes](#base-de-datos-de-jefes)
  - [Tier List de Items](#tier-list-de-items)
  - [Evoluciones de Eevee](#evoluciones-de-eevee)
- [Sistemas de IA](#sistemas-de-ia)
- [Pantallas Manejadas](#pantallas-manejadas)
- [Anti-Stuck Watchdog](#anti-stuck-watchdog)
- [Fisica del Motor](#fisica-del-motor)
- [Selectores DOM Clave](#selectores-dom-clave)
- [Changelog v8.1 a v8.7](#changelog-v81-a-v87)

## Instalacion

1. Instalar Tampermonkey o un gestor compatible de userscripts.
2. Crear un nuevo userscript.
3. Pegar el contenido de [`pokelike-engine-v7.user.js`](pokelike-engine-v7.user.js).
4. Guardar y abrir `pokelike.xyz`.
5. Verificar que aparece el panel flotante `Engine 7`.

## Configuracion

La configuracion principal esta en dos sitios:

- Constante `CONFIG`, al inicio de [`pokelike-engine-v7.user.js`](pokelike-engine-v7.user.js).
- Panel lateral persistente, guardado en `localStorage` con la key `engine7_bot_controls_v1`.

Controles actuales del panel:

- `Modo run`: elige si el bot debe jugar `Torre batalla`, `Historia`, `Desafio semanal`, `Desafio`, `Auto config` o `Manual`.
- `Mapa/region`: texto opcional para escoger un mapa, region o subdesafio visible. Ejemplos: `Sinnoh`, `Lorelei`, `Kanto`.
- `Tactica`: modifica prioridades del mapa. Puede ser `Auto`, `Boss prep`, `Captura`, `XP` o `Duplicados`.
- `Principal`: fuerza un Pokemon del equipo como carry principal.
- `Starter`: `Auto IA`, `Forzar nombre` o `Jugador`.
- `Nombre starter`: nombre usado si el modo starter esta en `Forzar nombre`.
- `Restart automatico`: activa o desactiva reinicio automatico tras victoria/derrota.
- Botones por Pokemon: marcar principal o bloquear para que no sea reemplazado.
- Panel minimizable: al plegarlo se convierte en una pestana compacta para movil.

## Caracteristicas

- Automatiza torre, desafios y parte de historia.
- Selecciona mapa/region/subdesafio segun el panel.
- Evalua starters, capturas, items, pasivas, rutas y orden de equipo.
- Prioriza preparacion contra Arceus y la jefa final posterior.
- Protege el carry principal y le reserva los mejores items.
- Prioriza shinies al inicio de la run.
- Evita capturas sin sentido cuando la run ya esta asentada.
- Evita centros Pokemon si el equipo/carry llega sano.
- Reordena el equipo antes de bosses si hay mejor lead.
- Tiene anti-stuck y telemetria de runs.

## Arquitectura del Motor

El motor funciona como un loop periodico:

1. Detecta la pantalla activa con `getActiveScreen`.
2. Refresca informacion visible de Pokemon.
3. Renderiza/actualiza el panel lateral.
4. Si no esta pausado, ejecuta el handler de la pantalla actual.
5. Registra eventos importantes en telemetria.
6. Aplica anti-stuck si detecta que lleva varios ciclos sin progresar.

Flujo general:

```text
engineLoop
  -> getActiveScreen
  -> refreshVisiblePokemonInfoCache
  -> ensureBotControlPanel
  -> syncCatchScreenSession
  -> handler de pantalla
  -> recordRunEvent / updateRunProgress
  -> antiStuckCheck
```

## Resumen de Toma de Decisiones

### 1. Pantalla de titulo

El bot mira `Modo run` del panel:

- `Torre batalla`: resume torre si no hay mapa objetivo; si hay mapa objetivo, prefiere iniciar seleccion para escoger region.
- `Historia`: abre modo historia y luego selecciona la region que coincida con `Mapa/region`.
- `Desafio semanal`: abre desafios y escoge el subdesafio que coincida con `Mapa/region`, o sigue el orden configurado.
- `Desafio`: abre challenge mode.
- `Manual`: no arranca nada automaticamente.
- `Auto config`: usa la configuracion antigua de `CONFIG.AUTO_START_MODES`.

### 2. Starter

Orden de decision:

1. Si `Starter = Jugador`, no toca nada.
2. Si `Starter = Forzar nombre`, busca el nombre configurado.
3. Si no lo encuentra, cae a scoring automatico.
4. El scoring valora:
   - carry configurado,
   - stats ofensivas,
   - rasgos utiles,
   - shiny,
   - ajuste al plan Sinnoh/Arceus/final.

### 3. Ruta del mapa

Cada nodo del mapa recibe puntuacion:

- `trainer`: sube mucho si falta nivel para el boss.
- `buff`: sube si falta ofensiva, velocidad o preparacion.
- `item`: sube si el carry necesita item; baja si falta nivel y el item no es urgente.
- `center`: sube si hay fainted o HP critico; baja si el equipo/carry va sano.
- `catch/grass`: sube si hace falta equipo o shiny; baja si la run ya esta asentada o hay deficit de nivel.
- `legendary`: sube si el equipo esta preparado; baja si hay poca vida o falta nivel.
- `boss`: solo se toma bien si la preparacion de nivel y matchup es suficiente.

Despues calcula futuro con lookahead (`PATH_LOOKAHEAD_DEPTH`) y elige el mejor camino, no solo el mejor nodo inmediato.

### 4. Centro Pokemon

Evita el centro si:

- no hay fainted,
- no hay HP critico,
- el equipo tiene HP alto,
- o el carry esta sano y preparado contra el siguiente boss.

Lo prioriza si:

- hay Pokemon debilitados,
- la media de HP es baja,
- hay varios miembros bajos de vida,
- o el boss se acerca y el equipo no llega seguro.

### 5. Capturas y rerolls

Primeros mapas:

- En mapas 1 a 3 busca shinies agresivamente.
- Si no hay shiny en las pokeballs, intenta reroll hasta el limite configurado.
- Si tras scoutear no hay shiny ni candidato fuerte, no captura por rellenar.

Run avanzada:

- A partir del mapa 4 aprox. exige que la captura tenga sentido.
- Acepta si es shiny, legendario, counter directo, duplicado util, plan fuerte para Arceus/final o mejora clara.
- Rechaza capturas de bajo valor aunque haya hueco libre.

El scoring de captura incluye:

- shiny,
- valor de stats,
- tipos y rasgos,
- cobertura contra boss,
- plan Sinnoh/Arceus/final,
- nivel proyectado,
- si diluye demasiado la media de nivel,
- duplicados utiles,
- soporte Grass/sustain,
- tactica del panel.

### 6. Sustituciones

Cuando el equipo esta lleno:

- protege Pokemon bloqueados desde el panel,
- protege shinies, especialmente al inicio,
- protege carry, legendarios y duplicados utiles,
- reemplaza solo si el entrante supera claramente al peor miembro.

Un shiny tipo Water/Fairy/Fire/Dragon/Dark tiene proteccion extra frente a reemplazos por sinergias flojas.

### 7. Items

El motor evita items trampa:

- `lagging tail`,
- `king's rock` / `kings rock`,
- `eviolite`,
- `focus band`,
- `focus sash`,
- `air balloon`.

Prioriza para el carry:

- `leftovers`,
- `shell bell`,
- `choice band`,
- `choice specs`,
- `atk band`,
- `spa specs`,
- `life orb`,
- otros ofensivos utiles si encajan.

No equipa un boost de tipo si no hay atacante real de ese tipo.

### 8. Orden del equipo

Antes de trainer/boss/legendary:

- calcula el mejor lead segun ofensiva, defensa, nivel y item,
- mantiene el carry si no hay un motivo claro para sacarlo,
- cambia lead si el carry es inseguro contra ese matchup,
- corrige nivel si el lead esta por debajo del objetivo del boss.

### 9. Pasivas, buffs y Eevee

Pasivas:

- valora shinies,
- tipos que ya tiene el equipo,
- tipos del carry,
- supervivencia,
- sustain,
- dano,
- scaling,
- cobertura contra boss.

Buffs:

- van al carry o al rol ofensivo preferente.
- si falta velocidad/ofensiva para Sinnoh, esos buffs suben mucho.

Eevee:

- si hay preferencia manual, la respeta.
- en auto, elige evolucion segun rasgos, cobertura y boss.

## Referencia de Datos del Juego

### Tabla de Efectividad de Tipos

Incluye los 18 tipos y se usa en:

- scoring de ataques contra boss,
- scoring defensivo del lead,
- capturas counter,
- seleccion de starter,
- reordenamiento de equipo.

### Sistema de Rasgos Traits

Los rasgos tienen tier `S`, `A`, `B` o `C`.

Cambios actuales importantes:

- `Fairy` pasa a tier `S`.
- `Fairy` tambien es prioridad alta en el plan Sinnoh.
- Shinies cuentan como doble aporte de trait.

Tipos especialmente valorados en la run:

- `Fire`,
- `Dragon`,
- `Dark`,
- `Fairy`,
- `Water`,
- `Steel`,
- `Grass`,
- `Rock`.

### Movimientos por Tipo y Nivel

El motor usa pools de movimientos por tipo y tier para inferir:

- cobertura probable,
- si un Pokemon tiene ataque util contra el boss,
- si una MT Normal sigue siendo necesaria,
- si el carry ya tiene suficiente tier de movimiento.

### Base de Datos de Jefes

Se usa para detectar y preparar bosses conocidos.

Objetivos principales:

- llegar fuerte a Arceus,
- sobrevivir el checkpoint,
- mantener plan para la jefa final posterior,
- no sacrificar nivel/equipo por capturas u objetos flojos.

### Tier List de Items

Resumen actual:

- `S`: sustain, scaling o items decisivos.
- `A`: ofensivos fuertes, defensivos buenos, MT/caramelo.
- `B`: boosts de tipo utiles si encajan.
- `C/D`: situacionales.
- `F`: items que el bot evita equipar.

Items degradados a evitar:

- `lagging tail`,
- `king's rock`,
- `eviolite`,
- `focus band`,
- `focus sash`,
- `air balloon`.

### Evoluciones de Eevee

Preferencia configurable:

- `auto`,
- o una evolucion concreta.

En auto se elige por:

- trait que completa,
- cobertura que falta,
- boss objetivo,
- plan de supervivencia/ofensiva.

## Sistemas de IA

Sistemas principales:

- IA de rutas con lookahead.
- IA de capturas y rerolls.
- IA de items y asignacion a carry.
- IA de orden de equipo.
- IA de boss prep.
- IA de starters.
- IA de pasivas.
- IA de buffs.
- IA anti-stuck.
- IA de seleccion de modo/mapa desde panel.

## Pantallas Manejadas

El motor maneja:

- titulo,
- seleccion de torre,
- seleccion de historia/region,
- seleccion de desafio,
- seleccion semanal,
- seleccion de trainer,
- seleccion de starter,
- mapa,
- batalla,
- captura,
- item,
- pasiva,
- swap,
- trade,
- shiny,
- badge,
- stat buff,
- elite prep,
- game over,
- victoria,
- overlays de evolucion/Eevee,
- modal de equipar/usar item.

## Anti-Stuck Watchdog

El anti-stuck:

- cuenta ciclos repetidos en la misma pantalla,
- avisa si parece bloqueado,
- fuerza clicks de navegacion si se supera el umbral,
- en mapa intenta nodos alternativos si el mismo click no progresa,
- en panico intenta cualquier boton visible habilitado.

## Fisica del Motor

Incluye:

- clicks sinteticos robustos,
- drag/drop para reordenar equipo,
- proteccion contra errores de `setPointerCapture`,
- cooldowns para no repetir acciones demasiado rapido,
- deteccion de controles visibles y habilitados.

## Selectores DOM Clave

Algunos selectores usados:

- `#starter-choices`
- `#catch-choices`
- `#item-choices`
- `#passive-choices`
- `#swap-choices`
- `#swap-incoming`
- `#stage-select-list`
- `#history-region-list`
- `.weekly-sub[data-sub]`
- `.screen.active .screen-team-bar .team-slot`
- `#btn-endless-run`
- `#btn-challenges-run`
- `#btn-continue-endless`
- `#btn-continue-challenge`
- `#btn-retry`
- `#btn-play-again`

## Changelog v8.1 a v8.7

### v8.1

- Base de automatizacion de torre.
- Capturas, items, rutas y batallas iniciales.

### v8.5

- Mejoras de Sinnoh run.
- Carry protegido.
- Base de bosses y final boss prep.
- Scouting de masterball/legendary.
- Telemetria y run history.

### v8.6

- Panel lateral con tactica, carry, locks y starter.
- Mejoras de reroll/captura.
- Mejor scoring de items y pasivas.
- Anti-stuck mas robusto.

### v8.7

- Panel con modo run: torre, historia, desafio semanal, desafio, auto o manual.
- Campo de mapa/region/subdesafio objetivo.
- Panel minimizable para movil.
- Restart automatico configurable desde panel.
- Starter manual/auto/forzado.
- Centro Pokemon mas inteligente segun HP, carry y boss.
- Items trampa degradados y evitados.
- Preferencia fuerte por `leftovers`/sustain/ofensivos en carry.
- `Fairy` elevado a trait top.
- Shinies priorizados al inicio.
- Reroll agresivo en mapas 1-3 si no sale shiny.
- Desde mapa 4 se evitan capturas de bajo valor.
- Sustitucion de shinies mas conservadora.
- Ruta con mas peso a XP/buffs si falta nivel para boss.
