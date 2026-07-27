## ADDED Requirements

### Requirement: Reports dashboard layout
`/reports` SHALL present a compact dashboard rather than a stack of full-length report sections. It SHALL contain, in this order: the date-range selector, the range summary tiles, a daily revenue chart rendered at reduced height alongside its period comparison, a card listing the top 3 selling products, and the navigation cards to the detail reports. The whole dashboard SHALL be reachable without horizontal scrolling on mobile widths.

#### Scenario: Dashboard on load
- **WHEN** an Admin opens `/reports`
- **THEN** the summary, the compact daily chart with its comparison, the top-3 card, and the report navigation cards are all present on one screen

#### Scenario: Detail reports are not inlined
- **WHEN** the dashboard renders
- **THEN** no per-cashier breakdown, per-product breakdown, or full sales listing appears on it — those live in their own pages

### Requirement: Comparison against the previous period
Within the same card as the daily revenue chart, laid out beside it in a 2:3 (chart) / 1:3 (comparison) split, the frontend SHALL show how the selected range compares to the immediately preceding range of equal length, as a signed percentage of total revenue. Both figures SHALL come from the backend's range summary endpoint — one request per range — and the frontend SHALL NOT derive either total from individual sales. The comparison text SHALL name the period it compares against in terms of the range's own length, never asserting a calendar period the range does not match.

#### Scenario: Revenue increased
- **WHEN** the selected range totals more revenue than the preceding range of equal length
- **THEN** a positive percentage is shown, naming the period compared against

#### Scenario: Revenue decreased
- **WHEN** the selected range totals less than the preceding range
- **THEN** a negative percentage is shown

#### Scenario: Previous period had no sales
- **WHEN** the preceding range has zero revenue and the selected range has revenue
- **THEN** the card states there were no sales in the previous period instead of showing an infinite or undefined percentage

#### Scenario: Both periods empty
- **WHEN** both the selected and the preceding range have zero revenue
- **THEN** no comparison is shown

#### Scenario: Comparison is never computed from raw sales
- **WHEN** the comparison renders
- **THEN** exactly two range-summary requests back it, and no listing of individual sales is fetched to produce it

### Requirement: Compact daily revenue chart
The daily revenue chart on the dashboard SHALL render at a reduced height compared to the standalone chart it replaces, taking the left two-thirds of its card's width (the right third is the period comparison), while keeping every rule that governs it: zero-filled days in the chart only, no client-side regrouping, and subsampled axis ticks without rotated labels. The day-by-day table this chart used to be paired with is not part of the dashboard card — it lives in the daily sales report (`ui-reports-detail`), which shows the same days with a payment-method and cashier breakdown besides.

#### Scenario: Reduced height, still legible
- **WHEN** the dashboard renders the daily chart
- **THEN** it occupies less vertical space than the previous standalone chart, without axis labels colliding or being clipped

#### Scenario: Chart rules still hold
- **WHEN** the compact chart renders
- **THEN** absent days still read as zero and ticks are still subsampled rather than rotated

#### Scenario: The detailed table lives in the daily sales report
- **WHEN** an operator needs the exact per-day figures behind the chart
- **THEN** they are the rows of the daily sales report (`/reports/sales`), not a table inlined in the dashboard card

### Requirement: Top selling products card
The dashboard SHALL show a card listing the 3 best-selling products of the selected range, each with the quantity sold, sourced from the backend's top-products endpoint. It SHALL show only the product name and its quantity — no chart, no revenue column, no ranking decoration beyond order.

#### Scenario: Top three listed
- **WHEN** the range contains sales
- **THEN** the three best-selling products are listed in descending order with their quantity sold

#### Scenario: Fewer than three products sold
- **WHEN** the range contains sales of fewer than three distinct products
- **THEN** only the products that sold are listed, without padding the list

#### Scenario: No sales in range
- **WHEN** the range contains no sales
- **THEN** the card shows an empty state instead of an empty list

### Requirement: Navigation cards to detail reports
The dashboard SHALL present each detail report as a card that acts as a navigation control to its own page. A report whose backend support does not yet exist SHALL be rendered as a visibly disabled card stating the reason, and SHALL NOT be a link — it must be impossible to navigate to a page that cannot load.

#### Scenario: Available report opens its page
- **WHEN** an Admin activates an enabled report card, by pointer or by keyboard
- **THEN** the corresponding report page opens

#### Scenario: Unavailable report is disabled, not hidden
- **WHEN** a report's backend support does not exist
- **THEN** its card is shown in a disabled state carrying the reason, is marked as disabled to assistive technology, and carries no navigation target

#### Scenario: Keyboard reachable
- **WHEN** the user navigates the dashboard by keyboard
- **THEN** every enabled card receives visible focus and activates with Enter

### Requirement: Dashboard is Admin-only
`/reports` and every page beneath it SHALL be restricted to the Admin role, each page enforcing the check itself rather than relying on the navigation menu hiding the link.

#### Scenario: Non-admin blocked from a subpage by direct URL
- **WHEN** a Cashier or Inventory Manager navigates directly to a report subpage URL
- **THEN** access is denied by that page's own role gate
