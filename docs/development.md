# Desarrollo

Esta guia describe como tocar el proyecto sin romper el contrato principal: el
userscript final debe seguir siendo un unico artefacto Tampermonkey generado
desde `src/`.

## Arquitectura

El core esta partido por responsabilidad, pero durante runtime comparte un unico
scope generado por `scripts/build-userscript.ts`.

| Archivo                    | Responsabilidad                                                |
| -------------------------- | -------------------------------------------------------------- |
| `00-runtime-hooks.js`      | Guards de navegador y eventos sinteticos.                      |
| `01-config-data.js`        | Configuracion, type chart y datos estaticos.                   |
| `02-controls-state.js`     | Estado mutable, controles persistidos y panel.                 |
| `03-detection-strategy.js` | Parseo DOM, deteccion de pantalla y helpers de estrategia.     |
| `04-scoring-routing.js`    | Matchups, orden de equipo y evaluacion de rutas.               |
| `05-screen-handlers.js`    | Handlers de pantallas visibles y modales.                      |
| `06-initialization.js`     | Banner, timers y arranque del loop.                            |
| `lib/`                     | Utilidades puras testeables, compiladas antes del core legacy. |

El orden lo define `src/core/manifest.json`. Cambiarlo cambia comportamiento.

## Principios De Cambio

- Mantener `easy-pokelike.user.js` como artefacto generado.
- Preferir funciones puras en `src/core/lib/` para scoring y reglas nuevas.
- Dejar el DOM en los handlers y parsers, no en las funciones de decision.
- Usar datos de `src/data/generated/` antes de copiar tablas nuevas a mano.
- Anadir tests cuando cambie una regla de decision.
- Ejecutar `npm run check` antes de considerar terminado un cambio.

## Frontera Recomendada

Una funcion facil de testear deberia recibir un snapshot explicito:

```ts
decideBestItem({
  team,
  bag,
  opponent,
  tactic,
  runMode,
  config,
});
```

Y devolver una decision trazable:

```ts
{
  action: 'equip',
  item: 'charcoal',
  target: 'charizard',
  score: 128,
  reason: 'matching-attack-type'
}
```

Ese formato evita que la decision lea DOM, `localStorage`, config global y
estado mutable a la vez.

## Testing

| Tipo                        | Donde                                    |
| --------------------------- | ---------------------------------------- |
| Build del userscript        | `tests/build.test.mjs`                   |
| Extractor                   | `tests/extractor.test.mjs`               |
| Contrato de datos generados | `tests/generated-data-contract.test.mjs` |
| Runtime DOM pequeno         | `tests/runtime-hooks.test.mjs`           |
| Scoring puro                | `tests/strategy-utils.test.mjs`          |

Tests recomendados para nuevas reglas:

- una decision positiva;
- una decision negativa;
- un caso limite con datos incompletos;
- un caso que preserve compatibilidad con nombres/traducciones existentes.

## Flujo Local

```bash
npm ci
npm run check
npm run build
```

Para regenerar datos:

```bash
npm run extract:bundle
npm run check
```

Para usar un bundle concreto:

```bash
npm run extract:bundle -- bundle.xxxxx.js
```

## Reglas Para Refactorizar El Core

1. Extrae primero una funcion pura sin cambiar la llamada publica del core.
2. Mantiene un wrapper con el nombre legacy si otras partes lo llaman.
3. Cubre la nueva funcion con tests unitarios.
4. Comprueba que `tests/build.test.mjs` sigue garantizando que el helper se
   inyecta antes de las partes legacy.
5. Haz cambios pequenos y reversibles.

## Riesgos Actuales

- `03-detection-strategy.js`, `04-scoring-routing.js` y `05-screen-handlers.js`
  aun mezclan parsing DOM, estado, scoring y acciones.
- Varias tablas manuales conviven con datos generados.
- El scope compartido permite llamadas cruzadas que TypeScript no puede validar
  con fuerza.
- Los cambios visuales del juego pueden romper selectores DOM aunque los tests
  puros sigan pasando.

El objetivo tecnico no es cambiar el runtime final, sino llegar poco a poco a
decisiones pequenas, testeables y documentadas.
