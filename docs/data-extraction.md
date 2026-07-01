# Extraccion De Datos

El proyecto usa datos normalizados en `src/data/generated/`. Esos archivos se
generan desde un bundle local de Pokelike con `npm run extract:bundle`.

## Objetivo

Evitar que el core copie a mano datos que ya existen en el juego:

- Pokedex;
- move pool;
- items;
- passive items;
- challenges;
- weekly challenges;
- node types;
- evoluciones;
- legendarios;
- abilities Gen 3;
- metadata de stages y mapas.

## Comandos

Autodetectar el bundle local mas reciente:

```bash
npm run extract:bundle
```

Usar un bundle concreto:

```bash
npm run extract:bundle -- bundle.xxxxx.js
```

Resolver el bundle desde un HTML local:

```bash
npm run extract:bundle -- index.html
```

## Como Funciona

El extractor no depende del hash del archivo. Localiza por estructura:

- tabla de strings ofuscada;
- decoder;
- bucle de rotacion inicial;
- constantes logicas como `MOVE_POOL`, `ITEM_POOL`, `PASSIVE_ITEM_POOL`,
  `CHALLENGES`, `WEEKLY_CHALLENGES`, `NODE_TYPES`, evoluciones y abilities.

Durante la extraccion:

- decodifica strings sin arrancar la app completa;
- neutraliza IIFEs de browser startup;
- evalua solo lo necesario para exponer constantes de datos;
- escribe JSON normalizado en `src/data/generated/`.

## Contrato De Salida

`bundle-meta.json` registra:

- archivo fuente;
- SHA-256;
- fecha de extraccion;
- detalles del decoder;
- conteos por seccion;
- warnings por secciones faltantes.

Los bundles minificados locales estan ignorados por git. Solo se trackean los
JSON normalizados.

## Cuando Regenerar

Regenera datos cuando:

- Pokelike actualice su bundle;
- aparezcan items, nodos, pasivas o challenges nuevos;
- una decision del bot dependa de datos que aun estan hardcodeados;
- cambie el extractor.

Despues de regenerar:

```bash
npm run check
```

## Fallos Esperados

Si cambia la ofuscacion de forma real, el extractor debe fallar con diagnostico
en vez de escribir datos parciales silenciosamente.

Si falta un bundle previo, algunos tests pueden marcar un skip esperado. Eso no
implica fallo si el contrato actual de datos sigue pasando.
