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
- [x] 5.3 Las cuatro cards del dashboard (ventas, productos, valorización de inventario, compras a proveedores) están **las cuatro** deshabilitadas hoy — ningún endpoint de la fase 2/3 existe todavía; se habilitan una por una a medida que cada pedido de `backend-request.md` se despliegue
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

- [ ] 7.1 Backend expone ventas por día con desglose por método de pago y cajero — ver `backend-request.md` pedido 1
- [ ] 7.2 Backend acepta `TRANSFER` como método de pago — pedido 2
- [ ] 7.3 Backend expone el reporte de productos con stock, costo, precio y margen, incluyendo los de venta cero — pedido 3
- [ ] 7.4 Backend expone `GET /inventory/valuation` — pedido 4

## 8. Reporte de ventas (`/reports/sales`) — bloqueado

- [ ] 8.1 Página con su propio `requireRole(["admin"])`, no delegado al menú
- [ ] 8.2 Presets semanal / mensual / últimos 6 meses que setean el rango, conviviendo con el rango editable
- [ ] 8.3 Tabla por día: fecha, total, efectivo, tarjeta, transferencia, cajero
- [ ] 8.4 Método sin ventas ese día renderiza cero, no celda vacía
- [ ] 8.5 Verificar que no exista ningún agrupamiento por fecha en el cliente
- [ ] 8.6 Habilitar la card correspondiente en el dashboard

## 9. Reporte de productos (`/reports/products`) — bloqueado

- [ ] 9.1 Página con su propio guard de rol
- [ ] 9.2 Listado con stock, costo, precio y margen; filtro más vendidos / menos vendidos
- [ ] 9.3 Verificar que "menos vendidos" incluya productos con cero ventas en el rango
- [ ] 9.4 Verificar que el margen venga del backend y no se calcule en el cliente
- [ ] 9.5 Habilitar la card correspondiente en el dashboard

## 10. Valorización de inventario — bloqueado

- [ ] 10.1 Vista con costo total y valor de venta total del inventario
- [ ] 10.2 Verificar que sea una sola request y no un recorrido paginado del stock
- [ ] 10.3 Inventario vacío muestra ceros, no error
- [ ] 10.4 Habilitar la card correspondiente en el dashboard

---

## 11. Fase 3: compras a proveedores — bloqueado sin fecha

- [ ] 11.1 Prerrequisito: existe el módulo de proveedores y compras en backend — ver `backend-request.md` pedido 5
- [ ] 11.2 Página `/reports/purchases` con guard de rol propio
- [ ] 11.3 Listado de pedidos: fecha, valor, si fue recibido, quién lo recibió
- [ ] 11.4 Filtros por semana, por mes y por proveedor
- [ ] 11.5 Habilitar la card correspondiente en el dashboard
