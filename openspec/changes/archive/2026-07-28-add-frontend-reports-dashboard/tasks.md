# Tasks: add-frontend-reports-dashboard

> Trabajo visual según la skill `frontend-design`, y todo gráfico según la skill `dataviz` (`CLAUDE.md` §1).
> **Fase 1 (secciones 1–5) se puede hacer hoy.** Las fases 2 y 3 están bloqueadas por `backend-request.md`.

## 1. Retiro de las secciones que salen

- [x] 1.1 Eliminar `SalesByCashierSection` de `ReportsView.tsx` (código borrado, no comentado)
- [x] 1.2 Eliminar `SalesByProductSection` de `ReportsView.tsx`
- [x] 1.3 Eliminar `SalesListSection`, `SaleReceipt` y `TopProductsSection` en su forma actual de tabla suelta; verificado que `SaleReceipt` no se usaba desde otro lado
- [x] 1.4 Conservado `BarChart.tsx` (lo reusa el reporte de productos de la fase 2); sin imports huérfanos (`tsc`/`eslint` limpios)
- [x] 1.5 `foldProductsIntoOtros` en `lib/reports.ts` se dejó sin consumidor, pendiente de la fase 2; no se borró junto con sus tests

## 2. Gráfico compacto

- [x] 2.1 `LineChart.tsx`: `HEIGHT` pasó a prop `height` con `220` por defecto; el dashboard lo instancia en `110`
- [x] 2.2 Verificado en navegador: a media altura las etiquetas de eje Y no colisionan (se redujo a 3 ticks — `0`/mitad/máximo — cuando el alto de trazado es menor a `COMPACT_PLOT_HEIGHT`, en vez de los 5 de la versión completa)
- [x] 2.3 Verificado: el subsampleo del eje X (`MAX_X_LABELS`) sigue funcionando igual, independiente del alto

## 3. Comparación contra el período anterior

- [x] 3.1 `previousPeriodRange` en `lib/reports.ts`, reutilizando `addDays` (compartido con `fillDailySeries`) — sin `Date` local a partir de las fechas ISO
- [x] 3.2 `comparePeriods` en `lib/reports.ts`: `{kind: "changed", percent} | {kind: "previous_empty"} | {kind: "both_empty"}`
- [x] 3.3 Tests de ambos helpers en `reports.test.ts`, incluyendo cruce de mes, de año, y los cuatro casos de `comparePeriods`
- [x] 3.4 Segunda llamada a `summary` (rango anterior) en `DailyRevenueSection`; `ComparisonNote` renderiza dentro de la misma `Card` que el gráfico
- [x] 3.5 `periodLengthLabel` nombra el período por su longitud ("los N días anteriores"/"el día anterior"), nunca una unidad calendario que el rango no sea
- [x] 3.6 Verificado por lectura de código: exactamente dos `useLoad(...api("/reports/sales/summary?..."))` en `DailyRevenueSection`, ninguna request a un listado de ventas

## 4. Card de top 3 productos

- [x] 4.1 `TopProductsCard`: `GET /reports/products/top?limit=3`, nombre y cantidad vendida, sin gráfico ni columna de facturación
- [x] 4.2 Estados de carga, vacío y error explícitos (mismo patrón `useLoad`/`ErrorState`/`EmptyState` que el resto de la pantalla)
- [x] 4.3 No se rellena la lista por debajo de 3 — se renderiza `rows.map` tal cual, sin padding

## 5. Cards-botón de navegación

- [x] 5.1 `ReportNavCard.tsx`: `<Link>` estilado como card, área de click completa (`block`), foco visible (`focus-visible:ring-2`)
- [x] 5.2 Variante deshabilitada: `<div aria-disabled="true">` sin `href`, con la razón visible en el lugar de la descripción
- [x] 5.3 Las cuatro cards del dashboard (ventas, productos, valorización de inventario, compras a proveedores) se habilitan una por una a medida que cada pedido de `backend-request.md` se despliega. **Estado actual: las cuatro habilitadas** — todos los endpoints de fase 2/3 están desplegados (ver sección 7) y ninguna card lleva `disabledReason` en `ReportsView.tsx:311-330`
- [x] 5.4 Recorrido por teclado verificado en navegador: focus-visible en cada card, tab order natural

## 6. Verificación de la fase 1

- [x] 6.1 `npx tsc --noEmit`, `npx eslint src/components/reports/ src/lib/reports.ts`, `npx vitest run` (54 tests), `npm run build` — todo limpio
- [x] 6.2 Probado en navegador contra backend real: dashboard completo con el rango por defecto (mes actual, ~7 meses de datos con ventas sólo en los últimos 3 días) — comparación mostró correctamente "Sin ventas en los 27 días anteriores"
- [x] 6.3 Verificado con `resize_page` a 375px: `scrollWidth === clientWidth`, sin scroll horizontal
- [x] 6.4 Guard de rol ya existente en `app/(app)/reports/page.tsx` (`requireRole(["admin"])`), sin cambios — no se tocó

