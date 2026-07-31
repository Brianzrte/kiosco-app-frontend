# ui-reports

## Purpose

Resumen de ventas, evolución diaria, ventas por cajero, ventas por producto y top de productos — todas agregaciones de venta, de sólo lectura, exclusivas de Admin. El historial de movimientos de stock vive en `ui-inventory` desde `add-frontend-inventory-v15` (`GET /api/v1/inventory/movements`); `/reports/stock/history` fue retirado por el backend en `add-reporting-v15`.

Fuente: `CLAUDE.md` (spec de frontend y design system), los specs de backend en `../backend/docs/specs/` y `../backend/openspec/specs/reporting/spec.md`, y la skill `dataviz` para los gráficos.
## Requirements
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

### Requirement: Reports are Admin-only in MVP
Access to `/reports` SHALL be limited to the Admin role until the Business Owner role exists.

#### Scenario: Non-admin blocked
- **WHEN** a Cashier or Inventory Manager navigates to `/reports`
- **THEN** access is denied by the role gate

### Requirement: Chart rendering standards
Every chart the frontend renders SHALL follow a single set of rules. Single-series charts SHALL use the brand Primary colour. Charts with two or more simultaneous categories SHALL use the dedicated data palette (`#2166AC`, `#B2560D`, `#762A83`, `#1B7837`), assigned in fixed order and never cycled; brand mauve tints SHALL NOT be used as series colours, because they are indistinguishable from one another under colour-vision deficiency. Beyond the palette's capacity, further categories SHALL be folded into an "Otros" group rather than assigned generated colours. Charts SHALL NOT use two vertical scales under any circumstance, SHALL NOT use pie or donut form for more than three categories, and SHALL render text in text tokens rather than in series colours. Every chart SHALL be accompanied by the table of the same data.

#### Scenario: Single series keeps brand identity
- **WHEN** a chart displays one series
- **THEN** its marks use the brand Primary colour

#### Scenario: Categorical series use the data palette in order
- **WHEN** a chart displays two or more categories
- **THEN** colours are taken from the data palette in fixed order, and a filter that removes a category does not repaint the remaining ones

#### Scenario: No dual axis
- **WHEN** two measures of different scale must be shown
- **THEN** they are rendered as two charts sharing a horizontal axis, never as one chart with two vertical scales

#### Scenario: Chart never replaces the table
- **WHEN** any report renders a chart
- **THEN** the corresponding table of exact values is present on the same screen

#### Scenario: Values are readable without colour
- **WHEN** a chart is rendered
- **THEN** labels, values, and axes use text tokens, and every series is identifiable by a label as well as by colour

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

### Requirement: Supplier purchasing performance report
The frontend SHALL provide an Admin-only purchase report by supplier and date range using a backend aggregate, presenting investment, purchase-order count, complete and incomplete deliveries, and undelivered products. It SHALL render returned monetary values through `formatMoney()` and SHALL never derive these metrics by regrouping paginated purchase orders in the browser.

#### Scenario: Supplier performance for a range
- **WHEN** an Admin selects a date range and optional supplier filter
- **THEN** the report displays the backend-returned investment, order count, delivery-completion figures and undelivered products for that selection

#### Scenario: No purchases in range
- **WHEN** the selected range has no purchases
- **THEN** an empty state explains that there are no purchases for the period and offers clearing the active filters

#### Scenario: Aggregate request fails
- **WHEN** the supplier performance request fails
- **THEN** the backend message and retry action are shown and no partial metric is displayed

#### Scenario: Non-admin is blocked
- **WHEN** a user without Admin role reaches the supplier report route
- **THEN** the frontend redirects away before requesting report data

