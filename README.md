# Easy Pokelike 9.5

Userscript de Tampermonkey para automatizar runs de Pokelike. El motor toma
decisiones sobre rutas, capturas, items, MT, pasivas, jefes, historia,
desafios, shinies y duplicados tacticos.

El archivo instalable es `easy-pokelike.user.js`, pero la fuente de verdad vive
en `src/` y se genera con `npm run build`.

## Quick Start

1. Instala Tampermonkey o un gestor compatible de userscripts.
2. Instala dependencias con `npm ci`.
3. Genera el userscript con `npm run build`.
4. Crea un nuevo userscript en Tampermonkey.
5. Pega el contenido de `easy-pokelike.user.js`.
6. Abre `pokelike.xyz` y confirma que aparece el panel `Easy Pokelike 9.5`.

El userscript se ejecuta con:

| Campo     | Valor                  |
| --------- | ---------------------- |
| `@match`  | `*://*.pokelike.xyz/*` |
| `@run-at` | `document-start`       |
| `@grant`  | `none`                 |

## Estado Del Proyecto

| Area            | Estado                        |
| --------------- | ----------------------------- |
| Version         | `9.5.0`                       |
| Runtime         | Tampermonkey userscript       |
| Node requerido  | Node 22 o superior            |
| Build           | `scripts/build-userscript.ts` |
| Datos generados | `src/data/generated/`         |
| Check completo  | `npm run check`               |
| CI              | GitHub Actions en `main` y PR |

Nota: algunos IDs internos y keys legacy conservan el prefijo `Engine` por
compatibilidad con estado guardado y logs historicos. El nombre visible del
producto es `Easy Pokelike 9.5`.

## Para Usuarios

### Que Automatiza

- Torre batalla, historia, challenge mode y desafios semanales.
- Seleccion de rutas con lookahead.
- Capturas, rerolls y reemplazos de equipo.
- Items equipables, consumibles, MT Normal y Move Tutor.
- Pasivas, buffs, evoluciones, Eevee y pantallas intermedias.
- Preparacion de bosses por nivel, HP, matchup y carry.
- Auto-restart tras victoria o derrota.
- Anti-stuck para salir de pantallas repetidas.

### Panel De Control

El panel flotante se guarda en `localStorage` con la key
`Engine_bot_controls_v1` y migra datos antiguos desde `pokelike_bot_controls`.

| Control              | Uso                                                                      |
| -------------------- | ------------------------------------------------------------------------ |
| `Modo run`           | Torre batalla, historia, desafio semanal, desafio, auto config o manual. |
| `Mapa/region`        | Texto opcional para elegir region, mapa o subdesafio visible.            |
| `Tactica`            | Cambia prioridades del bot durante la run.                               |
| `Principal`          | Fuerza un Pokemon visible como carry principal.                          |
| `Starter`            | Auto IA, forzar nombre o dejar al jugador.                               |
| `Nombre starter`     | Nombre usado cuando starter esta en modo forzado.                        |
| `Restart automatico` | Activa o desactiva auto-restart.                                         |
| Boton `M/+`          | Marca o desmarca un Pokemon como principal.                              |
| Click en sprite      | Bloquea o libera un Pokemon frente a reemplazos.                         |

Colores del panel:

- Verde: Pokemon normal.
- Naranja: vida baja.
- Rojo: bloqueado.
- Borde amarillo: principal.
- Barra inferior: HP actual.

### Tacticas

| Tactica      | Prioridad                                                    |
| ------------ | ------------------------------------------------------------ |
| `Auto`       | Scoring equilibrado.                                         |
| `Boss prep`  | Nivel, items, buffs y supervivencia antes de jefes.          |
| `Captura`    | Capturas y grass cuando el equipo necesita opciones.         |
| `Shiny`      | Scouting shiny sin ignorar por completo la presion de nivel. |
| `XP`         | Trainers y rutas de entrenamiento.                           |
| `Duplicados` | Capturas duplicadas y proteccion de parejas.                 |

