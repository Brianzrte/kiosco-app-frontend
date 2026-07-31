## MODIFIED Requirements

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
