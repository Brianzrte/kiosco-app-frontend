## 0. Prerrequisitos y coordinación backend (bloqueante para partes específicas)

- [ ] 0.1 Confirmar contra una instancia backend real que `GET /reports/sales/by-category?from=&to=` existe, responde `200` con el shape `{ category_id, category_name, total_quantity, total_revenue }[]` documentado en `backend-request.md`, y es admin-only; backend real. Bloquea toda la sección 3.
- [ ] 0.2 Confirmar contra una instancia backend real que `GET /reports/purchases/by-supplier` devuelve el campo aditivo de unidades compradas (nombre final a confirmar con backend) sin romper los campos existentes; backend real. Bloquea las tareas 6.4 y 6.5; el resto de la sección 6 no depende de este punto.
- [ ] 0.3 Confirmar contra una instancia backend real que existe un endpoint que compara la cantidad vendida de un producto entre dos ventanas de tiempo, su shape, y las reglas de umbral/antigüedad acordadas con el dueño; backend real. Mientras no se confirme, la sección 8 se implementa únicamente como bloque deshabilitado (8.1-8.2), sin fetch — las tareas 8.3+ quedan sin marcar y fuera de alcance de este change hasta entonces.
- [ ] 0.4 Verificar por inspección que `openspec/specs/ui-reports-detail/spec.md` vigente ("Supplier purchases report") sigue describiendo el estado real de `/reports/purchases` (el código ya lo implementa pese a que ese requirement dice que "the page SHALL NOT be built"); si diverge, dejarlo anotado como hallazgo para el `change-closer`, sin corregirlo en este change porque no forma parte de su alcance.

## 1. Tipos

- [ ] 1.1 Agregar `CategorySalesItem` a `src/lib/reports.ts` (o `src/lib/types.ts`, siguiendo el patrón ya usado por `ProductSalesItem`/`CashierSalesItem` en `reports.ts`): `{ category_id: string; category_name: string; total_quantity: number; total_revenue: string }`; inspección de tipos.
- [ ] 1.2 Agregar los tipos de respuesta de `/reports/purchases/by-supplier` (incluyendo el campo aditivo de unidades) y de `/reports/sales/by-product/growth` (`ProductGrowthItem`, con `growth_percent: number | null`) donde correspondan, siguiendo el patrón de DTOs inline ya usado por los otros componentes de `reports/`; inspección de tipos y `npm run build`.

## 2. Helpers puros

- [ ] 2.1 Agregar `sumQuantity(rows: { total_quantity: number }[]): number` a `src/lib/reports.ts`, sumando `total_quantity` sin reinterpretar el agregado del backend; prueba automatizada en `src/lib/reports.test.ts` con casos: arreglo vacío, una fila, varias filas, cantidades en cero.
- [ ] 2.2 Si el shape final de unidades compradas requiere una función equivalente para `by-supplier` (según lo confirmado en 0.2), reusar `sumQuantity` o extender su firma sin duplicar lógica; inspección de código.

## 3. Categorías más vendidas (dashboard) — bloqueado por 0.1

- [ ] 3.1 Agregar `TopCategoriesCard` a `src/components/reports/ReportsView.tsx`, mirroring `TopProductsCard` (fetch `GET /reports/sales/by-category?from=&to=`, mismo `useLoad`, mismo patrón de carga/vacío/error); inspección de código.
- [ ] 3.2 Ubicar `TopCategoriesCard` en la fila `grid gap-6 lg:grid-cols-2` junto a `DailyRevenueSection` y `TopProductsCard`, apilando debajo en `lg` según lo decidido en `design.md`; prueba manual: verificar el orden visual en desktop y mobile sin scroll horizontal.
- [ ] 3.3 Cada fila de `TopCategoriesCard` muestra nombre de categoría, ingreso formateado con `formatMoney`, y unidades vendidas, rankeado por ingreso descendente; inspección de código: sin arreglo/orden client-side más allá de lo que ya devuelve el backend ordenado, o un `sort` explícito por `total_revenue` si el backend no garantiza el orden — confirmar contra 0.1 cuál es el caso.
- [ ] 3.4 Estado vacío con el mismo mensaje que `TopProductsCard` ("No hay ventas en el período seleccionado."); prueba manual: rango sin ventas en ninguna categoría.
- [ ] 3.5 Estado de error con `ErrorState`/`onRetry`, mismo patrón que `TopProductsCard`; prueba manual: simular fallo de red o backend caído.
- [ ] 3.6 Prueba manual contra backend real: rango con ventas en al menos dos categorías, confirmar orden descendente por ingreso y que una categoría sin ventas en el rango no aparece.

