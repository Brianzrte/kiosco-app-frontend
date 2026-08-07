## ADDED Requirements

### Requirement: Profitability and cash-flow report
`/reports/profitability` SHALL provide an Admin-only, date-range report with a result region and a separate cash-movements region. The result region SHALL show revenue, cost of goods sold, gross margin, operating expenses and operating result as distinct stat tiles. The cash-movements region SHALL show stock purchases, expense breakdowns by type and payment method, and owner draws. All financial aggregates and classifications SHALL come from one backend profitability summary; the frontend SHALL NOT derive them by summing paginated sales, purchase orders or expenses.

#### Scenario: Result for a period with activity
- **WHEN** an Admin opens the report for a range containing sales and expenses
- **THEN** the result tiles and the separate cash-movements region render from the same backend summary

#### Scenario: No activity in range
- **WHEN** the selected range has no reported activity
- **THEN** every result and cash-movement total shows zero, the report structure remains visible, and text explains that no movements were registered

#### Scenario: Summary request fails
- **WHEN** the profitability summary request fails
- **THEN** the report shows a persistent error with the backend message and an explicit retry action, and does not show a locally calculated substitute

#### Scenario: Non-admin is blocked
- **WHEN** a user without Admin role reaches the profitability route
- **THEN** the frontend redirects away before requesting report data

### Requirement: Result metrics keep profitability distinct from cash movements
The report SHALL label gross margin as `Margen bruto` and define it as revenue minus cost of goods sold. It SHALL label operating result as `Resultado operativo` and define it as gross margin minus operating expenses. Stock purchases SHALL be presented as a cash/inventory movement and SHALL NOT be subtracted again from either margin or operating result. The explanatory text SHALL be visible and SHALL NOT rely on colour, a tooltip, or an icon-only affordance.

#### Scenario: Stock purchase occurs in the selected period
- **WHEN** stock is purchased during the selected range
- **THEN** its amount appears in the cash-movements region and is not presented as a second deduction from gross margin or operating result

#### Scenario: Margin and result are explained
- **WHEN** the report renders its margin and result tiles
- **THEN** visible text distinguishes cost of goods sold, operating expenses and stock purchases without calling either metric `Ganancias`

### Requirement: Owner draws are excluded from business result
The report SHALL show `Retiros personales` separately from operating expenses and operating result. It SHALL explain that owner draws affect cash but are not business expenses and SHALL NOT include them in a displayed result total.

#### Scenario: Range includes owner draws
- **WHEN** the range contains both business expenses and owner draws
- **THEN** the owner-draw total is shown in the cash-movements region separately, and no business-expense or operating-result figure includes it

### Requirement: Product breakout section is disabled until supported
`/reports/profitability` SHALL include a section for identifying products with fast-growing sales (`Producto revelación`), comparing each product's quantity sold in a recent window against an equal-length preceding window. Until the backend supports this comparison, the section SHALL render as a visibly disabled, non-interactive block stating the reason, issue no request, and show no fabricated or partial data.

#### Scenario: Section disabled while unsupported
- **WHEN** the backend has no endpoint comparing a product's sales across two time windows
- **THEN** the product breakout section renders as a disabled block stating that this comparison is not available yet and issues no request

#### Scenario: Section populated once supported
- **WHEN** the comparison endpoint exists and an Admin opens the profitability report
- **THEN** the section lists, per qualifying product, the quantity sold in the recent window, the quantity sold in the preceding window, and the growth percentage

#### Scenario: No prior-window sales
- **WHEN** a product sold units in the recent window but had zero sales in the preceding window
- **THEN** its growth is shown as `Sin ventas antes` instead of an infinite or undefined percentage

### Requirement: Link to unsold products
`/reports/profitability` SHALL link to the products report (`/reports/products`), captioned to point at its worst-selling filter, as the way to see products with no sales in a range, rather than duplicating that listing on the profitability page. This requirement does not change `/reports/products` itself.

#### Scenario: Link reaches the existing report
- **WHEN** an Admin activates the unsold-products link on the profitability report
- **THEN** `/reports/products` opens, where the Admin can select the existing `Menos vendidos` filter
