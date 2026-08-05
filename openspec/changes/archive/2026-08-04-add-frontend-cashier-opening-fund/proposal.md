## Why

El backend `add-flexible-cash-shifts` reemplaza la conciliación por día
calendario por turnos de un operador. Un fondo inicial confirmado abre el
turno, puede atravesar medianoche y se incluye una sola vez en el cierre. El
frontend actual sólo expone el cierre a `cashier`, calcula un intervalo local
desde medianoche y manda `from`; ese contrato deja de ser válido.

Además, el fondo ya no es exclusivo de un cajero: un Admin puede declararlo
para cualquier operador activo con rol `admin` o `cashier`, incluido sí mismo,
y ese operador lo confirma para iniciar el turno. Hace falta una UI alineada
que no bloquee las ventas ni reconstruya importes o fechas operativas en el
cliente.

## What Changes

- Admin declara un fondo inicial para un **operador** activo (`admin` o
  `cashier`) y fecha operativa, desde `/reports/cash-closings`.
- El operador destino ve y confirma su propio fondo pendiente desde un banner
  no modal del shell; confirmarlo inicia su turno, pero nunca bloquea el POS.
- El cierre del shell pasa a estar disponible para ambos roles de operador y
  usa el contrato de turno: envía sólo `to`, `counted_cash` y notas opcionales;
  el backend deriva el inicio, efectivo esperado y diferencia. El cierre
  provisional puede corregirse por su dueño hasta quedar sellado.
- El reporte diario muestra el fondo nullable separado de la conciliación y
  presenta fechas como fechas operativas. Las ventas transnoche ya llegan
  atribuidas a la fecha de apertura; el frontend no las reagrupa.

## Capabilities

### New Capabilities

- `ui-cashier-opening-fund`: declaración y confirmación de fondos de apertura
  para operadores.

### Modified Capabilities

- `ui-cashier-shift-closing`: cierre del turno propio, contrato sin `from`,
  roles `admin|cashier` y estado provisional/sellado.
- `ui-cashier-closing-status`: estado del operador y reporte diario sobre
  fechas operativas con resumen nullable de fondo.

## Impact

- `src/lib/types.ts`, `src/components/shell/`,
  `src/components/reports/CashClosingStatusReportView.tsx` y los delta specs
  de cierre/estado.
- Depende del despliegue verificado de `add-flexible-cash-shifts`; no agrega
  dependencias ni implementa polling, push, takeover de dispositivo ni
  subturnos simultáneos.
