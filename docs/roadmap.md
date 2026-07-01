# Roadmap Tecnico

Este roadmap prioriza mejoras de mantenibilidad y confianza. No es una lista de
features de juego; es el orden recomendado para que el bot sea mas facil de
entender, probar y evolucionar.

## Principio

Cada nueva regla deberia avanzar hacia:

- entradas explicitas;
- salida trazable;
- tests unitarios;
- menos dependencia de DOM dentro de scoring;
- menos tablas manuales duplicadas.

## Ahora

1. Extraer mas helpers puros desde `03-detection-strategy.js`,
   `04-scoring-routing.js` y `05-screen-handlers.js`.
2. Priorizar dominios pequenos:
   - items;
   - type matchups;
   - catch scoring;
   - boss prep;
   - route scoring.
3. Mantener wrappers legacy con los nombres actuales para no romper llamadas
   cruzadas.
4. Anadir tests por cada helper extraido.

## Siguiente

1. Crear contratos de decision completos.
2. Testear decisiones de alto nivel:
   - elegir trainer antes que boss cuando falta nivel;
   - rechazar un boost de tipo sin atacante compatible;
   - proteger shiny bloqueado;
   - evitar centro si el equipo esta sano;
   - capturar duplicado solo en tactica `Duplicados`.
3. Separar snapshot de runtime de acciones reales de click.
4. Reducir dependencia de estado global en scoring.

## Despues

1. Convertir librerias puras a TypeScript mas estricto.
2. Consumir mas datos desde `src/data/generated/`.
3. Crear un modo dry-run/debug que calcule decisiones sin ejecutar clicks.
4. Formalizar telemetria con eventos tipados.
5. Documentar releases con cambios de comportamiento, no solo lista tecnica.

## Backlog De Documentacion

- Capturas del panel.
- Ejemplos de logs reales y como leerlos.
- Guia de contribucion.
- Checklist para actualizar tras cambios de Pokelike.
- Matriz de compatibilidad por version de bundle.

## No Objetivos Inmediatos

- Reescribir todo el core en TypeScript de golpe.
- Cambiar el formato final del userscript.
- Borrar wrappers legacy sin cobertura.
- Introducir frameworks pesados para un userscript que debe seguir siendo
  facil de instalar.
