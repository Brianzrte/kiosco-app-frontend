## Why

El dashboard actual explica ventas, pero no permite que la dueña entienda con
seguridad el resultado del kiosco en un período. La versión inicial de este
change proponía restar compras a proveedores de las ventas y llamarlo margen
bruto. Esa cuenta mezcla dos cosas distintas: una compra incorpora stock y es
una salida de caja; el costo de ventas es el costo de la mercadería que se
vendió. Con Egresos, además, alquiler, sueldos y otros gastos operativos deben
verse sin confundirlos con retiros personales ni contar una compra dos veces.

## What Changes

- Convertir `/reports/profitability` en el centro de resultado del período,
  admin-only: ingresos por ventas, costo de ventas, margen bruto, gastos
  operativos y resultado operativo. Todos los agregados y la clasificación
  contable provienen del backend.
- Incorporar una lectura separada de movimientos de dinero: compras de stock,
  egresos por tipo y medio de pago, y retiros personales. Las compras y los
  retiros se muestran pero no se restan otra vez del resultado operativo.
- Mantener categorías más vendidas en el dashboard y el acceso a los reportes
  de detalle. La sección de crecimiento de productos continúa documentada y
  deshabilitada hasta que exista soporte backend real.
- Reemplazar la métrica anterior de "egresos = compras a proveedores" y su
  supuesto margen bruto por un resumen de rentabilidad explícito, trazable y
  sin doble conteo.

## Capabilities

### Modified Capabilities

- `ui-reports-dashboard`: sección "Categorías más vendidas" y navegación hacia
  el centro de reportes del período.
- `ui-reports-detail`: página `/reports/profitability` con resultado,
  movimientos de dinero y análisis comercial, separando rentabilidad de caja.

## Impact

- `src/components/reports/ReportsView.tsx`: card de categorías y navegación a
  `/reports/profitability`.
- Nuevo `src/app/(app)/reports/profitability/page.tsx` y
  `src/components/reports/ProfitabilityReportView.tsx`.
- `src/lib/types.ts`: tipos del resumen de rentabilidad y de categorías;
  dinero sólo como strings decimales y sin agregaciones de negocio en cliente.
- Requiere coordinación backend: ventas por categoría, crecimiento por
  producto y un resumen de rentabilidad que integre costo histórico de ventas,
  egresos y compras de stock sin duplicarlos. Ver `backend-request.md`.
- No agrega dependencias.
