# ui-inventory

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Stock view per product
The frontend SHALL show current stock from the inventory endpoints, displaying quantity, minimum quantity, and last update. Low-stock status SHALL be taken from the backend and SHALL NOT be derived in the client. The list SHALL visually distinguish three states — not initialised, initialised at zero, and below minimum — using text, never colour alone. Pagination SHALL use the backend's `page` parameter.

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
