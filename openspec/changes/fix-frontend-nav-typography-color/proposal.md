## Why

Una auditoría UX/UI (mediciones en vivo + barrido estático de código) y una mejora posterior solicitada para el flujo de caja encontraron cuatro problemas que hoy degradan la credibilidad visual y la claridad de la aplicación:

1. **El nav superior se rompe físicamente en tablet/laptop.** Medido en vivo (`scrollWidth` vs. `clientWidth`, logueado como `admin`): overflow horizontal de 513px en 768×1024, 257px en 1024×768, 65px en 1280×800 y 22px en 1366×768 — todas resoluciones ya marcadas como prioritarias de POS/tablet por este mismo proyecto. Sólo 1440×900 pasa hoy. Hay contenido de navegación inalcanzable sin scroll horizontal para el rol `admin`, que es el único con los 8 ítems completos en la fila.
2. **El sistema tipográfico y de densidad resuelve el mismo rol visual de 3 y 4 formas distintas sin criterio documentado.** Un `StatCard` compacto compite en tamaño con el `<h1>` de cada pantalla; el mismo patrón "tile de KPI" está implementado 4 veces con markup distinto; el "total destacado" de una fila/card usa `text-lg` en 5 lugares y `text-sm` en uno (`ReturnHistory`); el `<h2>` de sección tiene 3 estilos sin criterio explícito; un label de `LineChart` no coincide con el tamaño de su propio tooltip; y una pantalla "lista" (Inventario, Categorías) usa una densidad de texto distinta a una tabla real (Productos, Ventas) para el mismo rol de dato.
3. **Las cards de resumen de ventas del día no diferencian visualmente sus 5 métricas.** Las 5 cards de `SummaryCards` (Historial de ventas) usan el mismo tinte neutro, aun cuando el sistema ya tiene tonos de pago validados en POS y colores pastel permitidos para cards.
4. **El selector de medio de pago del POS no comunica visualmente su vínculo con el resumen diario.** Sus opciones no seleccionadas usan el borde rosa genérico; la persona cajera no recibe el color distintivo del medio hasta seleccionarlo, y el hover no comparte el formato de ícono-tile y borde de Historial.

Es 100% frontend: ningún endpoint nuevo, ningún tipo de dominio nuevo. Los tres hallazgos se resuelven en un solo change porque comparten superficie de auditoría y no tienen dependencias entre sí que justifiquen separarlos.

## What Changes

- **Fix de layout del nav (`Nav.tsx`)**: eliminar el overflow horizontal del header en los cinco anchos medidos (768×1024, 1024×768, 1280×800, 1366×768, 1440×900), sin ocultar ni remover ninguno de los 8 ítems de navegación del rol `admin`, sin tocar `MobileNavDrawer.tsx` ni el comportamiento por debajo de 768px.
- **Unificación tipográfica y de densidad**:
  - `StatCard` (`size="compact"`) deja de competir en peso visual con el `<h1>` de `PageHeader`.
  - Se migra el markup ad hoc de `SalesReportView.SummaryTiles` e `InventoryValuationView` al primitive `StatCard size="compact"`, para que las 4 ubicaciones de "tile KPI" (dashboard, historial de ventas, reporte de ventas, valorización de inventario) compartan el mismo marcado.
  - `ReturnHistory.tsx` sube su total de `text-sm` a `text-lg` para alinearse con el resto de "total destacado".
  - Se documenta y aplica una jerarquía de 3 niveles para `<h2>` de sección (eyebrow / subsección de detalle / título de diálogo modal), incluyendo bajar `UserDetailView.tsx` a la variante de subsección.
  - `LineChart.tsx` unifica el label del punto marcado a `text-xs`, igual que su tooltip.
  - Se unifica la densidad de texto de pantallas "lista" (`InventoryView`, `CategoriesView`) a `text-sm`, igual que las tablas (`ProductsView`, `SalesView`).
  - El bloque de 5 cards de resumen mobile de Historial de ventas (390px) pasa de ocupar 3 filas a un máximo de 2.
- **Color en el resumen agregado del día (`SalesView.SummaryCards`)**: las cinco cards reciben un acento de color limitado a su tile de ícono y borde, sin cambiar el fondo ni el texto. "Efectivo", "Tarjeta" y "Transferencia" reutilizan los tonos dedicados de POS; "Ventas hoy" usa `pastel-pink` y "Total facturado" usa `pastel-yellow`. El ícono y la etiqueta siguen identificando cada métrica sin depender del color.
- **Feedback visual del selector de pagos del POS (`PosView`)**: Efectivo, Tarjeta y Transferencia se muestran completamente en negro en reposo. Al hover, sólo el ícono pasa a un tile con el pastel correspondiente y el borde adopta ese acento, como en Historial. Al seleccionar, el fondo y borde quedan en pastel y el ícono y texto continúan negros. El flujo de pagos y el foco de escaneo no cambian.
- **Delta de spec `ui-sales`**: el requirement "Payment breakdown display" se acota explícitamente a la visualización *por venta individual* (lista, detalle, devoluciones), que sigue en texto plano sin color; se agrega una excepción nombrada y acotada para los acentos de las cinco cards del resumen *agregado del día* de Historial de ventas.
- **Delta de spec `ui-foundation`**: se agrega un requirement normativo nuevo de que el header no produce overflow horizontal en los anchos de escritorio/tablet soportados, con los 8 ítems, el chip de rol y el control de cierre de sesión siempre alcanzables sin scroll horizontal — hoy no existe ningún escenario normativo sobre esto.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-sales`: se modifica el requirement "Payment breakdown display" para acotar el "sin color" a la visualización por venta individual y permitir explícitamente los cinco acentos del resumen agregado del día.
- `ui-foundation`: se agrega un requirement nuevo sobre ausencia de overflow horizontal del header de navegación en los anchos de escritorio/tablet soportados.
- `ui-pos`: se agrega un requirement para el feedback visual accesible de las tres opciones del selector de medio de pago.

## Impact

- Modificados: `src/components/shell/Nav.tsx`; `src/components/ui/StatCard.tsx`; `src/components/reports/SalesReportView.tsx`; `src/components/reports/InventoryValuationView.tsx`; `src/components/reports/charts/LineChart.tsx`; `src/components/returns/ReturnHistory.tsx`; `src/components/ui/Dialog.tsx` (sin cambio de comportamiento, sólo confirmación de nivel de jerarquía); `src/components/sales/SaleDetail.tsx`; `src/components/users/UserDetailView.tsx`; `src/components/inventory/InventoryView.tsx`; `src/components/categories/CategoriesView.tsx`; `src/components/sales/SalesView.tsx` (función `SummaryCards`); `src/components/pos/PosView.tsx`.
- Sin cambios de permisos, roles, endpoints ni tipos de dominio (`lib/types.ts`, `lib/salesSummary.ts` sin cambios). Si se extiende el `type Tone` local de `StatCard.tsx`, es una extensión interna del componente, no un tipo de dominio.
- Sin dependencia de backend ni de otro change de frontend en curso. Puede desplegarse solo, en cualquier momento.
