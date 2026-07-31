# ui-reports-detail Specification

## Purpose
TBD - created by archiving change add-frontend-reports-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Daily sales report
`/reports/sales` SHALL list one row per calendar day in the selected range, each showing the date, the day's total revenue, how much of it was paid in cash, how much by card, how much by bank transfer, and the cashier. The day grouping and every per-day monetary total SHALL come from a backend aggregation; the frontend SHALL NOT group individual sales by date nor recompute a day's payment amounts client-side. Range-level summary totals SHALL come from backend report aggregations and SHALL NOT be summed from paginated day rows in the client. A payment method the backend does not report for a day SHALL render as zero rather than being omitted, so the columns stay aligned across rows. The day rows SHALL be paginated by the backend, and the report SHALL expose controls to move between available pages. The cashier column SHALL show at most three cashier badges per day; when more than three cashiers exist, it SHALL show an additional `...` badge with the omitted cashier names available through its accessible label and native tooltip.

#### Scenario: Days listed with payment split
- **WHEN** an Admin opens the sales report for a range
- **THEN** each visible day in the selected backend page appears with its total, its cash, card, and transfer amounts, and its cashier

#### Scenario: Grouping is never done client-side
- **WHEN** the report renders
- **THEN** it consumes rows already grouped by day from the backend, and does not fetch a paginated listing of individual sales to group them

#### Scenario: Method with no sales that day
- **WHEN** a day has no payments of a given method
- **THEN** that column shows zero for that day rather than being blank or absent

#### Scenario: Range with no sales
- **WHEN** the selected range contains no confirmed sales
- **THEN** an empty state explains there are no sales in the period

#### Scenario: Day rows are paginated
- **WHEN** the selected range contains more days than the page size
- **THEN** the frontend requests and displays one backend page at a time and allows navigation to the other pages using the returned total

#### Scenario: Summary is stable across pages
- **WHEN** an Admin changes the day-row page
- **THEN** the range summary cards remain based on the complete backend aggregation for the selected date range and do not change to reflect only the visible page

#### Scenario: Summary appears before filters
- **WHEN** the sales report has loaded data
- **THEN** the summary carousel appears before the filters panel, and the filters panel appears before the daily rows

### Requirement: Sales report period filters
`/reports/sales` SHALL offer period presets — today, yesterday, weekly, monthly, and last six months — inside the filters panel, and SHALL leave the explicit range editable. The initial selected period SHALL be the current calendar month, from its first day through today. Selecting a preset SHALL set the date range and re-fetch the report for that range. Editing either date SHALL preserve the custom range and SHALL clear the selected preset state.

#### Scenario: Current month is the default
- **WHEN** an Admin opens the sales report
- **THEN** the report requests the range from the first day of the current calendar month through today and the Mes preset is selected

#### Scenario: Presets are inside the filters panel
- **WHEN** an Admin opens the filters panel
- **THEN** Hoy, Ayer, Semana, Mes, Últimos 6 meses, Desde, and Hasta are available within that panel

#### Scenario: Preset sets the range
- **WHEN** an Admin selects a period preset
- **THEN** the date range updates to match it, the selected preset is visually indicated, and the report re-fetches for that range

#### Scenario: Explicit range remains editable
- **WHEN** an Admin edits Desde or Hasta after using a preset
- **THEN** the report honours the edited range and no preset is shown as selected

#### Scenario: Explicit range still available
- **WHEN** an Admin edits the date range directly after using a preset
- **THEN** the report honours the edited range

### Requirement: Products report
`/reports/products` SHALL list products with, for each: the quantity sold in the range, current stock, purchase cost, sale price, and the margin that product's sales produced. It SHALL offer a sort filter for best-selling and worst-selling. Worst-selling SHALL include products with zero sales in the range, which means the listing SHALL be sourced from a catalogue-wide backend report rather than from a sales-derived one. Cost, price, and margin SHALL come from the backend as computed figures; the frontend SHALL NOT multiply cost by quantity nor derive margin itself. When the backend marks a row with `margin_estimated = true`, the frontend SHALL visibly identify that row's margin and make the explanation `Margen estimado — incluye ventas sin costo histórico registrado, calculado con el costo actual del catálogo` available to assistive technology. Rows with `margin_estimated = false` SHALL show no estimate indicator or disclaimer.

#### Scenario: Product rows are complete
- **WHEN** an Admin opens the products report for a range
- **THEN** each product shows quantity sold, stock, cost, price, and the margin its sales produced

#### Scenario: Worst-selling includes unsold products
- **WHEN** the worst-selling filter is applied
- **THEN** products with zero sales in the range appear in the listing

#### Scenario: Margin is not computed client-side
- **WHEN** the report renders
- **THEN** margin figures come from the backend response, with no cost-times-quantity arithmetic in the client

#### Scenario: Estimated margin is identified
- **WHEN** a product row has `margin_estimated = true`
- **THEN** the row's margin is accompanied by a visible `Margen estimado` indicator and assistive technology can access the explanation `Margen estimado — incluye ventas sin costo histórico registrado, calculado con el costo actual del catálogo`

#### Scenario: Exact margin has no estimate disclaimer
- **WHEN** a product row has `margin_estimated = false`
- **THEN** its margin is displayed without an estimate indicator or disclaimer

#### Scenario: Estimate indicator remains usable on mobile
- **WHEN** an Admin views the report at a viewport as narrow as 320 pixels
- **THEN** the margin and its estimate status remain readable without horizontal scrolling

### Requirement: Inventory valuation
The frontend SHALL provide an inventory valuation view, reachable from the reports dashboard, showing the total cost value and the total sale-price value of the entire inventory, so the operator can see how much capital is tied up in stock. Both totals SHALL be computed by the backend over the whole inventory; the frontend SHALL NOT sum a paginated stock listing.

#### Scenario: Valuation shown
- **WHEN** an Admin opens the inventory valuation
- **THEN** the total cost value and the total sale value of the inventory are displayed

#### Scenario: Totals are not summed client-side
- **WHEN** the valuation renders
- **THEN** it issues a single request for the pre-computed totals and does not page through the stock listing

#### Scenario: Empty inventory
- **WHEN** no product has stock
- **THEN** the valuation shows zero for both totals rather than an error

### Requirement: Supplier purchases report
`/reports/purchases` SHALL list the orders placed to suppliers, each showing the date, the order value, whether it was received, and who received it, filterable by week, by month, and by supplier. This requirement depends on a supplier and purchasing domain that does not exist in the backend; until it does, the dashboard SHALL surface this report as a disabled card and the page SHALL NOT be built.

#### Scenario: Report is not reachable while unsupported
- **WHEN** the backend has no supplier module
- **THEN** the purchases card is disabled on the dashboard and no route to a purchases page exists

#### Scenario: Orders listed once supported
- **WHEN** the supplier module exists and an Admin opens the purchases report
- **THEN** each order appears with its date, value, received status, and receiving user, filterable by week, month, and supplier

