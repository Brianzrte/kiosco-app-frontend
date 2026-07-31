## MODIFIED Requirements

### Requirement: Barcode resolves to a product
Submitting a barcode SHALL call `GET /api/v1/products/barcode/{barcode}`. A found active product with `unit_type` `unitario` SHALL be added to the cart at its current price with quantity 1; scanning the same product again SHALL increment its quantity. A found active product with `unit_type` `pesable` SHALL NOT be added to the cart automatically: instead its weight-entry line SHALL be opened (or, if already present in the cart, its weight input SHALL receive focus) so the cashier can enter the weighed amount; nothing is added until a weight greater than zero is entered.

#### Scenario: Known product scanned
- **WHEN** a barcode matching an active `unitario` product is submitted
- **THEN** the product appears in the cart with quantity 1 and its current unit price

#### Scenario: Repeated scan increments quantity
- **WHEN** a barcode already in the cart for a `unitario` product is scanned again
- **THEN** that line's quantity increments by 1

#### Scenario: Unknown barcode
- **WHEN** a barcode matches no product
- **THEN** an inline error is shown, nothing is added to the cart, and focus returns to the scan input

#### Scenario: Inactive product rejected
- **WHEN** a barcode resolves to an inactive product
- **THEN** the item is rejected with an inline error and never enters the cart

#### Scenario: Weighable product scanned
- **WHEN** a barcode resolves to an active product with `unit_type` `pesable`
- **THEN** no line is added automatically; a weight-entry control for that product opens or receives focus, and nothing enters the cart until a weight greater than zero is entered

#### Scenario: Weighable product scanned again
- **WHEN** a `pesable` product already present in the cart is scanned again
- **THEN** its existing weight input receives focus for a new entry, rather than incrementing any value or adding a second line for the same product

#### Scenario: Weighable product without a per-kilogram price is rejected
- **WHEN** a barcode resolves to an active `pesable` product that has no valid `price_per_kg`
- **THEN** the item is rejected with an inline error, the same way an inactive product is rejected today, and never enters the cart

### Requirement: Cart editing
The cart SHALL allow changing a line's quantity (for `unitario` products) or weight (for `pesable` products, in kilograms with up to 3 decimals) and removing a line before confirmation. Each line's effective price SHALL be its edited real price when one was entered, or its calculated price otherwise (`unit_price × quantity` for `unitario`; `peso × price_per_kg` rounded to 2 decimals for `pesable`). The running total SHALL be the decimal-safe sum of every line's effective price (never floating point on price strings) and SHALL be displayed at all times.

#### Scenario: Remove a line
- **WHEN** the cashier removes a cart line
- **THEN** the line disappears and the total updates

#### Scenario: Decimal-safe total
- **WHEN** the cart contains items with prices like "12.50"
- **THEN** the displayed total is exact to two decimals with no floating-point drift

#### Scenario: Weighable line shows a calculated price and a way to correct it
- **WHEN** a `pesable` line has a weight greater than zero entered
- **THEN** the cart shows the calculated price (`peso × price_per_kg`, rounded to 2 decimals) next to a control to edit the real price charged

#### Scenario: Real price replaces the calculated price for the line
- **WHEN** the cashier enters a real price for a line, before the sale is confirmed
- **THEN** that amount becomes the line's effective price for the running total and the balance of payments, and the calculated price is no longer shown in the cart (it remains available afterwards in the sale's detail view)

#### Scenario: Real price editing is unavailable after confirmation
- **WHEN** a sale has already been confirmed
- **THEN** no control on the POS or elsewhere allows editing any line's real or calculated price for that sale

#### Scenario: Weight validation happens before any request
- **WHEN** an entered weight is negative, non-numeric, or has more than 3 decimals
- **THEN** an inline error is shown in the weight control itself and no request is sent to the backend

#### Scenario: Zero or empty weight never creates a line
- **WHEN** a `pesable` product's weight field is empty or `0`
- **THEN** no line for that product exists in the cart

### Requirement: Atomic sale confirmation
Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative. Each cart line — whether `unitario` or `pesable` — SHALL be sent to `POST /api/v1/sales/{id}/items` with its weight or quantity and, when one was entered, its real price, exactly as composed in the cart.

#### Scenario: Successful confirmation
- **WHEN** the cashier confirms a valid sale
- **THEN** the confirmation shows "Venta confirmada" with the sale number, the cart resets, and the scan input regains focus

#### Scenario: Number survives long enough to be used
- **WHEN** the sale number is displayed after confirmation
- **THEN** the sale number remains visible until the next sale starts and can be selected with the pointer

#### Scenario: Next sale can start immediately
- **WHEN** the sale number is displayed after confirmation
- **THEN** the scan input already holds focus and the next barcode is accepted without any pointer or keyboard action

#### Scenario: Confirmation without a number
- **WHEN** the confirmed sale has no `sale_number`
- **THEN** the confirmation is shown without a number and without any placeholder or error

#### Scenario: Backend rejects unbalanced payments
- **WHEN** the backend rejects confirmation because payments do not sum to the total
- **THEN** the backend message is shown, the payment composition is reopened, and the entered amounts are preserved

#### Scenario: Confirmation rejected by backend
- **WHEN** the backend rejects confirmation (e.g. insufficient stock)
- **THEN** the backend error message is shown and the cart remains intact

#### Scenario: Network failure during confirmation
- **WHEN** the confirmation request fails with a network error
- **THEN** the frontend shows a warning that the sale state is unknown, keeps the cart, and instructs the cashier to verify before retrying

#### Scenario: Weighable line reaches the backend with its weight and real price
- **WHEN** a sale containing a `pesable` line with an edited real price is confirmed
- **THEN** the request for that line carries its weight and its real price, and the effective price used in the frontend total matches what was sent

## ADDED Requirements

### Requirement: Weighable products are not checked against stock
The POS SHALL NOT query or cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`, unlike a `unitario` product. Adding or increasing a `pesable` line's weight SHALL never be blocked by a client-side stock check.

#### Scenario: Weighable product is added without a stock check
- **WHEN** a `pesable` product is added to the cart or its weight is edited
- **THEN** no request to `GET /api/v1/inventory/stock/{product_id}` is issued for that product, and no stock-limit message is shown for it

#### Scenario: Mixed cart still checks stock for unit-based lines
- **WHEN** a cart contains both `unitario` and `pesable` products
- **THEN** stock is checked and enforced only for the `unitario` lines, exactly as it is today
