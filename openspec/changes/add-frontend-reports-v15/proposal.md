# Proposal: add-frontend-reports-v15

## Why

La pantalla de reportes hoy muestra cuatro cosas en tablas: resumen del rango, top de productos, historial de ventas y detalle de venta. Funciona, pero responde mal la pregunta que motiva abrir un reporte: **¿cómo viene el negocio?** Un total en una tarjeta no muestra evolución, y una tabla de 30 filas de ingresos diarios exige que el operador construya la tendencia en su cabeza.

`add-reporting-v15` habilita justamente eso: `group_by=day` sobre el resumen, más ventas por cajero y ventas por producto. Y al mismo tiempo retira el historial de movimientos de stock, que se muda a Inventory.

## What Changes

- **Gráfico de evolución diaria de ingresos** (`GET /reports/sales/summary?group_by=day`), que es el reporte que hoy no existe en ninguna forma.
- **Ventas por cajero** (`GET /reports/sales/by-cashier`) — las "estadísticas de usuarios": cantidad de ventas e ingresos por persona.
- **Ventas por producto** (`GET /reports/sales/by-product`), con filtro opcional por categoría.
- **Gráficos junto a las tablas, no en lugar de ellas.** Cada reporte mantiene su tabla: el gráfico responde "cómo viene", la tabla responde "cuánto exactamente".
- **Retiro del historial de movimientos de stock** de la pantalla de reportes, cedido a Inventory en `add-frontend-inventory-v15`.
- **Paleta de datos propia y validada.** La paleta de marca mauve/rosa no puede usarse como paleta categórica: sus tonos son el mismo matiz a distinta claridad y resultan indistinguibles para daltonismo. Se define una paleta de series aparte, verificada con el validador de la skill `dataviz`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-reports`: se agregan `Daily revenue trend`, `Sales by cashier`, `Sales by product` y `Chart rendering standards`. `Sales summary by date range` se amplía con la agrupación diaria. Se retira `Stock movement history`, cedido a `ui-inventory`.

## Impact

- Modificados: `src/components/reports/ReportsView.tsx` (retiro del historial de stock, secciones nuevas), tokens del design system (paleta de datos).
- Nuevos: componentes de gráfico en `src/components/reports/charts/`.
- **Depende de `add-reporting-v15` + `add-inventory-v15` (backend), que van juntos**, y debe desplegarse en el mismo release que `add-frontend-inventory-v15` — si no, el historial de movimientos desaparece de ambos lados o queda duplicado.
- Sin dependencias externas nuevas: los gráficos se construyen en SVG con los tokens del sistema, sin biblioteca de charting.

## Zona horaria del agrupamiento diario: decidida

`add-reporting-v15/design.md` dejó la zona horaria sin decidir y lo marcó como bloqueante. **Queda definida en `America/Argentina/Buenos_Aires` (UTC−3)**: el kiosco opera en Buenos Aires y "las ventas del martes" significa el día local.

Se especifica con el identificador IANA y no con un offset fijo de −3, para que un eventual regreso del horario de verano no corra el límite del día una hora sin que nadie lo note.

La agrupación es del backend. El frontend **no puede compensarla**: reagrupar en el cliente duplicaría la lógica del reporte y garantizaría que las dos versiones se separen. Si el backend agrupa en UTC, las ventas después de las 21:00 hora local se imputan al día siguiente y el gráfico no concilia contra la caja física, en silencio. Es verificación obligatoria antes de dar el gráfico por bueno.
