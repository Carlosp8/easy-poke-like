# Changelog

Todos los cambios relevantes del proyecto deberian documentarse aqui cuando se
prepare una release o una PR con impacto visible.

El formato sigue la idea de Keep a Changelog, pero adaptado a un userscript:
prioriza cambios de comportamiento, compatibilidad con Pokelike y riesgos para
usuarios.

## Unreleased

## 10.0.0

### Cambiado

- Version visible del userscript actualizada a `Easy Pokelike 10`.
- Version de paquete actualizada a `10.0.0`.

### Arquitectura

- Documentada la frontera entre runtime legacy (`src/core/parts/`) y reglas puras
  (`src/core/lib/strategy/`).
- Documentadas guias de contribucion y actualizacion ante cambios de Pokelike.

### Verificacion

- `npm run check` sigue siendo el contrato local y de CI para cerrar cambios.

## 9.5.0

### Anadido

- Automatizacion para Battle Tower, historia, desafios, shinies, duplicados,
  items, MT, pasivas y auto-restart.
- Panel flotante `Easy Pokelike 9.5` con modo run, tactica, starter, locks y
  carry principal.
- Extractor de datos generados desde bundle local de Pokelike.
- Suite de tests para build, extractor, datos generados, runtime hooks y scoring.

### Notas

- Algunos IDs internos mantienen el prefijo `Engine` por compatibilidad con
  estado guardado y logs historicos.
