## Why

El dueño no tiene, hoy, dos lecturas básicas para decidir reposición y evaluar la salud del negocio: qué categorías de producto generan más ventas en un período (sin sumar productos a mano en el reporte de productos), y una vista única que combine ingresos, compras a proveedores, margen bruto y unidades movidas en ambos sentidos. Ambos requerimientos fueron aprobados por el dueño como parte de un mismo pedido de reporting y se resuelven en un solo change, por decisión explícita del dueño y no del analista, que había recomendado dividirlos por madurez de backend dispar.

De las dos piezas, casi todo es construible ya: ventas por categoría requiere un endpoint de agregación nuevo; ingresos, egresos, margen bruto y unidades vendidas/compradas son construibles con backend existente más un campo aditivo chico en `purchases/by-supplier`; productos sin venta ya está resuelto por `/reports/products?sort=worst_selling`, sin desarrollo nuevo. La única pieza sin construir es "producto revelación" (comparación de ventas entre dos ventanas de tiempo por producto), que no tiene ningún endpoint de soporte y queda documentada por completo pero bloqueada dentro de este mismo change hasta que el backend-request correspondiente se resuelva y despliegue.

## What Changes

- Agregar al dashboard de `/reports` una sección "Categorías más vendidas", con el mismo patrón visual, de carga, vacío y error que "Productos más vendidos" (`TopProductsCard`), rankeando categorías por ingreso del período con sus unidades vendidas. Depende de un endpoint nuevo de agregación por categoría (ver `backend-request.md`); la sección queda bloqueada hasta que ese endpoint se despliegue.
- Agregar una página nueva `/reports/profitability` ("Rentabilidad"), admin-only, con su propia nav card en el dashboard, mostrando stat tiles de ingresos, egresos (compras a proveedores), margen bruto (ingresos − egresos, con nota explícita de que no es ganancia neta), unidades vendidas y unidades compradas del período — construible con endpoints existentes más un campo aditivo (`total_quantity_purchased` o equivalente) en `GET /reports/purchases/by-supplier`.
- Dentro de la misma página, documentar y dejar visiblemente deshabilitada (nunca con datos inventados) una sección de "producto revelación" — % de crecimiento de ventas de cada producto entre dos ventanas de tiempo iguales y consecutivas — hasta que el endpoint que la soporta exista y se despliegue.
- No se desarrolla nada nuevo para "productos sin venta": la página de rentabilidad enlaza al filtro "Menos vendidos" ya existente en `/reports/products`.

## Capabilities

### Modified Capabilities

- `ui-reports-dashboard`: nueva sección "Categorías más vendidas" en el dashboard (bloqueada hasta que exista el endpoint de agregación por categoría) y nueva nav card hacia `/reports/profitability`.
- `ui-reports-detail`: nueva página `/reports/profitability` con stat tiles de ingresos/egresos/margen bruto/unidades y la sección de producto revelación documentada como deshabilitada hasta que su backend exista.

## Impact

- `src/components/reports/ReportsView.tsx`: nueva sección de categorías (ej. `TopCategoriesCard`), mirroring `TopProductsCard` (líneas 270-317); nueva `ReportNavCard` hacia `/reports/profitability` en `ReportNavCards()`.
- `src/lib/reports.ts`: nuevo tipo `CategorySalesItem`; posible helper puro `sumQuantity` para totalizar unidades vendidas/compradas del período.
- Nuevo `src/components/reports/ProfitabilityReportView.tsx`, mirroring la estructura de `PurchasesReportView.tsx`/`ProductsReportView.tsx`.
- Nuevo `src/app/(app)/reports/profitability/page.tsx`, gateado a `admin`, mirroring `reports/products/page.tsx`.
- Requiere backend: endpoint nuevo `GET /reports/sales/by-category`, campo aditivo en `GET /reports/purchases/by-supplier`, y endpoint nuevo de comparación de ventas por producto entre ventanas de tiempo. Ver `backend-request.md`. La sección de categorías y la de producto revelación quedan bloqueadas hasta que su respectiva coordinación se despliegue; la sección de ingresos/egresos/margen/unidades vendidas/compradas es implementable hoy salvo unidades compradas, que espera el campo aditivo.
- No agrega dependencias.
