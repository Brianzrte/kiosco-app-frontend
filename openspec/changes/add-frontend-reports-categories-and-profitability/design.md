## Context

Este change junta dos Requirement Context aprobados por el dueño en un solo change, por decisión explícita suya: ventas por categoría (Requirement Context A) y una vista de rentabilidad combinando ventas y compras (Requirement Context B). El analista había recomendado dividirlos porque su madurez de backend es distinta; el dueño prefirió un solo change y pidió que la pieza sin soporte de backend ("producto revelación") quede documentada y visiblemente bloqueada dentro del mismo change en lugar de omitida o pospuesta a otro documento.

Estado de backend verificado el 2026-07-30 contra `../backend/internal/reporting/`:
- `GET /reports/sales/summary` (ingresos), `GET /reports/sales/by-product` (unidades vendidas, sumando todas las filas), `GET /reports/products?sort=worst_selling` (productos sin venta) — existen y alcanzan.
- `GET /reports/purchases/by-supplier` existe y devuelve `investment`, `purchase_order_count`, `complete_delivery_count`, `incomplete_delivery_count`, `undelivered_products` — sin unidades. Egresos en dinero ya están cubiertos; unidades compradas no.
- No existe ninguna agregación de ventas por categoría (`GET /reports/sales/by-category` no existe; `routes.go` sólo registra `sales/by-product` con `category_id` como filtro de un producto puntual, no como dimensión de agrupación).
- No existe ningún endpoint que compare ventas de un producto entre dos ventanas de tiempo.

## Goals / Non-Goals

**Goals:**
- Mostrar ventas por categoría en el dashboard de `/reports`, con el mismo estándar de carga/vacío/error que el resto del dashboard.
- Mostrar, en una página nueva, ingresos, egresos, margen bruto y unidades vendidas/compradas de un período, dejando explícito que el margen bruto no es ganancia neta.
- Dejar documentada y visiblemente bloqueada la sección de "producto revelación" sin inventar datos ni construir contra un endpoint que no existe.
- Dejar coordinado con backend, en `backend-request.md`, exactamente lo que falta para desbloquear cada pieza.

**Non-Goals:**
- No se construye "producto revelación" en este change; se documenta su contrato deseado para que backend lo evalúe.
- No se agregan gastos operativos generales (alquiler, sueldos, servicios) al cálculo de margen.
- No se duplica el trabajo de "productos sin venta": se reusa `/reports/products?sort=worst_selling` con un link, sin nueva lógica.
- No se construye una serie diaria de compras ni de crecimiento por producto; los totales de este change son siempre agregados del período completo.
- No se resuelve en este change la representación de categorías por producto más allá del ranking agregado (fuera de alcance: rotación de inventario, categorías por producto como segunda dimensión de otros reportes).

## User flow

### Categorías más vendidas (dashboard)
1. Admin abre `/reports` con el selector de rango de fechas ya existente.
2. La nueva sección "Categorías más vendidas" se refetchea junto con el resto del dashboard, usando el mismo `from`/`to`.
3. Ve el ranking de categorías por ingreso, con unidades vendidas.

### Rentabilidad (página nueva)
1. Admin abre `/reports` y activa la nav card "Rentabilidad".
2. Llega a `/reports/profitability` con un rango por defecto (primer día del mes actual a hoy, mirroring `firstOfMonth()`/`today()` de `ReportsView.tsx`/`ProductsReportView.tsx`).
3. Ve los stat tiles de ingresos, egresos, margen bruto, unidades vendidas y unidades compradas, con la nota de margen bruto siempre visible debajo del tile correspondiente.
4. Ve la sección de "producto revelación" como una card deshabilitada, con el motivo del bloqueo, sin datos.
5. Para productos sin venta, sigue un link a `/reports/products?sort=worst_selling`.

## UI states

### Categorías más vendidas
- Loading: `ListSkeleton`, igual que `TopProductsCard`.
- Empty: `EmptyState` con "No hay ventas en el período seleccionado.", igual mensaje que `TopProductsCard`.
- Error: `ErrorState` con `onRetry`, igual patrón que el resto del dashboard.
- Success: lista rankeada por ingreso descendente, mismo componente visual que `TopProductsCard` (ítem numerado, nombre truncado, cantidad alineada a la derecha), agregando el ingreso formateado junto a la cantidad porque el ranking es por ingreso, no sólo por unidades.

