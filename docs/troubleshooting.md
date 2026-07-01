# Troubleshooting

Guia rapida para diagnosticar problemas comunes.

## No Aparece El Panel

Comprueba:

1. Tampermonkey esta activo.
2. El userscript coincide con `*://*.pokelike.xyz/*`.
3. El script tiene `@run-at document-start`.
4. `easy-pokelike.user.js` fue generado con `npm run build`.
5. La consola no muestra errores de sintaxis.

Comando util:

```bash
npm run build
```

## El Bot No Inicia Una Run

Comprueba el panel:

- `Modo run` no debe estar en `Manual` si esperas auto-start.
- `Restart automatico` debe estar activo si esperas reintentos automaticos.
- En historia o desafio semanal, `Mapa/region` debe coincidir con texto visible
  o quedar vacio para modo automatico.

## No Captura Duplicados

Esto es esperado salvo que `Tactica` sea `Duplicados`.

Desde 9.5, duplicados no dependen de una casilla persistente. Cualquier otra
tactica los fuerza desactivados.

## No Equipa Un Item

Motivos habituales:

- el item esta en cooldown tras un rechazo;
- no hay target valido;
- el mismo estado de equipo ya rechazo esa asignacion;
- el item no mejora a ningun Pokemon vivo;
- es un boost de tipo y ningun Pokemon usa ese tipo de ataque;
- la MT Normal no es necesaria.

Para investigar, mira logs de consola con mensajes de item, bag o modal.

## Se Queda Atascado En Una Pantalla

El anti-stuck compara firmas de progreso. Primero avisa, luego intenta una
accion alternativa, y en panico pulsa algun boton visible habilitado.

Si se repite:

1. Captura el nombre de pantalla visible.
2. Copia logs recientes de consola.
3. Comprueba si Pokelike cambio clases, ids o estructura DOM.
4. Ejecuta `npm run check` para descartar roturas locales.

## El Extractor Falla

Comprueba:

- el bundle existe localmente;
- el argumento apunta al JS o al HTML correcto;
- no estas intentando extraer desde una URL remota;
- el juego no cambio la ofuscacion de forma incompatible.

Comandos:

```bash
npm run extract:bundle
npm run extract:bundle -- bundle.xxxxx.js
npm run extract:bundle -- index.html
```

## Tests Con Skip

El test de bundle previo puede saltarse si ese archivo no existe localmente.
Eso es normal. Lo importante es que los tests restantes pasen y que
`bundle-meta.json` mantenga el contrato esperado.

## Build Verde Pero Tampermonkey Falla

Posibles causas:

- estas usando un `easy-pokelike.user.js` antiguo;
- pegaste una version parcial;
- el navegador conserva un userscript previo;
- Pokelike cambio el DOM despues del ultimo build.

Regenera y reinstala el userscript:

```bash
npm run build
```
