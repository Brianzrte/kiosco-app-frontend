# ui-inventory

## Purpose

Vista de stock, inicialización y ajuste manual con motivo obligatorio.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.
## Requirements
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

### Requirement: Initialize stock
The frontend SHALL allow initializing stock for a product without stock via `POST /api/v1/inventory/stock` with `{ product_id, quantity, reason }`, where quantity SHALL be ≥ 0.

#### Scenario: Stock initialized
- **WHEN** a valid initialization is submitted
- **THEN** the stock record is created and the view shows the new quantity

### Requirement: Manual stock adjustment requires a reason
The frontend SHALL provide an adjustment form sending `{ quantity_delta, reason }` to `POST /api/v1/inventory/stock/{product_id}/adjust`. The form SHALL NOT submit with an empty reason, and positive/negative deltas SHALL be clearly distinguished (entrada/salida).

#### Scenario: Adjustment without reason blocked
- **WHEN** the user tries to submit an adjustment with an empty reason
- **THEN** submission is blocked and the reason field shows a required-field message

#### Scenario: Successful adjustment
- **WHEN** a delta with a reason is submitted and accepted
- **THEN** the displayed quantity updates and a success toast appears

#### Scenario: Backend rejects adjustment
- **WHEN** the backend rejects the adjustment (e.g. would go below zero)
- **THEN** the backend message is shown and the form values are preserved

### Requirement: Set minimum quantity
The frontend SHALL allow Admin and Inventory Manager to set a product's low-stock threshold via `PATCH /api/v1/inventory/stock/{product_id}/minimum`, from the same dialog as stock adjustment but on a separate tab so the two operations cannot be confused. The value SHALL be a non-negative integer, and the interface SHALL state explicitly that `0` disables the alert. Setting a minimum SHALL NOT require a reason, because it moves no merchandise.

#### Scenario: Threshold set
- **WHEN** a non-negative minimum is submitted and accepted
- **THEN** the displayed minimum updates and a success toast confirms it

#### Scenario: Zero is explained, not guessed
- **WHEN** the minimum field is shown
- **THEN** accompanying text states that `0` disables the low-stock alert

#### Scenario: Minimum is not confusable with quantity
- **WHEN** the dialog is open
- **THEN** setting the minimum and adjusting stock are on separate tabs, and the minimum form has no quantity-delta or reason field

#### Scenario: Negative rejected
- **WHEN** a negative value is entered
- **THEN** submission is blocked with a field-level message

#### Scenario: Backend rejects
- **WHEN** the backend rejects the request
- **THEN** the backend message is shown and the previous minimum remains displayed

### Requirement: Low-stock view
The frontend SHALL offer a low-stock filter on the stock list, driven by the backend's `low_stock_only` parameter. The frontend SHALL NOT compute low-stock status itself under any circumstance. Products without initialised stock SHALL never appear as low stock. When no thresholds are configured, the empty state SHALL explain that no thresholds exist and lead to configuring them, rather than reporting that no products are low.

#### Scenario: Filter delegates to the backend
- **WHEN** the low-stock filter is active
- **THEN** the list is filtered by the backend's `low_stock_only` parameter and no threshold comparison is evaluated in the client

#### Scenario: Uninitialised products never appear
- **WHEN** the low-stock filter is active and some products have no stock record
- **THEN** none of those products are listed

#### Scenario: Empty low-stock list when nothing is configured
- **WHEN** the low-stock filter returns nothing and no product has a threshold above zero
- **THEN** the empty state explains that no thresholds are configured and offers a path to configure them

### Requirement: Stock movement history
The frontend SHALL show stock movement history from `GET /api/v1/inventory/movements`, within the inventory section and reachable from a product's row with that product pre-filtered. Each movement SHALL display the quantity transition from previous to new value, the type, the reason, the acting user's name, and the timestamp. Filters for product, movement type, and date range SHALL be available, with type selectable only from the defined values. Results SHALL be paginated.

#### Scenario: History from a product
- **WHEN** the user opens the history from a product's row
- **THEN** the history opens filtered to that product, newest first

#### Scenario: Quantity transition is legible
- **WHEN** a movement is listed
- **THEN** it shows the previous and resulting quantities as a transition, not only the delta

#### Scenario: Acting user is shown
- **WHEN** a movement is listed
- **THEN** the name of the user who performed it is displayed

#### Scenario: Type filter is a closed list
- **WHEN** the type filter is rendered
- **THEN** only the defined movement types are selectable and no free text is accepted

#### Scenario: Empty history
- **WHEN** no movements match the filters
- **THEN** an empty state explains that no movements match, without implying an error