## 4. Ruta y página de rentabilidad

- [ ] 4.1 Crear `src/app/(app)/reports/profitability/page.tsx`, mirroring `reports/products/page.tsx`: `await requireRole(["admin"])` y render de `ProfitabilityReportView`; inspección de código y `npm run build`.
- [ ] 4.2 Crear `src/components/reports/ProfitabilityReportView.tsx`, mirroring la estructura de `PurchasesReportView.tsx`/`ProductsReportView.tsx`: link "Volver a reportes", `PageHeader`, selector de rango con default `firstOfMonth()`/`today()`; inspección de código.
- [ ] 4.3 Agregar la nav card "Rentabilidad" a `ReportNavCards()` en `ReportsView.tsx`, apuntando a `/reports/profitability`; prueba manual: la card abre la página por click y por teclado (Enter tras Tab).

## 5. Stat tiles de ingresos, egresos, unidades

- [ ] 5.1 Fetch de ingresos (`GET /reports/sales/summary?from=&to=`) y egresos (`GET /reports/purchases/by-supplier?from=&to=`) como dos `useLoad` independientes, sin `Promise.all` que acople sus errores, siguiendo el patrón de `DailyRevenueSection`/`previousFetcher`; inspección de código.
- [ ] 5.2 Fetch de unidades vendidas: `GET /reports/sales/by-product?from=&to=` y totalizar con `sumQuantity` (tarea 2.1); inspección de código: sin recomputar `total_revenue` ni ningún otro campo del backend.
- [ ] 5.3 Tile de unidades compradas usando el campo aditivo de `purchases/by-supplier` (bloqueado por 0.2); mientras no esté confirmado, dejar la tarea sin marcar y no renderizar el tile con un valor inventado.
- [ ] 5.4 Renderizar los cinco tiles (ingresos, egresos, margen bruto, unidades vendidas, unidades compradas) con `StatCard`, mirroring `InventoryValuationView`/`SummaryCards`; inspección de código.
- [ ] 5.5 Margen bruto calculado en el cliente como ingresos menos egresos usando `toCents`/`fromCents` (nunca `+`/`-` sobre strings ni `parseFloat`); inspección de código.
- [ ] 5.6 Estado vacío: rango sin ventas ni compras muestra los cinco tiles en cero, sin ocultar la sección ni mostrar un `EmptyState`; prueba manual.
- [ ] 5.7 Estado de error independiente por fetch: error en ingresos no oculta el tile de egresos ya cargado, y viceversa, cada uno con su propio `ErrorState`/`onRetry`; prueba manual simulando el fallo de una sola llamada.
- [ ] 5.8 Prueba manual contra backend real: rango con compras y sin ventas (o viceversa) y confirmar que el margen bruto refleja el resultado negativo o totalmente positivo sin tratarse como error.

## 6. Nota de margen bruto

- [ ] 6.1 Agregar el texto fijo "Margen bruto = ventas − compras a proveedores. No descuenta alquiler, sueldos ni otros gastos operativos." siempre visible junto al tile de margen bruto, nunca detrás de un tooltip; inspección de código.
- [ ] 6.2 Confirmar que la etiqueta del tile es "Margen bruto" en todo el flujo (tile, cualquier texto auxiliar), nunca "Ganancias"; inspección de código (grep de la palabra "Ganancias" ausente en los archivos nuevos).
- [ ] 6.3 Prueba manual de accesibilidad: la nota es legible como texto por un lector de pantalla, no depende de un ícono ni de color.

