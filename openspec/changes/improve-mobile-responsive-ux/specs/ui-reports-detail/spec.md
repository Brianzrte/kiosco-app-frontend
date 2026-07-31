## MODIFIED Requirements

### Requirement: Daily sales report
`/reports/sales` SHALL list one row per calendar day in the selected range, each showing the date, the day's total revenue, how much of it was paid in cash, how much by card, how much by bank transfer, and the cashier. The day grouping and every per-day monetary total SHALL come from a backend aggregation; the frontend SHALL NOT group individual sales by date nor recompute a day's payment amounts client-side. Range-level summary totals MAY be derived by adding the backend's per-day amounts. A payment method the backend does not report for a day SHALL render as zero rather than being omitted, so the columns stay aligned across rows.

The range-level summary SHALL be presented using the same summary-cards component used for the range-level summary on Historial de ventas (`/sales`), including its mobile carousel behaviour, instead of a separate implementation. The day-by-day list SHALL paginate its render — a fixed number of days per page with page navigation, matching the visual pattern already used by the purchasing history list — rather than mounting every day in the selected range at once; the request to the backend aggregation endpoint is unaffected, since it already returns the whole range in one response and grouping by day is not something the frontend performs itself.

#### Scenario: Days listed with payment split
- **WHEN** an Admin opens the sales report for a range
- **THEN** each day in the range with sales appears with its total, its cash, card, and transfer amounts, and its cashier

#### Scenario: Grouping is never done client-side
- **WHEN** the report renders
- **THEN** it consumes rows already grouped by day from the backend, and does not fetch a paginated listing of individual sales to group them

#### Scenario: Method with no sales that day
- **WHEN** a day has no payments of a given method
- **THEN** that column shows zero for that day rather than being blank or absent

#### Scenario: Range with no sales
- **WHEN** the selected range contains no confirmed sales
- **THEN** an empty state explains there are no sales in the period

#### Scenario: Range summary reuses the shared cards
- **WHEN** an Admin opens the sales report for a range
- **THEN** the range-level summary is presented with the same cards component used on Historial de ventas, adapted to the report's own data, and not a separately implemented summary layout

#### Scenario: Day list is paginated instead of fully mounted
- **WHEN** the selected range contains more days than fit on one page
- **THEN** the day list shows a bounded number of days at a time with page navigation, instead of rendering every day in the range simultaneously

### Requirement: Sales report period filters
`/reports/sales` SHALL offer period presets — weekly, monthly, and last six months — that set the date range, while leaving the explicit range still editable. Selecting a preset SHALL re-fetch the report for that range.

Below the `md` breakpoint, the period presets SHALL remain directly visible; the explicit Desde/Hasta range inputs SHALL collapse into the shared collapsible filter group.

#### Scenario: Preset sets the range
- **WHEN** an Admin selects a period preset
- **THEN** the date range updates to match it and the report re-fetches for that range

#### Scenario: Explicit range still available
- **WHEN** an Admin edits the date range directly after using a preset
- **THEN** the report honours the edited range

#### Scenario: Presets stay visible on mobile
- **WHEN** the sales report is viewed below the `md` breakpoint
- **THEN** the period presets remain visible without expanding any collapsed group

#### Scenario: Explicit range is collapsed by default on mobile
- **WHEN** the sales report is viewed below the `md` breakpoint
- **THEN** the explicit Desde/Hasta inputs are reachable inside a collapsed group, not expanded by default

### Requirement: Products report
`/reports/products` SHALL list products with, for each: the quantity sold in the range, current stock, purchase cost, sale price, and the margin that product's sales produced. It SHALL offer a sort filter for best-selling and worst-selling. Worst-selling SHALL include products with zero sales in the range, which means the listing SHALL be sourced from a catalogue-wide backend report rather than from a sales-derived one. Cost, price, and margin SHALL come from the backend as computed figures; the frontend SHALL NOT multiply cost by quantity nor derive margin itself.

Below the `md` breakpoint, the product list SHALL render as one card per product instead of a table, each card showing at minimum the product name, cost, and price, without requiring horizontal scrolling; the period and best/worst-selling filters SHALL collapse into the shared collapsible filter group.

#### Scenario: Product rows are complete
- **WHEN** an Admin opens the products report for a range
- **THEN** each product shows quantity sold, stock, cost, price, and the margin its sales produced

#### Scenario: Worst-selling includes unsold products
- **WHEN** the worst-selling filter is applied
- **THEN** products with zero sales in the range appear in the listing

#### Scenario: Margin is not computed client-side
- **WHEN** the report renders
- **THEN** margin figures come from the backend response, with no cost-times-quantity arithmetic in the client

#### Scenario: Mobile products report renders cards
- **WHEN** the products report is viewed below the `md` breakpoint
- **THEN** each product renders as a card showing at minimum its name, cost, and price, without a horizontally scrolling table

#### Scenario: Filters are collapsed by default on mobile
- **WHEN** the products report is viewed below the `md` breakpoint
- **THEN** the period and sort filters are reachable inside a collapsed group, not expanded by default

### Requirement: Supplier purchases report
`/reports/purchases` lists the orders placed to suppliers, each showing the date, the order value, whether it was received, and who received it, filterable by week, by month, and by supplier. This report is live and reachable from the reports dashboard; it no longer depends on a supplier and purchasing domain that "does not exist in the backend" — that domain now exists and this report already consumes it.

Below the `md` breakpoint, the order list SHALL render as one card per order instead of a table, each card showing at minimum the date, total, and received status, without requiring horizontal scrolling; the week/month/supplier filters SHALL collapse into the shared collapsible filter group.

#### Scenario: Orders are listed
- **WHEN** an Admin opens the purchases report
- **THEN** each order appears with its date, value, received status, and receiving user, filterable by week, month, and supplier

#### Scenario: Mobile purchases report renders cards
- **WHEN** the purchases report is viewed below the `md` breakpoint
- **THEN** each order renders as a card showing at minimum its date, total, and received status, without a horizontally scrolling table

#### Scenario: Filters are collapsed by default on mobile
- **WHEN** the purchases report is viewed below the `md` breakpoint
- **THEN** the week/month/supplier filters are reachable inside a collapsed group, not expanded by default