### Rentabilidad
- Loading: skeleton de stat tiles, mirroring `SalesSummarySection`/`InventoryValuationView` (`ListSkeleton`).
- Empty (dato válido, no oculta la sección): cada tile en cero cuando el rango no tiene ventas ni compras.
- Error: cada fetch (ingresos, egresos) maneja su propio error con `ErrorState` y `onRetry` independiente — un error en egresos no tumba el tile de ingresos ni viceversa, mismo patrón que `DailyRevenueSection`/`previousFetcher` en `ReportsView.tsx`.
- Success: stat tiles + nota de margen bruto + sección de producto revelación deshabilitada + link a productos sin venta.
- Producto revelación: siempre en estado deshabilitado en este change (no tiene estado de carga, vacío ni error propio porque no se fetchea nada); el texto explica que esta sección está pendiente de soporte de backend, sin fecha ni promesa de plazo.

## Decisions

1. **Categorías en el dashboard, no en página propia.** Mismo criterio que "Productos más vendidos": el volumen típico de categorías de un kiosco es chico y el patrón de card rankeada ya existe. Alternativa descartada: página `/reports/categories` con filtros propios — no la pidió el dueño y agrega una superficie que el patrón de card ya cubre.
2. **Card ordenada por ingreso, no por unidades.** El objetivo declarado es decidir qué reponer/promocionar por impacto en ventas, no por volumen; unidades se muestran como dato secundario en la misma fila, igual que `TopProductsCard` muestra unidades junto al nombre.
3. **"Rentabilidad" como página nueva, no como sección del dashboard.** Decisión ya tomada en el Requirement Context B por volumen de datos (stat tiles + sección de producto revelación no entran cómodos en el dashboard compacto). Mirroring el patrón de `/reports/purchases`, `/reports/products`: nav card + página propia.
4. **Margen bruto, nunca "Ganancias".** El copy exacto es "Margen bruto = ventas − compras a proveedores. No descuenta alquiler, sueldos ni otros gastos operativos.", visible siempre junto al tile de margen bruto, no en un tooltip ni en un texto opcional — evita que el dueño lea el número como ganancia neta y tome una decisión financiera equivocada.
5. **Egresos = sólo compras a proveedores.** Ya decidido en el Requirement Context B; no se agregan otros gastos porque el backend no los modela hoy y esta pantalla no puede inventar una fuente de datos para ellos.
6. **Ingresos y egresos son dos fetches independientes.** Ninguno depende del otro para renderizar; un error en uno no bloquea el otro, siguiendo el patrón ya establecido por `DailyRevenueSection`/`previousFetcher`.
7. **Unidades vendidas se calculan sumando `total_quantity` de todas las filas de `GET /reports/sales/by-product`.** Es el único endpoint existente que expone unidades vendidas del período completo sin filtrar por categoría ni producto puntual. La suma es *display shaping* puro (no recomputa el agregado del backend, sólo lo totaliza), igual que la regla ya documentada para `lib/reports.ts`. Se extrae a un helper puro `sumQuantity` testeable, reusable para unidades compradas.
8. **Unidades compradas requieren un campo aditivo en `GET /reports/purchases/by-supplier`.** El endpoint hoy sólo expone dinero y conteos de órdenes. Pedir un campo nuevo (`total_quantity_purchased` o equivalente) es más simple que introducir un segundo endpoint, y es compatible hacia atrás porque es aditivo. Ver `backend-request.md`.
9. **Producto revelación se documenta pero no se construye.** No existe ningún endpoint que compare dos ventanas de tiempo por producto. Construirlo contra datos inventados o contra una composición cliente de `sales/by-product` en dos rangos violaría la regla de que los agregados los calcula el backend (sumar/restar cantidades de dos llamados no es lo mismo que un cálculo de crecimiento por producto con reglas de umbral y antigüedad que el backend todavía no definió). La card se muestra deshabilitada con el motivo, igual que el patrón ya usado por `ReportNavCard` para reportes sin soporte de backend (`ui-reports-dashboard`, "Unavailable report is disabled, not hidden") — aquí aplicado a una sección dentro de una página en vez de a una nav card completa, porque el resto de la página sí es funcional.
10. **Productos sin venta reusa `/reports/products?sort=worst_selling` mediante un link, sin desarrollo nuevo.** El requirement ya está resuelto por ese filtro (confirmado en `openspec/specs/ui-reports-detail/spec.md`, "Worst-selling includes unsold products"); construir una vista paralela sería trabajo duplicado que el dueño no pidió.

