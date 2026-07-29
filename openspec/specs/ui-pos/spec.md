# ui-pos

## Purpose

Registro de venta: input de escaneo, carrito, método de pago, confirmación y manejo de fallos.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.
## Requirements
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
Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative.

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

### Requirement: Cart feedback on scan
When an item is added to the cart or an existing line's quantity is incremented, the affected line SHALL be highlighted in place for `--motion-base` and the running total SHALL be visually acknowledged. The line SHALL NOT slide, enter from offscreen, or otherwise displace surrounding rows, and the total SHALL NOT animate as a progressive numeric count. The feedback SHALL NOT alter scan focus behaviour or delay readiness for the next scan.

#### Scenario: Added line is acknowledged in place
- **WHEN** a scanned product is added to the cart
- **THEN** its row is briefly highlighted without moving, and no other row shifts position

#### Scenario: Rapid consecutive scans stay legible
- **WHEN** several barcodes are scanned in rapid succession
- **THEN** each addition is acknowledged without rows displacing each other, and the list remains readable throughout

#### Scenario: Feedback does not gate the next scan
- **WHEN** the highlight animation is still running
- **THEN** the scan input already holds focus and accepts the next barcode

#### Scenario: Colour is not the only confirmation
- **WHEN** a repeated scan increments an existing line
- **THEN** the displayed quantity changes value, independently of the highlight

#### Scenario: Reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the line still receives a brief colour acknowledgement and nothing translates or scales

### Requirement: Payment balance is resolved before confirming
The frontend SHALL continuously display the difference between the composed payments and the sale total, distinguishing short, over, and exact states, and SHALL disable confirmation until the payments equal the total exactly. When the cart changes after payments were composed, the difference SHALL be recomputed and surfaced at the moment of the change rather than at confirmation. A single-method payment SHALL be re-imputed to the new total automatically; a split payment SHALL require the cashier to resolve the difference.

#### Scenario: Short payment blocks confirmation
- **WHEN** the composed payments sum to less than the total
- **THEN** the shortfall is displayed and the confirm action is disabled

#### Scenario: Exact payment enables confirmation
- **WHEN** the composed payments equal the total exactly
- **THEN** the balance reads as settled and confirmation is enabled

#### Scenario: Adding an item after paying, single method
- **WHEN** an item is added after a single-method payment was composed
- **THEN** that payment is re-imputed to the new total without cashier intervention

#### Scenario: Adding an item after paying, split payment
- **WHEN** an item is added after a split payment was composed
- **THEN** the resulting difference is shown immediately and confirmation is disabled until the cashier resolves it

### Requirement: Change is displayed, never persisted
The frontend MAY accept a locally entered cash-tendered amount solely to display the change owed. That amount SHALL NOT be sent to the backend and SHALL NOT alter the amount imputed to any payment method.

#### Scenario: Change shown
- **WHEN** the cashier enters an amount tendered greater than the cash payment
- **THEN** the change owed is displayed

#### Scenario: Tendered amount never reaches the backend
- **WHEN** the sale is confirmed after entering a tendered amount
- **THEN** the payment sent for that method is the imputed amount, not the tendered amount

