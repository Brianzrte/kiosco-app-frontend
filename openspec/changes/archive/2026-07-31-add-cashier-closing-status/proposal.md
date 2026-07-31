## Why

Registrar un cierre hoy deja una constancia útil, pero no indica si el efectivo
de ventas posteriores ya fue conciliado. El cajero y Administración necesitan
un estado operativo verificable para distinguir una caja en curso, un cierre
registrado y un cierre que requiere actualización, sin impedir ventas.

## What Changes

- Agregar un indicador de estado de conciliación al encabezado para el cajero.
- Agregar un reporte administrativo de cierres y estados diarios por cajero.
- Mantener las ventas habilitadas después de un cierre; una venta posterior
  cambia el estado a pendiente de actualizar, no bloquea el POS.
- Depender de agregados de backend que calculen el estado; el frontend no
  deduce cobertura de cierres ni suma ventas paginadas.

## Capabilities

### New Capabilities

- `ui-cashier-closing-status`: estado operativo de conciliación para el cajero
  y reporte administrativo diario de cierres.

### Modified Capabilities

Ninguna.

## Impact

- Afecta el encabezado de la app, el área administrativa de reportes y los
  tipos compartidos.
- Requiere endpoints de backend nuevos para el estado propio del cajero y el
  reporte diario de Administración; ver `backend-request.md`.
- No agrega dependencias ni modifica el flujo de confirmación de ventas.
