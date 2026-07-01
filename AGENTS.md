# AGENTS.md

Instrucciones para Codex y otros agentes de programacion que trabajen en este
repo. Este archivo vive en la raiz para que aplique a todo el proyecto.

## Objetivo Del Proyecto

Easy Pokelike es un userscript de Tampermonkey para automatizar Pokelike. El
artefacto instalable es `easy-pokelike.user.js`, pero la fuente de verdad esta
en `src/` y se genera con `npm run build`.

## Reglas Basicas

- No edites `easy-pokelike.user.js` a mano salvo que el usuario lo pida de forma
  explicita. Cambia `src/`, `scripts/`, `tests/` o `docs/` y genera el
  userscript con el build.
- No hagas commit, push, tags ni releases salvo peticion explicita del usuario.
- No reviertas cambios ajenos. Si el worktree esta sucio, trabaja alrededor de
  los cambios no relacionados.
- Prefiere cambios pequenos, trazables y faciles de revisar.
- Usa `apply_patch` para ediciones manuales de archivos.
- Mantente en ASCII para archivos nuevos o editados salvo que el archivo ya use
  claramente caracteres no ASCII.

## Arquitectura

- `src/core/parts/` contiene el runtime legacy: DOM, clicks, pantallas,
  controles, estado mutable y loop principal.
- `src/core/lib/` contiene utilidades puras testeables.
- `src/core/lib/strategy-utils.ts` es el barrel publico que el runtime consume
  mediante `EasyPokelikeStrategyUtils`.
- `src/data/generated/` contiene datos extraidos del bundle local de Pokelike.
  No copies tablas nuevas a mano si el extractor puede generarlas.
- `docs/` contiene explicaciones largas. Mantener el README como entrada clara y
  enlazar detalles desde ahi.

## Como Cambiar Estrategia

Cuando una regla pueda expresarse con entradas planas y salida determinista,
extraela a `src/core/lib/strategy/`.

La forma preferida de una decision es:

```ts
{
  id: 'route:trainer',
  score: 120,
  reason: 'boss-prep',
  details: {
    avgDeficit: 4,
    leadDeficit: 8
  }
}
```

El runtime puede leer DOM y preparar snapshots. La libreria pura deberia evitar
DOM, `localStorage`, timers, clicks y estado mutable global.

## Tests Y Verificacion

Ejecuta el mayor contrato razonable para el cambio:

- `npm run format` despues de editar.
- `npm run check` antes de dar por terminado un cambio relevante.
- `git diff --check` para detectar espacios o finales de linea problematicos.
- `npm run build` si solo necesitas validar el userscript generado.

Para reglas nuevas, cubre al menos:

- caso positivo;
- caso negativo;
- datos incompletos;
- `reason` o `details` estable que explique la decision.

## Documentacion

Actualiza documentacion cuando cambien comportamiento visible, comandos,
arquitectura, compatibilidad o flujo de contribucion.

- README: entrada rapida para usuarios y desarrolladores.
- `docs/development.md`: arquitectura y flujo local.
- `docs/strategy.md`: reglas de decision.
- `docs/contributing.md`: como proponer cambios.
- `docs/pokelike-update-checklist.md`: cambios de bundle, DOM o datos.
- `CHANGELOG.md`: cambios visibles por release o PR con impacto.

## Cambios De Pokelike

Si cambia el bundle o el DOM del juego:

1. Sigue `docs/pokelike-update-checklist.md`.
2. Regenera datos con `npm run extract:bundle` cuando aplique.
3. Actualiza tests de contrato si cambian datos esperados.
4. Evita ajustar pesos estrategicos para tapar un problema de parsing.

## UX Del Bot

- Mantener el nombre visible `Easy Pokelike 10`.
- Algunos IDs internos conservan `Engine` por compatibilidad con `localStorage`
  y logs historicos; no los renombres sin migracion.
- El panel debe seguir siendo util en pantallas pequenas y no bloquear acciones
  del juego.
- No actives capturas duplicadas fuera de la tactica `Duplicados`.

## Al Responder Al Usuario

- Explica que cambiaste y que verificaste.
- Si no pudiste ejecutar un check, dilo claramente.
- No digas que subiste cambios si no hubo commit/push.
- Responde en espanol si el usuario escribe en espanol.
