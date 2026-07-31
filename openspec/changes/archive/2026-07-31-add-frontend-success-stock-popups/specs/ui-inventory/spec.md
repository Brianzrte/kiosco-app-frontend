## MODIFIED Requirements

### Requirement: Stock view per product

The frontend SHALL show current stock from the inventory endpoints, displaying quantity, minimum quantity, and last update. Low-stock status SHALL be taken from the backend and SHALL NOT be derived in the client. The list SHALL visually distinguish three states — not initialised, initialised at zero, and below minimum — using text, never colour alone. Pagination SHALL use the backend's `page` parameter.

The screen SHALL support opening directly to a specific product's "Gestionar stock" dialog via a `product_id` query parameter in its URL, resolving that product with `GET /api/v1/products/{id}` independently of whichever page of the paginated, filtered list is currently loaded. When that product resolves, its "Gestionar stock" dialog SHALL open immediately — in initialization mode if it has no stock record, or in adjustment mode if it does — with the same content it would show if opened by clicking its row. When `product_id` is absent, the screen's behavior SHALL be unchanged from before this requirement was extended.

#### Scenario: Stock displayed
- **WHEN** the inventory screen loads a product's stock
- **THEN** quantity, minimum quantity, and updated-at are shown

#### Scenario: Low stock highlighted
- **WHEN** a product is reported low on stock by the backend
- **THEN** it is highlighted with the Warning color and an accompanying text label

#### Scenario: Uninitialised is distinct from zero
- **WHEN** a product has no stock record and another has quantity zero
- **THEN** the first reads as not initialised and offers initialisation, and the second reads as zero and offers adjustment

#### Scenario: Threshold rule is never reimplemented
- **WHEN** the stock list renders
- **THEN** no client-side comparison between quantity and minimum quantity determines what is shown as low stock

#### Scenario: Pagination advances
- **WHEN** the user moves to the next page of the stock list
- **THEN** the request sends the `page` parameter and different rows are returned

#### Scenario: Opening directly to a product via URL
- **WHEN** the inventory screen loads with `?product_id={id}` for an existing
  product
- **THEN** that product's "Gestionar stock" dialog opens immediately, without
  requiring the product to appear on the currently loaded page of the list

#### Scenario: Deep-linked product not found
- **WHEN** `?product_id={id}` does not resolve to an existing product, or the
  lookup fails
- **THEN** no dialog opens, a short non-blocking message explains it, and the
  underlying list remains usable

#### Scenario: No query parameter behaves as before
- **WHEN** the inventory screen loads without a `product_id` parameter
- **THEN** its behavior is exactly as it was before this requirement was
  extended
