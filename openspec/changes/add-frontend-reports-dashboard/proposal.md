## Why

`/reports` es hoy una sola página larga donde todo pesa lo mismo: el resumen del rango, la evolución diaria, el listado de ventas, el top de productos, y los desgloses por cajero y por producto que agregó `add-frontend-reports-v15`. Abrir reportes debería responder primero "¿cómo viene el negocio?" en una pantalla que se lee de un vistazo, y recién después dejar entrar al detalle. Hoy hay que scrollear varias pantallas para encontrar cualquier cosa, y dos de las secciones (por cajero, por producto) resultaron ruido: repiten información que el operador busca en un reporte dedicado, no en el dashboard.

Además falta la pregunta que sigue naturalmente a "vendimos $X": **¿es más o menos que antes?** Y falta la que se hace al mirar el depósito: **¿cuánto capital tenemos inmovilizado en inventario?**

## What Changes

- **`/reports` pasa a ser un dashboard compacto**: resumen del rango, gráfico de evolución diaria a la mitad de altura, comparación contra el período anterior, y una card con los 3 productos más vendidos.
- **Comparación contra el período anterior** debajo del gráfico, en la misma card: "+12% que el período anterior". Se obtiene pidiendo el mismo resumen para el rango inmediatamente anterior de igual longitud y comparando dos totales que ambos vienen del backend — no se recalcula ninguna agregación en el cliente.
- **BREAKING (a nivel de UI)**: se quitan las secciones "Ventas por cajero" y "Ventas por producto" de `/reports`, junto con el listado "Ventas realizadas" y "Productos más vendidos" en su forma actual de tabla suelta. Lo que sobrevive se reubica en las subpáginas nuevas.
- **Cards-botón hacia subpáginas de reporte**, cada una con su propia pantalla y filtros:
  - `/reports/sales` — reporte de ventas por día: fecha, facturación del día, cuánto en efectivo, cuánto en tarjeta/transferencia, y el cajero. Filtros: semanal, mensual, últimos 6 meses.
  - `/reports/purchases` — reporte de compras a proveedores. **Card presente pero deshabilitada**: el backend no tiene módulo de proveedores.
  - `/reports/products` — reporte de productos: listado con filtro de más/menos vendidos, mostrando stock, valor de compra, valor de venta y el margen que dejó la venta de cada producto.
- **Valorización de inventario**: acción desde el dashboard que muestra el costo total y el precio de venta total de todo el inventario, para saber cuánto capital hay inmovilizado.
- **Bloqueado por backend en tres de los cuatro reportes.** Ver `backend-request.md`. El dashboard (resumen, evolución, comparación, top 3) se puede construir hoy; el reporte de ventas por día, el de productos con margen, la valorización y todo lo de proveedores necesitan endpoints que no existen.

## Capabilities

### New Capabilities

- `ui-reports-dashboard`: la pantalla `/reports` como dashboard — resumen, evolución diaria compacta, comparación contra período anterior, top 3 productos, y las cards-botón de navegación hacia los reportes de detalle.
- `ui-reports-detail`: las subpáginas de reporte (`/reports/sales`, `/reports/products`, `/reports/purchases`) con sus filtros propios, y la valorización de inventario.

### Modified Capabilities

- `ui-reports`: se retiran `Sales by cashier` y `Sales by product` (dejan de existir como pantallas). `Daily revenue trend` se modifica: mismo dato y mismas reglas, pero renderizado a media altura dentro del dashboard y acompañado de la comparación contra el período anterior. `Sales summary by date range` y `Top products` se mantienen con ajustes de presentación. `Chart rendering standards` y `Reports are Admin-only in MVP` no cambian.

## Impact

- Modificados: `src/components/reports/ReportsView.tsx` (se reduce a dashboard), `src/components/reports/charts/LineChart.tsx` (altura parametrizable).
- Nuevos: `src/app/(app)/reports/sales/page.tsx`, `src/app/(app)/reports/products/page.tsx`, `src/app/(app)/reports/purchases/page.tsx` y sus componentes en `src/components/reports/`; helper de rango anterior en `src/lib/reports.ts`.
- Eliminados: `SalesByCashierSection` y `SalesByProductSection` de `ReportsView.tsx`. `BarChart.tsx` se conserva — lo reusa el reporte de productos.
- **Depende de endpoints que hoy no existen** (ver `backend-request.md`): resumen diario con desglose por medio de pago y cajero; reporte de productos con stock, costo, precio y margen, incluyendo los de venta cero; valorización de inventario; y el módulo completo de proveedores/compras.
- **Depende de un cambio de dominio en backend**: agregar `TRANSFER` como tercer método de pago junto a `CASH` y `CARD`. Impacta el POS (el cajero debe poder elegirlo al cobrar), no solo el reporte — se coordina con `add-frontend-sales-payments`, que todavía no está implementado.
- Sin dependencias externas nuevas: los gráficos siguen siendo SVG propio con los tokens del sistema.
