## Why

Los campos que reciben dinero hoy muestran strings técnicos como `20000.0`,
lo que aumenta el riesgo de lectura incorrecta en tareas operativas. Se necesita
una representación argentina legible sin cambiar el contrato decimal del backend.

## What Changes

- Nuevo primitive compartido para editar importes monetarios con prefijo `$`,
  miles `.` y decimales `,` visibles.
- Migración de los campos que representan dinero; pesos, cantidades y
  porcentajes quedan sin cambios.
- El valor que consumen los formularios y envían al backend sigue siendo el
  string decimal canónico con punto, por ejemplo `"20000.00"`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ui-foundation`: incorpora un primitive de importe monetario reutilizable.

## Impact

- `src/components/ui/`, `src/lib/money.ts` y formularios de catálogo, POS,
  compras, recepción y caja.
- Sin endpoints, cambios backend ni dependencias nuevas.
