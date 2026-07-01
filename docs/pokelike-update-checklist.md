# Checklist Para Cambios De Pokelike

Usa esta checklist cuando Pokelike cambie su bundle, DOM, datos o reglas. La
meta es separar si fallo el extractor, el parsing DOM o una decision estrategica.

## 1. Capturar El Cambio

1. Guarda el nuevo bundle local de Pokelike.
2. Si conservas el bundle anterior, dejalo disponible para comparar.
3. Ejecuta:

```bash
npm run extract:bundle
npm run check
```

Si quieres usar un archivo concreto:

```bash
npm run extract:bundle -- bundle.xxxxx.js
```

## 2. Revisar Datos Generados

Comprueba cambios en:

- `src/data/generated/bundle-meta.json`
- `src/data/generated/pokedex.json`
- `src/data/generated/moves.json`
- `src/data/generated/items.json`
- `src/data/generated/passives.json`
- `src/data/generated/challenges.json`
- `src/data/generated/node-types.json`

Senales de alerta:

- bajan mucho los counts;
- aparecen warnings nuevos;
- desaparecen items o passives esperados;
- cambian nombres/ids usados por el panel o los modales.

## 3. Revisar DOM Y Selectores

Si el extractor pasa pero el bot no actua bien, mira primero:

- pantallas activas (`.screen.active`);
- nombres de botones principales;
- cards de Pokemon;
- cards de captura;
- item modals;
- passive cards;
- team slots;
- SVG/map nodes.

Los cambios DOM deberian quedarse en `src/core/parts/`. Si la decision no
depende del DOM, extraela o ajustala en `src/core/lib/strategy/`.

## 4. Revisar Estrategia

Si las reglas del juego cambiaron, anade fixtures o tests para:

- capturas;
- items;
- pasivas;
- rutas;
- boss prep;
- starters;
- conversiones de texto, tipos o nombres.

Despues actualiza [Estrategia](strategy.md) si el comportamiento visible cambia.

## 5. Validacion Manual Recomendada

Despues de `npm run check`, prueba al menos:

- arranque desde title screen;
- Battle Tower normal;
- una captura y un reroll;
- un item equipable;
- una MT/Move Tutor si aparece;
- una passive card;
- un boss o elite prep;
- auto-restart tras final de run.

## 6. Cierre

Antes de cerrar:

```bash
npm run check
git diff --check
git status --short
```

Documenta en el changelog o PR:

- bundle usado;
- datos generados modificados;
- selectores tocados;
- comportamiento estrategico cambiado;
- tests anadidos.
