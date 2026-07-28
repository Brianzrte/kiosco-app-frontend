## MODIFIED Requirements

### Requirement: Sales summary by date range
The frontend SHALL show a sales summary from `GET /api/v1/reports/sales/summary` with a date-range selector, presenting range totals as stat tiles rather than as a chart, and supporting the `group_by` parameter to switch between the range total and the daily breakdown. The summary SHALL appear on the reports dashboard, above the daily trend. Report views SHALL never expose write actions.

#### Scenario: Summary for a range
- **WHEN** the user selects a date range
- **THEN** the summary for that range is fetched and displayed

#### Scenario: Empty range
- **WHEN** the selected range has no sales
- **THEN** an empty state explains there are no sales in the period

#### Scenario: Totals are not charted
- **WHEN** the range total is displayed
- **THEN** it is presented as stat tiles, not as a chart of two values

### Requirement: Top products
The frontend SHALL display top-selling products from `GET /api/v1/reports/products/top` as a ranked, read-only list. On the reports dashboard this SHALL be the compact three-product card described by `ui-reports-dashboard`, showing product name and quantity sold only.

#### Scenario: Top products listed
- **WHEN** the top products view loads
- **THEN** products are listed in descending sales order

### Requirement: Daily revenue trend
The frontend SHALL show the daily evolution of sales over the selected range using `GET /api/v1/reports/sales/summary?group_by=day`, rendered as a line chart on the reports dashboard at reduced height and width (two-thirds of its card, sharing it with the comparison against the previous period defined in `ui-reports-dashboard`). Days absent from the response SHALL be rendered as zero in the chart so the line never implies continuity across a day with no sales. The frontend SHALL NOT regroup or recompute daily aggregates itself. The day-by-day table this trend used to be paired with is not part of the dashboard — the same days, with a payment-method and cashier breakdown besides, are the daily sales report in `ui-reports-detail`.

#### Scenario: Trend over a range
- **WHEN** an Admin selects a date range
- **THEN** a line chart shows one point per day in the range with its revenue

#### Scenario: A day without sales reads as zero
- **WHEN** the backend omits a day within the range
- **THEN** that day appears at zero in the chart and the line does not connect across it as if it did not exist

#### Scenario: The table is not padded
- **WHEN** days are missing from the response
- **THEN** the dashboard renders no day-by-day table at all, and the daily sales report of `ui-reports-detail` lists only the rows the backend returned, with no fabricated entries

#### Scenario: Grouping is never recomputed
- **WHEN** the trend renders
- **THEN** it plots the rows as returned, performing no client-side date grouping

#### Scenario: Long ranges stay legible
- **WHEN** the range spans enough days that axis labels would collide
- **THEN** a subset of ticks is shown and label text is not rotated

## REMOVED Requirements

### Requirement: Sales by cashier
**Reason**: Evaluado en uso, no aporta en el dashboard: repite información que el operador busca en un reporte dedicado, y su gráfico se vuelve ilegible apenas hay muchos cajeros. `/reports` pasa a ser un dashboard compacto y esta sección no sobrevive el recorte.

**Migration**: El dato sigue disponible en el backend (`GET /api/v1/reports/sales/by-cashier`, sin cambios). El cajero de cada venta pasa a mostrarse en el reporte de ventas por día de `ui-reports-detail`, que es donde se lo consulta en la práctica. Si vuelve a hacer falta el desglose agregado por persona, se re-especifica como reporte propio, no como sección del dashboard.

### Requirement: Sales by product
**Reason**: Reemplazado por el reporte de productos de `ui-reports-detail`, que responde lo mismo y más: incluye stock, costo, precio y margen, y —a diferencia de este— también los productos sin ventas, que son los que el operador busca al filtrar por menos vendidos.

**Migration**: El endpoint `GET /api/v1/reports/sales/by-product` sigue existiendo en el backend. La pantalla se reemplaza por `/reports/products`, especificada en `ui-reports-detail` y bloqueada hasta que exista el endpoint pedido en `backend-request.md`. `BarChart.tsx` se conserva: lo reusa ese reporte.