Solo `Duplicados` permite capturas duplicadas. El estado antiguo de la casilla
de duplicados ya no puede activarlas fuera de esa tactica.

### Modos De Run

| Modo              | Comportamiento                                                |
| ----------------- | ------------------------------------------------------------- |
| `Torre batalla`   | Reanuda o inicia Battle Tower.                                |
| `Historia`        | Abre historia y usa `Mapa/region` para elegir region.         |
| `Desafio semanal` | Abre desafios semanales y elige subdesafio por texto u orden. |
| `Desafio`         | Abre challenge mode.                                          |
| `Auto config`     | Usa `CONFIG.AUTO_START_MODES` y `CONFIG.AUTO_START_PRIORITY`. |
| `Manual`          | No inicia runs automaticamente.                               |

### Recetas Rapidas

| Quiero               | Configuracion recomendada                                  |
| -------------------- | ---------------------------------------------------------- |
| Farmear Battle Tower | `Modo run: Torre batalla`, `Tactica: Auto` o `Boss prep`.  |
| Priorizar shinies    | `Tactica: Shiny`, locks manuales en shinies importantes.   |
| Forzar starter       | `Starter: Forzar nombre`, escribir el nombre exacto.       |
| Jugar historia       | `Modo run: Historia`, `Mapa/region` con la region deseada. |
| Buscar duplicados    | `Tactica: Duplicados`; las demas tacticas los desactivan.  |

## Para Desarrolladores

### Estructura

```text
src/
  userscript.meta.js        cabecera Tampermonkey
  core/
    manifest.json           orden de concatenacion del motor
    parts/                  motor legacy modularizado
    lib/                    utilidades puras testeables
    types.d.ts              vocabulario de dominio
  data/generated/           datos extraidos del bundle de Pokelike
scripts/                    build y extractor
tests/                      tests de build, datos, extractor, DOM y scoring
docs/                       documentacion extendida
```

### Comandos

| Comando                  | Uso                                                   |
| ------------------------ | ----------------------------------------------------- |
| `npm run build`          | Genera `easy-pokelike.user.js` y valida sintaxis.     |
| `npm run check`          | Formato, lint, typecheck, tests y build.              |
| `npm test`               | Ejecuta la suite de tests.                            |
| `npm run lint`           | Valida JS/TS/MJS con ESLint.                          |
| `npm run typecheck`      | Ejecuta TypeScript sin emitir archivos.               |
| `npm run format`         | Aplica Prettier.                                      |
| `npm run format:check`   | Comprueba formato sin escribir.                       |
| `npm run extract:bundle` | Regenera `src/data/generated/` desde un bundle local. |

Los scripts TypeScript se ejecutan directamente con Node 22 usando
`--experimental-strip-types`; no hay paso de compilacion separado para
desarrollo normal.

### Flujo Recomendado

1. Cambia la fuente en `src/`, `scripts/`, `tests/` o `docs/`.
2. Si cambia el juego, copia el bundle local y corre `npm run extract:bundle`.
3. Anade o ajusta tests cuando cambie una decision del bot.
4. Ejecuta `npm run check`.
5. Genera el userscript con `npm run build` si necesitas probar en Tampermonkey.

No edites `easy-pokelike.user.js` a mano salvo para una prueba puntual. Es un
artefacto local o de release, no la fuente de verdad.

## Documentacion Extendida

| Documento                                      | Contenido                                                    |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [Desarrollo](docs/development.md)              | Arquitectura, reglas de edicion, testing y flujo de cambios. |
| [Estrategia](docs/strategy.md)                 | Como decide rutas, capturas, items, bosses y equipo.         |
| [Extraccion de datos](docs/data-extraction.md) | Como funciona el extractor y que datos genera.               |
| [Troubleshooting](docs/troubleshooting.md)     | Problemas frecuentes para usuario y desarrollador.           |
| [Roadmap tecnico](docs/roadmap.md)             | Mejoras senior recomendadas y orden de ataque.               |
