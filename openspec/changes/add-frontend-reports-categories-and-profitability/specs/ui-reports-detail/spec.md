## ADDED Requirements

### Requirement: Profitability report
`/reports/profitability` SHALL show, for the selected range, revenue, spend on supplier purchases, gross margin (revenue minus supplier purchases), units sold, and units purchased, each as its own stat tile. Revenue and units sold SHALL come from the sales aggregation endpoints; spend and units purchased SHALL come from the supplier purchases aggregation endpoint. The frontend SHALL NOT compute revenue or spend by summing a paginated listing of individual sales or purchase orders — only gross margin (revenue minus spend) MAY be computed client-side from those two already-aggregated totals.

#### Scenario: Stat tiles for a range with activity
- **WHEN** an Admin opens the profitability report for a range with sales and supplier purchases
- **THEN** revenue, spend, gross margin, units sold, and units purchased are shown as stat tiles

#### Scenario: Range with no sales or purchases
- **WHEN** the selected range has neither sales nor supplier purchases
- **THEN** every tile shows zero, and no tile is hidden or replaced by an empty state

#### Scenario: Spend without revenue, or revenue without spend
- **WHEN** the selected range has supplier purchases but no sales, or sales but no supplier purchases
- **THEN** gross margin reflects the negative or fully positive result, and is not treated as an error

#### Scenario: Revenue and spend fail independently
- **WHEN** the request backing revenue fails while the request backing spend succeeds, or vice versa
- **THEN** the tile whose request failed shows an error state with its own retry action, and the other tile still renders from its own successful response

### Requirement: Gross margin is never presented as net profit
Wherever the profitability report shows gross margin, it SHALL be labelled "Margen bruto", never "Ganancias" or an equivalent implying net profit, and SHALL be accompanied by visible, always-shown text stating that it is revenue minus supplier purchases and does not deduct rent, salaries, or other operating expenses.

#### Scenario: Margin label and note are always visible
- **WHEN** the profitability report renders the gross margin tile
- **THEN** its label reads "Margen bruto" and the explanatory note is visible as text, not hidden behind a tooltip or icon-only affordance

### Requirement: Product breakout section is disabled until supported
`/reports/profitability` SHALL include a section for identifying products with fast-growing sales ("producto revelación"), comparing each product's quantity sold in a recent window against an equal-length preceding window. This requirement depends on a backend endpoint that does not exist; until it does, the section SHALL render as a visibly disabled block stating the reason, with no fetch performed and no data — fabricated or partial — shown in its place.

#### Scenario: Section disabled while unsupported
- **WHEN** the backend has no endpoint comparing a product's sales across two time windows
- **THEN** the product breakout section renders as a disabled block stating that this comparison is not available yet, and issues no request

#### Scenario: Section populated once supported
- **WHEN** the comparison endpoint exists and an Admin opens the profitability report
- **THEN** the section lists, per qualifying product, the quantity sold in the recent window, the quantity sold in the preceding window, and the growth percentage

#### Scenario: No prior-window sales
- **WHEN** a product sold units in the recent window but had zero sales in the preceding window
- **THEN** its growth is shown as "Sin ventas antes" instead of an infinite or undefined percentage

### Requirement: Link to unsold products
`/reports/profitability` SHALL link to the products report (`/reports/products`), captioned to point at its worst-selling filter, as the way to see products with no sales in a range, rather than duplicating that listing on the profitability page. This requirement does not change `/reports/products` itself — reaching the worst-selling filter from the link still requires selecting it there, same as navigating directly.

#### Scenario: Link reaches the existing report
- **WHEN** an Admin activates the unsold-products link on the profitability report
- **THEN** `/reports/products` opens, where the Admin selects the existing "Menos vendidos" filter to see products with no sales in the range