## Accessibility

- Toda card, tile y sección nueva usa tokens de texto y color del design system existente (`text-text-primary`, `text-text-secondary`, `text-text-muted`); ningún estado se comunica sólo por color.
- La nota de margen bruto es texto legible siempre visible, no un ícono ni un tooltip que dependa de hover.
- La card deshabilitada de "producto revelación" se marca `aria-disabled="true"`, mismo patrón que `ReportNavCard` con `disabledReason`, y no es interactiva ni focuseable como control.
- El foco visible en los controles de fecha (`Input type="date"`) ya existe en el UI kit y no cambia.

## Keyboard and focus behavior

- La nueva nav card "Rentabilidad" es un `<Link>` estándar de `ReportNavCard`, alcanzable por Tab y activable con Enter, igual que las nav cards existentes.
- Ningún control nuevo introduce un flujo de foco custom, diálogo ni trampa de foco.

## Responsive behavior

- "Categorías más vendidas" se apila debajo de las secciones existentes del dashboard, dentro de la fila `grid gap-6 lg:grid-cols-2` compartida con `TopProductsCard` (junto a `DailyRevenueSection`) — la fila pasa a tener tres cards (`DailyRevenueSection`, `TopProductsCard`, `TopCategoriesCard`); en `lg` se resuelve como `lg:grid-cols-2` con la tercera card apilando debajo, evitando exigir una fila de tres columnas iguales que angostaría demasiado cada card. Alternativa descartada: fila propia de una sola columna para categorías — desperdicia ancho en pantallas grandes sin necesidad, dado que el contenido de la card (ranking de texto) es angosto como `TopProductsCard`.
- Los stat tiles de `/reports/profitability` se apilan en móvil, mirroring `SummaryCards`/`InventoryValuationView`: grilla de 3 columnas en la base, con ajuste a menos columnas en los anchos más chicos donde haga falta legibilidad, igual criterio que `SummaryCards`.
- La página de rentabilidad no introduce scroll horizontal en ningún ancho.

## API contract

Existentes, reusados sin cambio de contrato:
- `GET /api/v1/reports/sales/summary?from=&to=` → ingresos del período (`total_amount`).
- `GET /api/v1/reports/sales/by-product?from=&to=` → unidades vendidas del período, sumando `total_quantity` de todas las filas con el helper `sumQuantity`.
- `GET /api/v1/reports/purchases/by-supplier?from=&to=` (sin `supplier_id`) → egresos del período (`investment`).
- `GET /api/v1/reports/products?sort=worst_selling&from=&to=` → destino del link de productos sin venta, sin consumo directo de datos en este change (la página de rentabilidad no duplica su listado).

Nuevo, pendiente de backend (ver `backend-request.md`):
- `GET /api/v1/reports/sales/by-category?from=&to=` → `{ categories: { category_id: string; category_name: string; total_quantity: number; total_revenue: string }[] }`, admin-only, mirroring el envoltorio con clave nombrada que ya usan `sales/by-cashier` (`{ cashiers: [...] }`) y `sales/by-product` (`{ products: [...] }`).
- Campo nuevo en `GET /api/v1/reports/purchases/by-supplier`: `total_quantity_purchased: number` (nombre final a confirmar con backend), aditivo sobre la respuesta actual.
- `GET /api/v1/reports/sales/by-product/growth?from=&to=&window_days=14` → `{ products: { product_id, product_name, recent_quantity, previous_quantity, growth_percent }[] }`, mismo criterio de envoltorio; `growth_percent` nullable cuando `previous_quantity = 0`.

