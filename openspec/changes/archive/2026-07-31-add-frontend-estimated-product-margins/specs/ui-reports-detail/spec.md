## MODIFIED Requirements

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
