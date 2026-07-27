# ui-reports

## Purpose

Resumen de ventas, evolución diaria, ventas por cajero, ventas por producto y top de productos — todas agregaciones de venta, de sólo lectura, exclusivas de Admin. El historial de movimientos de stock vive en `ui-inventory` desde `add-frontend-inventory-v15` (`GET /api/v1/inventory/movements`); `/reports/stock/history` fue retirado por el backend en `add-reporting-v15`.

Fuente: `CLAUDE.md` (spec de frontend y design system), los specs de backend en `../backend/docs/specs/` y `../backend/openspec/specs/reporting/spec.md`, y la skill `dataviz` para los gráficos.

## Requirements

### Requirement: Sales summary by date range
The frontend SHALL show a sales summary from `GET /api/v1/reports/sales/summary` with a date-range selector, presenting range totals as stat tiles rather than as a chart, and supporting the `group_by` parameter to switch between the range total and the daily breakdown. Report views SHALL never expose write actions.

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
The frontend SHALL display top-selling products from `GET /api/v1/reports/products/top` as a ranked, read-only list.

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
The frontend SHALL show the daily evolution of sales over the selected range using `GET /api/v1/reports/sales/summary?group_by=day`, rendered as a line chart. Days absent from the response SHALL be rendered as zero in the chart so the line never implies continuity across a day with no sales; the accompanying table SHALL show only the rows the backend returned, with no fabricated entries. The frontend SHALL NOT regroup or recompute daily aggregates itself.

#### Scenario: Trend over a range
- **WHEN** an Admin selects a date range
- **THEN** a line chart shows one point per day in the range with its revenue

#### Scenario: A day without sales reads as zero
- **WHEN** the backend omits a day within the range
- **THEN** that day appears at zero in the chart and the line does not connect across it as if it did not exist

#### Scenario: The table is not padded
- **WHEN** days are missing from the response
- **THEN** the table lists only the returned rows

#### Scenario: Grouping is never recomputed
- **WHEN** the trend renders
- **THEN** it plots the rows as returned, performing no client-side date grouping

#### Scenario: Long ranges stay legible
- **WHEN** the range spans enough days that axis labels would collide
- **THEN** a subset of ticks is shown and label text is not rotated

### Requirement: Sales by cashier
The frontend SHALL show sales count and revenue per cashier from `GET /api/v1/reports/sales/by-cashier` as a horizontal bar chart plus a table. Cashiers who have been deactivated SHALL still appear, marked with a labelled inactive badge, so per-cashier figures reconcile against the range total.

#### Scenario: Breakdown by cashier
- **WHEN** an Admin requests the cashier breakdown for a range
- **THEN** each cashier appears with sales count and revenue, in both chart and table

#### Scenario: Deactivated cashiers are included and marked
- **WHEN** a cashier with sales in the range has since been deactivated
- **THEN** they still appear, carrying a labelled inactive badge

#### Scenario: Figures reconcile
- **WHEN** the per-cashier revenues are summed
- **THEN** the sum equals the range total shown in the summary

### Requirement: Sales by product
The frontend SHALL show quantity sold and revenue per product from `GET /api/v1/reports/sales/by-product` as a horizontal bar chart plus a table, with an optional category filter. Product names SHALL be displayed as returned by the backend, which sources them from the sale snapshot. When more products are returned than the chart can legibly display, the remainder SHALL be folded into a single "Otros" bar while the table retains every row.

#### Scenario: Breakdown by product
- **WHEN** an Admin requests the product breakdown for a range
- **THEN** each product appears with quantity sold and revenue

#### Scenario: Filter by category
- **WHEN** a category filter is applied
- **THEN** only products of that category are returned and displayed

#### Scenario: Long tail is folded in the chart only
- **WHEN** the response contains more products than the chart displays legibly
- **THEN** the chart shows the top products plus a single "Otros" bar, and the table still lists every product