Todos los endpoints nuevos y campos nuevos son admin-only, heredando el mismo `RequireRole(admin)` que ya envuelve todo `/api/v1/reports/`.

## Error handling

- `401`: `api()` redirige solo a `/login`; sin cambio respecto del patrón existente.
- `403`: se queda en la página, `ErrorState` ofrece "Volver"; no debería ocurrir en producción porque `/reports/profitability` está gateada a `admin` igual que el resto de `/reports`, pero el patrón se mantiene por si el rol cambia entre el gate de UI y la respuesta del backend.
- Mensaje del backend (`{ message }`) se muestra tal cual en cualquier `ErrorState` nuevo, sin traducir ni reescribir.
- Cada fetch de la página de rentabilidad (ingresos, egresos) maneja su propio error de forma independiente; un fallo en uno no oculta el resultado del otro.
- La card de categorías del dashboard usa el mismo patrón de error con reintento que `TopProductsCard`.

## Backend coordination

Ver `backend-request.md` para el contrato completo. Resumen de bloqueo:
- Sección "Categorías más vendidas": bloqueada hasta que `GET /reports/sales/by-category` exista y se despliegue.
- Tile "Unidades compradas" en `/reports/profitability`: bloqueado hasta que `GET /reports/purchases/by-supplier` exponga el campo aditivo de unidades; el resto de la página (ingresos, egresos en dinero, margen bruto, unidades vendidas) no depende de esto.
- Sección "Producto revelación": bloqueada hasta que `GET /reports/sales/by-product/growth` (o equivalente) exista, se despliegue, y backend defina el umbral mínimo de unidades y la antigüedad mínima de catálogo para calificar — reglas de negocio que este change no fija.

## Risks / Trade-offs

- Construir la página de rentabilidad con la sección de producto revelación deshabilitada desde el día uno implica un segundo despliegue de frontend (o un flag) cuando el endpoint de crecimiento exista, en vez de lanzar la página completa de una sola vez. Se acepta porque el dueño pidió explícitamente no bloquear todo el change por la pieza más inmadura.
- Sumar `total_quantity` client-side desde `sales/by-product` para el tile de unidades vendidas depende de que ese endpoint no pagine ni trunque filas dentro del rango pedido; si el catálogo creciera mucho, este cálculo debería revisarse. Hoy, a escala de kiosco, es aceptable (mismo criterio que otros `limit=100` sin paginar documentados en `frontend-conventions.md`).
- El campo aditivo de unidades compradas depende del criterio de backend de qué cuenta como "unidad comprada" (¿incluye órdenes canceladas? ¿pedidos sin recibir?) — este change no fija esa regla, sólo pide el campo; queda como pregunta abierta hacia backend, no bloqueante para el resto de la página.

## Migration Plan

No aplica migración de datos ni de contrato existente: todo lo nuevo es aditivo (endpoint nuevo, campo nuevo, página nueva, sección nueva). Ningún comportamiento vigente de `/reports` cambia de forma incompatible.

## Rollback

- La sección de categorías y la nav card de rentabilidad son aditivas al dashboard; revertir el change retira ambas sin dejar al dashboard en un estado intermedio, porque no reemplazan ninguna sección existente.
- Mientras el endpoint de categorías no esté desplegado, la tarea correspondiente queda sin implementar (no hay código que revertir); una vez implementada, revertir es quitar la sección y su fetch, sin tocar el resto del dashboard.
- La página `/reports/profitability` es una ruta nueva; retirarla no afecta ninguna ruta existente. Mientras "producto revelación" esté deshabilitada, no hay lógica de fetch que revertir para esa sección específica.

## Open Questions

- Nombre final del campo aditivo de unidades compradas en `purchases/by-supplier` (`total_quantity_purchased` es la propuesta de este change, no un nombre ya acordado con backend).
- Regla de umbral mínimo de unidades y antigüedad mínima de catálogo para que un producto califique como "revelación" — a definir entre backend y el dueño, documentado como pendiente en `backend-request.md`, no bloqueante para el resto de este change.
- Si el catálogo de categorías creciera lo suficiente como para requerir truncar el ranking del dashboard (top N vs. todas) — no bloqueante hoy, dado el volumen típico de categorías de un kiosco.