## 7. Link a productos sin venta

- [ ] 7.1 Agregar un link desde `/reports/profitability` a `/reports/products`, con copy que indique explícitamente que ahí se filtra por "Menos vendidos" para ver productos sin venta; inspección de código.
- [ ] 7.2 Prueba manual: el link abre `/reports/products` y el Admin puede aplicar el filtro existente sin cambio de comportamiento en esa página.

## 8. Sección "Producto revelación" (bloqueada por 0.3)

- [ ] 8.1 Renderizar la sección como bloque visiblemente deshabilitado (`aria-disabled="true"`, mismo patrón que `ReportNavCard` con `disabledReason`) con el motivo del bloqueo, sin ningún fetch asociado; inspección de código.
- [ ] 8.2 Prueba manual de accesibilidad: el bloque deshabilitado se anuncia como no interactivo a tecnología asistiva y no es alcanzable por Tab como si fuera un control.
- [ ] 8.3 (Bloqueado por 0.3) Si backend confirma el endpoint de crecimiento por producto, implementar el fetch a `GET /reports/sales/by-product/growth?from=&to=&window_days=14` reemplazando el bloque deshabilitado; inspección de código. No implementar sin la confirmación de 0.3.
- [ ] 8.4 (Bloqueado por 0.3) Listar por producto cantidad reciente, cantidad anterior y `growth_percent`, mostrando "Sin ventas antes" cuando `growth_percent` es `null`, mismo tratamiento que `ComparisonStat`'s `previous_empty`; inspección de código y prueba manual.
- [ ] 8.5 (Bloqueado por 0.3) Prueba manual contra backend real una vez desplegado: producto con crecimiento positivo, producto sin ventas en la ventana anterior, producto sin calificar por umbral/antigüedad.

## 9. Responsive y accesibilidad generales

- [ ] 9.1 Prueba manual: `/reports/profitability` no introduce scroll horizontal en ningún ancho, incluidos los stat tiles apilados en mobile.
- [ ] 9.2 Prueba manual: `TopCategoriesCard` no introduce scroll horizontal en el dashboard en ningún ancho.
- [ ] 9.3 Prueba manual de teclado: la nav card "Rentabilidad" recibe foco visible y se activa con Enter, mismo comportamiento que las nav cards existentes.
- [ ] 9.4 Prueba manual de teclado: los controles de fecha nuevos (`Input type="date"` en `ProfitabilityReportView`) mantienen foco visible sin comportamiento custom.

## 10. Validaciones finales

- [ ] 10.1 `npm run lint`; prueba automatizada.
- [ ] 10.2 `npm test`; prueba automatizada — cubre `reports.test.ts` con los casos nuevos de `sumQuantity` y cualquier otro helper puro agregado.
- [ ] 10.3 `npm run build`; prueba automatizada — obligatorio por el `page.tsx` nuevo y los tipos nuevos.
- [ ] 10.4 Verificación manual final de punta a punta contra backend real: dashboard con categorías (si 0.1 está resuelto), página de rentabilidad con sus cinco tiles (o cuatro si 0.2 sigue bloqueado), nota de margen bruto, sección de producto revelación en su estado correspondiente (deshabilitada o poblada), y link a productos sin venta.

## 11. Cierre (sujeto a decisión del usuario, no se ejecuta en este change)

- [ ] 11.1 Sincronizar `openspec/specs/ui-reports-dashboard/spec.md` y `openspec/specs/ui-reports-detail/spec.md` con los deltas de este change — requiere decisión explícita del usuario y corresponde al rol `change-closer`, no a este change.
- [ ] 11.2 Archivar este change una vez implementado y validado — requiere decisión explícita del usuario y corresponde al rol `change-closer`.
