# ui-pos

## ADDED Requirements

### Requirement: Scan-first sale screen
The POS screen SHALL keep keyboard focus on a scan input at all times: on page load and after every add, error, or dialog close, focus SHALL return to the scan input. Barcode readers are treated as keyboard input.

#### Scenario: Focus returns after adding an item
- **WHEN** a barcode is scanned and the item is added to the cart
- **THEN** the scan input is cleared and regains focus

### Requirement: Barcode resolves to a product
Submitting a barcode SHALL call `GET /api/v1/products/barcode/{barcode}`. A found active product SHALL be added to the cart at its current price with quantity 1; scanning the same product again SHALL increment its quantity.

#### Scenario: Known product scanned
- **WHEN** a barcode matching an active product is submitted
- **THEN** the product appears in the cart with quantity 1 and its current unit price

#### Scenario: Repeated scan increments quantity
- **WHEN** a barcode already in the cart is scanned again
- **THEN** that line's quantity increments by 1

#### Scenario: Unknown barcode
- **WHEN** a barcode matches no product
- **THEN** an inline error is shown, nothing is added to the cart, and focus returns to the scan input

#### Scenario: Inactive product rejected
- **WHEN** a barcode resolves to an inactive product
- **THEN** the item is rejected with an inline error and never enters the cart

### Requirement: Cart editing
The cart SHALL allow changing a line's quantity and removing a line before confirmation. The running total SHALL be computed with decimal-safe arithmetic (never floating point on price strings) and displayed at all times.

#### Scenario: Remove a line
- **WHEN** the cashier removes a cart line
- **THEN** the line disappears and the total updates

#### Scenario: Decimal-safe total
- **WHEN** the cart contains items with prices like "12.50"
- **THEN** the displayed total is exact to two decimals with no floating-point drift

### Requirement: Single payment method per sale
The cashier SHALL select exactly one payment method (cash or card) before confirming. Confirmation SHALL be blocked while the cart is empty or no method is selected.

#### Scenario: Confirmation blocked without payment method
- **WHEN** the cart has items but no payment method is selected
- **THEN** the confirm action is disabled

### Requirement: Atomic sale confirmation
Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada", clear the cart, and refocus the scan input. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative.

#### Scenario: Successful confirmation
- **WHEN** the cashier confirms a valid sale
- **THEN** a success toast "Venta confirmada" appears, the cart resets, and the scan input regains focus

#### Scenario: Confirmation rejected by backend
- **WHEN** the backend rejects confirmation (e.g. insufficient stock)
- **THEN** the backend error message is shown and the cart remains intact

#### Scenario: Network failure during confirmation
- **WHEN** the confirmation request fails with a network error
- **THEN** the frontend shows a warning that the sale state is unknown, keeps the cart, and instructs the cashier to verify before retrying