### Ajustes de layout (feedback en vivo durante la implementación)

- El diseño original apilaba el gráfico y la card de top-3 verticalmente. Se ajustó a pedido explícito: `DailyRevenueSection` y `TopProductsCard` van lado a lado en un `grid lg:grid-cols-2` (mitad de pantalla cada uno, con separación), y las cards de navegación pasan de 2 a 3 por fila (`sm:grid-cols-2 lg:grid-cols-3`).
- Se quitó la tabla día/ventas/facturado que acompañaba al gráfico dentro de `DailyRevenueSection`, y en su lugar se armó un split 2:3 (gráfico) / 1:3 (`ComparisonStat`) dentro de la misma card, con la comparación contra el período anterior como cifra destacada en vez de una línea de texto debajo del gráfico. Los specs (`ui-reports-dashboard`, delta de `ui-reports`) se actualizaron para reflejar que la tabla día a día ya no vive en el dashboard — vive en el futuro reporte de ventas (`/reports/sales`, `ui-reports-detail`), que muestra los mismos días con desglose de medio de pago y cajero.
- La altura del gráfico compacto se ajustó de 110 a 260 tras verificar en navegador que a 110px, sumado al angosto 2:3 dentro de una card que ya es la mitad de la pantalla, el gráfico quedaba demasiado chico para leerse cómodamente.

---

## 7. Prerrequisito de la fase 2 (bloqueante)

- [x] 7.1 Backend expone ventas por día con desglose por método de pago y cajero — desplegado y verificado en vivo: `GET /api/v1/reports/sales/daily-breakdown?from=&to=` → `200` con `days[].by_payment_method` y `days[].cashiers[]` (ruta en `backend/internal/reporting/transport/http/routes.go:11,16`)
- [x] 7.2 Backend acepta `TRANSFER` como método de pago — verificado en la respuesta de `daily-breakdown`, que incluye la clave `TRANSFER` junto a `CASH` y `CARD` (con `"0.00"` cuando no hubo ventas por ese medio)
- [x] 7.3 Backend expone el reporte de productos con stock, costo, precio y margen, incluyendo los de venta cero — verificado: `GET /api/v1/reports/products?sort=worst_selling` → `200` con filas de `quantity_sold: 0`
- [x] 7.4 Backend expone `GET /inventory/valuation` — verificado: `GET /api/v1/inventory/valuation` → `200` con los grupos `active` / `inactive` / `total`

## 8. Reporte de ventas (`/reports/sales`) — desbloqueado

> `GET /api/v1/reports/sales/daily-breakdown` existe (`backend/internal/reporting/transport/http/routes.go:11`, admin-only en `router.go:100-110`) y responde `200` contra el backend real con `days[].by_payment_method` (CASH/CARD/TRANSFER, ceros incluidos) y `days[].cashiers`.

- [x] 8.1 Página con su propio `requireRole(["admin"])`, no delegado al menú — `src/app/(app)/reports/sales/page.tsx:5`
- [x] 8.2 Presets semanal / mensual / últimos 6 meses que setean el rango, conviviendo con el rango editable — `SalesReportView.tsx:79-83` (`RANGE_PRESETS`) + `127-140` (setean `from`/`to`) + inputs de fecha editables `142-153`; `presetRange` en `lib/reports.ts:147`, con tests en `reports.test.ts`. Además hay presets de día (Hoy/Ayer, `SalesReportView.tsx:74-77`)
- [x] 8.3 Tabla por día: fecha, total, efectivo, tarjeta, transferencia, cajero — `SalesReportView.tsx:221-254` (`Th` fecha/total/efectivo/tarjeta/transferencia/cajero(es) + `CashierPills` 183-196)
- [x] 8.4 Método sin ventas ese día renderiza cero, no celda vacía — `amountFor` con fallback `"0.00"` (`SalesReportView.tsx:33-38`); además el backend ya devuelve `"0.00"` (verificado en respuesta real de `daily-breakdown`)
- [x] 8.5 Verificar que no exista ningún agrupamiento por fecha en el cliente — la tabla mapea `data.days` del backend tal cual (`SalesReportView.tsx:233`) y la única request es a `daily-breakdown` (`201-204`); no hay listado paginado de ventas. Nota: `summarizeDays` (`45-65`) sí suma en el cliente los totales por método **sobre las filas ya agrupadas por día** para las tiles de resumen — no reagrupa por fecha, pero roza el "SHALL NOT sum payment amounts client-side" del spec `ui-reports-detail`; queda señalado para decisión de OpenSpec, no resuelto acá
- [x] 8.6 Habilitar la card correspondiente en el dashboard — `ReportsView.tsx:311-315`, sin `disabledReason`

