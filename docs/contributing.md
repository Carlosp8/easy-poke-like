# Guia De Contribucion

Esta guia resume como proponer cambios sin romper el userscript final ni perder
la trazabilidad de las decisiones del bot.

## Antes De Tocar Codigo

1. Lee [Desarrollo](development.md) para entender la frontera entre `parts/` y
   `lib/`.
2. Ejecuta `npm ci` si es tu primera vez en el repo.
3. Comprueba el estado inicial con `git status --short`.
4. No edites `easy-pokelike.user.js` a mano; cambia `src/` y genera el artefacto
   con `npm run build`.

## Como Elegir Donde Cambiar

| Cambio                                 | Donde deberia vivir                 |
| -------------------------------------- | ----------------------------------- |
| Selector DOM, click o pantalla visible | `src/core/parts/`                   |
| Scoring, thresholds o decision pura    | `src/core/lib/strategy/`            |
| Normalizacion de texto, items o tipos  | `src/core/lib/`                     |
| Datos nuevos del juego                 | `src/data/generated/` via extractor |
| Explicacion de comportamiento          | `docs/`                             |

Si una funcion puede recibir un objeto plano y devolver `{ score, reason,
details }`, normalmente pertenece a `src/core/lib/strategy/`.

## Flujo De Cambio Recomendado

1. Extrae o modifica primero una funcion pequena y pura.
2. Mantiene el wrapper legacy si otras partes del core lo llaman.
3. Anade tests en `tests/strategy-utils.test.mjs` o fixtures bajo
   `tests/fixtures/strategy/`.
4. Actualiza documentacion si cambia una regla visible para usuarios o
   desarrolladores.
5. Ejecuta `npm run check`.

## Tests Esperados

Para una regla nueva, intenta cubrir:

- un caso positivo;
- un caso negativo;
- un caso limite con datos incompletos;
- una razon (`reason`) estable que explique la decision.

Para una regresion, anade primero un test que falle con el comportamiento actual
y luego corrige la implementacion.

## Estilo De Decisiones

Prefiere salidas trazables:

```ts
{
  id: 'catch:type-coverage',
  score: 15,
  reason: 'Dark,Water',
  details: {
    newTypes: ['Dark', 'Water']
  }
}
```

Evita funciones que lean DOM, `localStorage`, `CONFIG` global y estado mutable a
la vez. El runtime puede preparar un snapshot, pero la decision deberia ser
portable.

## Checklist Antes De Cerrar

- `npm run format`
- `npm run check`
- `git diff --check`
- `git status --short`
- README/docs actualizados si cambia el flujo o la arquitectura.

## Changelog Y Pull Requests

Actualiza [Changelog](../CHANGELOG.md) cuando un cambio altere comportamiento
visible, compatibilidad con Pokelike, instalacion, comandos o riesgos de
release.

Si el cambio va a revision, usa la plantilla
[pull_request_template.md](../.github/pull_request_template.md) para dejar
claro el impacto en rutas, capturas, items, pasivas, bosses y panel.

## Cosas A Evitar

- Reescribir grandes partes legacy sin tests intermedios.
- Borrar wrappers legacy solo porque parecen redundantes.
- Copiar tablas nuevas a mano si el extractor puede generarlas.
- Cambiar pesos estrategicos sin dejar un test que explique el nuevo criterio.
