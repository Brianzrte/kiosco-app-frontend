## 0. Prerrequisitos y coordinación backend

- [ ] 0.1 Confirmar contra backend real que `GET /reports/sales/by-category?from=&to=` existe, es admin-only y devuelve el shape documentado; backend real. Bloquea sección 3.
- [ ] 0.2 Confirmar contra backend real que `GET /reports/profitability?from=&to=` existe, es admin-only y devuelve todos los totales y desgloses del contrato, incluidos costo de ventas, resultado operativo, compras de stock y retiros personales; backend real. Bloquea secciones 4–7.
- [ ] 0.3 Confirmar que Egresos está desplegado y que backend clasifica cada pago de pedido o compra directa una sola vez en el resumen, sin contarlo a la vez como compra de stock y gasto operativo; backend real. Bloquea 0.2 y secciones 4–7.
- [ ] 0.4 Confirmar contra backend real el endpoint de crecimiento por producto, su shape y reglas de calificación; mientras no exista, implementar sólo el bloque deshabilitado de sección 8; backend real.
- [ ] 0.5 Inspeccionar que los requirements vigentes de `ui-reports-detail` que describen `/reports/purchases` coincidan con el código; registrar una divergencia para change-closer sin corregir specs vigentes fuera de alcance.

## 1. Tipos y helpers

- [ ] 1.1 Agregar `CategorySalesItem` y `ProfitabilitySummary` en `src/lib/types.ts` con importes como strings decimales, campos nullable explícitos y desgloses tipados; inspección de tipos y `npm run build`.
- [ ] 1.2 Agregar helpers sólo de presentación para ordenar/rotular los desgloses ya devueltos por backend; no sumar, restar ni reclasificar agregados; prueba automatizada `node` en `src/lib/reports.test.ts` si se agrega lógica pura.

## 2. Ruta y navegación

- [ ] 2.1 Crear `src/app/(app)/reports/profitability/page.tsx` con `await requireRole(["admin"])`; inspección y `npm run build`.
- [ ] 2.2 Crear `ProfitabilityReportView` con volver a reportes, `PageHeader` y rango por defecto del primer día del mes hasta hoy; inspección.
- [ ] 2.3 Agregar la card `Resultado y caja` a `ReportNavCards()` apuntando a `/reports/profitability`; prueba manual por pointer, Tab y Enter.

## 3. Categorías más vendidas — bloqueado por 0.1

- [ ] 3.1 Agregar `TopCategoriesCard` usando `GET /reports/sales/by-category?from=&to=` y los patrones existentes de carga, vacío, error y retry; inspección.
- [ ] 3.2 Mostrar nombre, ingreso con `formatMoney` y unidades, en el orden backend; no totalizar categorías en cliente; inspección.
- [ ] 3.3 Prueba manual en móvil y escritorio: orden, vacío y error sin scroll horizontal; backend real con dos categorías.

## 4. Resumen de resultado — bloqueado por 0.2 y 0.3

- [ ] 4.1 Consumir un único `GET /reports/profitability?from=&to=` mediante `api<T>()`; inspección: sin `Promise.all` de agregados financieros ni composición cliente.
- [ ] 4.2 Renderizar los cinco `StatCard`: Ingresos, Costo de ventas, Margen bruto, Gastos operativos y Resultado operativo; formatear importes sólo con helpers monetarios existentes; inspección.
- [ ] 4.3 Incluir texto visible que explique `Margen bruto = ingresos − costo de ventas` y `Resultado operativo = margen bruto − gastos operativos`; inspección y prueba manual con lector de pantalla.
- [ ] 4.4 Estado loading usa skeleton de las regiones; estado vacío conserva totales en cero; error muestra `ErrorState` persistente con retry y sin cifras calculadas localmente; prueba manual.

## 5. Movimientos de dinero — bloqueado por 0.2 y 0.3

- [ ] 5.1 Renderizar región secundaria con compras de stock, desgloses de egresos por tipo y por medio de pago y `Retiros personales`, a partir del mismo resumen backend; inspección.
- [ ] 5.2 Añadir copy visible que identifique movimientos de dinero y aclare que compras de stock y retiros personales no son una segunda deducción del resultado operativo; inspección.
- [ ] 5.3 Prueba manual con ventas, compra de stock, gasto operativo y retiro personal: cada importe se lee en su región, retiro no cambia resultado y ningún hecho aparece dos veces; backend real.

## 6. Productos sin venta

- [ ] 6.1 Enlazar a `/reports/products` con copy que indique el filtro `Menos vendidos`; inspección.
- [ ] 6.2 Prueba manual: el enlace abre el reporte y el Admin puede aplicar el filtro existente sin cambiar su comportamiento.

## 7. Estados, responsive, teclado y accesibilidad

- [ ] 7.1 Prueba manual en 320×568, 360×800, 390×844, 414×896, 430×932, 844×390, 768×1024 y 1280×720: no hay scroll horizontal, importes no se truncan y los desgloses pasan a cards/filas legibles en móvil.
- [ ] 7.2 Prueba manual de teclado: card, rango y retry mantienen foco visible y son operables por Tab/Enter; ningún bloque deshabilitado se presenta como control focuseable.
- [ ] 7.3 Prueba manual de accesibilidad: etiquetas y explicaciones se entienden sin color, lector de pantalla anuncia estados y los targets táctiles necesarios miden al menos 44 px.

## 8. Sección `Producto revelación` — bloqueada por 0.4

- [ ] 8.1 Renderizar bloque visiblemente deshabilitado con `aria-disabled="true"`, motivo y sin fetch mientras falte backend; inspección y prueba manual.
- [ ] 8.2 Cuando 0.4 esté resuelto, consumir el endpoint confirmado y mostrar cantidades reciente/anterior y porcentaje, usando `Sin ventas antes` para null; inspección y backend real.

## 9. Validaciones finales

- [ ] 9.1 `npm run lint`; prueba automatizada.
- [ ] 9.2 `npm test`; prueba automatizada.
- [ ] 9.3 `npm run build`; prueba automatizada, obligatorio por página y tipos nuevos.
- [ ] 9.4 Verificación manual final contra backend real: dashboard, resultado, movimientos de dinero, separación de retiros, estados y responsive.

## 10. Cierre (sujeto a decisión del usuario, no se ejecuta en este change)

- [ ] 10.1 Sincronizar las specs vigentes con los deltas de este change; requiere decisión explícita del usuario y corresponde al rol change-closer.
- [ ] 10.2 Archivar este change tras implementación y validación; requiere decisión explícita del usuario y corresponde al rol change-closer.