## 9. Reporte de productos (`/reports/products`) — desbloqueado

> `GET /api/v1/reports/products` existe (`routes.go:16`) y responde `200` con `{items[{product_id,product_name,quantity_sold,stock,cost,price,margin}], total}`.

- [x] 9.1 Página con su propio guard de rol — `src/app/(app)/reports/products/page.tsx:5`
- [x] 9.2 Listado con stock, costo, precio y margen; filtro más vendidos / menos vendidos — `ProductsReportView.tsx:144-169` (columnas) + `74-95` (botones `best_selling`/`worst_selling`, ambos resetean página) + query `126`
- [x] 9.3 Verificar que "menos vendidos" incluya productos con cero ventas en el rango — verificado contra backend real: `GET /api/v1/reports/products?from=2026-07-01&to=2026-07-28&sort=worst_selling` devolvió filas con `quantity_sold: 0` (`total: 1271`), que la tabla renderiza sin filtrar
- [x] 9.4 Verificar que el margen venga del backend y no se calcule en el cliente — `ProductsReportView.tsx:164` renderiza `formatMoney(item.margin)`; no hay aritmética de `cost`/`quantity_sold` en el archivo
- [x] 9.5 Habilitar la card correspondiente en el dashboard — `ReportsView.tsx:316-320`, sin `disabledReason`

## 10. Valorización de inventario — desbloqueado

> `GET /api/v1/inventory/valuation` existe (`router.go:138`, admin+inventory) y responde `200` con los grupos `active`/`inactive`/`total`, resolviendo la pregunta abierta del pedido 4 (se discriminan activos e inactivos).

- [x] 10.1 Vista con costo total y valor de venta total del inventario — `InventoryValuationView.tsx:51-78`, una card por grupo con `total_cost`, `total_sale_value` y `product_count`
- [x] 10.2 Verificar que sea una sola request y no un recorrido paginado del stock — un único `api<ValuationResponse>("/inventory/valuation")` (`InventoryValuationView.tsx:30`); no hay `/inventory/stock` ni paginación en el archivo
- [x] 10.3 Inventario vacío muestra ceros, no error — evidencia parcial pero suficiente: en la respuesta real el grupo `inactive` vino `{"total_cost":"0.00","total_sale_value":"0.00","product_count":0}` y se renderiza como ceros; la vista no tiene rama de empty/error para totales en cero (`46-50`). El caso "inventario entero vacío" no es reproducible en este entorno (149 productos activos con stock)
- [x] 10.4 Habilitar la card correspondiente en el dashboard — `ReportsView.tsx:321-325`, sin `disabledReason`

---

## 11. Fase 3: compras a proveedores — desbloqueado

- [x] 11.1 Prerrequisito: existe el módulo de proveedores y compras en backend — `backend/internal/bootstrap/router.go:143-176` (`registerPurchasingRoutes`, con `GET /suppliers`, `GET /purchase-orders`, recepción y pagos); verificado desplegado: `GET /api/v1/suppliers` y `GET /api/v1/purchase-orders?from=…&to=…&page=1&limit=3` responden `200` contra el backend real (28 pedidos)
- [x] 11.2 Página `/reports/purchases` con guard de rol propio — `src/app/(app)/reports/purchases/page.tsx:5` (`requireRole(["admin"])`)
- [x] 11.3 Listado de pedidos: fecha, valor, si fue recibido, quién lo recibió — `PurchasesReportView.tsx:206-228` (fecha `ordered_at`, proveedor, total, estado, `received_at`, `received_by` con fallback `—`). Se completó acá un hueco: el estado `CANCELLED` del dominio (`purchasing/domain/purchase_order.go:15`) no estaba en la unión y renderizaba un badge sin texto; ahora hay label y tono para los tres estados (`PurchasesReportView.tsx:19,40-52,223`)
- [x] 11.4 Filtros por semana, por mes y por proveedor — `PurchasesReportView.tsx:56-59` (presets `week`/`month` vía `presetRange`), `136-151` (`Select` de proveedor poblado desde `GET /suppliers`), `181-187` (query con `from`, `to`, `supplier_id`); el backend acepta esos tres parámetros (`purchasing/transport/http/handler.go:161-163`)
- [x] 11.5 Habilitar la card correspondiente en el dashboard — `ReportsView.tsx:326-330`, sin `disabledReason`

> Pendiente de verificación manual en las cuatro subpáginas: recorrido en navegador (loading/empty/error reales, teclado, 375px) y comprobación de `403` con un usuario no admin. Sólo se verificó por inspección de código, tipos, lint, tests y respuestas reales de los endpoints.
