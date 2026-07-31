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

### Requirement: Single payment method per sale
The cashier SHALL select exactly one payment method (cash or card) before confirming. Confirmation SHALL be blocked while the cart is empty or no method is selected.

#### Scenario: Confirmation blocked without payment method
- **WHEN** the cart has items but no payment method is selected
- **THEN** the confirm action is disabled

### Requirement: Atomic sale confirmation

Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative. Each cart line — whether `unitario` or `pesable` — SHALL be sent to `POST /api/v1/sales/{id}/items` with its weight or quantity and, when one was entered, its real price, exactly as composed in the cart.

The success confirmation SHALL offer two actions, "Inicializar stock" and "Ahora no" (replacing the previous "Nueva venta" action with the same close behavior), alongside the existing "Ver detalle" link. "Inicializar stock" SHALL be present only when the current session also has access to the inventory screen; it SHALL navigate to the inventory screen with the product of the last cart line added before confirmation preselected and its stock dialog already open. "Ahora no" SHALL close the confirmation with the same effect the previous "Nueva venta" action had. Neither action, nor the confirmation's appearance itself, SHALL move keyboard focus away from the scan input or otherwise block scanning the next barcode; auto-dismiss, dismissal by any other means, and starting the next scan SHALL all continue to close the confirmation exactly as before this requirement changed.

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

#### Scenario: Confirmation offers a stock shortcut for the sold product
- **WHEN** a sale is confirmed successfully and the session has access to the
  inventory screen
- **THEN** the confirmation shows "Inicializar stock" alongside "Ahora no"
  and "Ver detalle"

#### Scenario: "Inicializar stock" targets the last line added to the cart
- **WHEN** the confirmed sale had more than one distinct product and the
  cashier activates "Inicializar stock"
- **THEN** the frontend navigates to the inventory screen with the product
  of the last cart line added before confirmation preselected and its stock
  dialog already open

#### Scenario: Stock shortcut is absent without inventory access
- **WHEN** the confirming session has no access to the inventory screen
- **THEN** the confirmation shows "Ahora no" and "Ver detalle" without
  "Inicializar stock"

#### Scenario: "Ahora no" behaves like the previous "Nueva venta"
- **WHEN** the cashier activates "Ahora no"
- **THEN** the confirmation closes and the scan input is ready for the next
  sale, exactly as "Nueva venta" behaved before this requirement changed

#### Scenario: The confirmation never blocks the next scan
- **WHEN** the confirmation is visible, with or without "Inicializar stock"
  present
- **THEN** keyboard focus remains available to the scan input and scanning
  the next barcode dismisses the confirmation the same way it always has

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

### Requirement: Payment-method selector has method-specific visual feedback
The POS payment-method selector SHALL preserve its existing radio-button selection behavior while showing Efectivo, Tarjeta, and Transferencia with the selector's original secondary text and border treatment in their unselected resting state. When an unselected option is hovered, its full surface SHALL use a low-opacity version of the method-specific light accent and its outer border SHALL use the full-strength accent while text and icon retain the secondary treatment. When selected, an option SHALL use that method's light accent for its background and border, with black icon and text. The keyboard focus indicator SHALL remain visually distinct from hover and selected states, and text and icon SHALL continue to identify the payment method without color alone.

#### Scenario: Resting payment options identify their method
- **WHEN** the POS shows the three payment options before one is selected
- **THEN** each option displays its original secondary text and border treatment alongside its visible label and icon

#### Scenario: Hover mirrors the summary-card accent format
- **WHEN** a pointer hovers an unselected payment option
- **THEN** its full surface uses a soft version of the corresponding accent and the option border uses the full-strength accent without changing the radio selection

#### Scenario: Keyboard focus remains distinct
- **WHEN** a payment option receives keyboard focus
- **THEN** its visible focus indicator remains present and distinguishable from both hover and selected states

#### Scenario: Selected option inverts to its pastel treatment
- **WHEN** the cashier selects a payment option
- **THEN** that option displays its method-specific light accent as background and border while its text and icon remain black

#### Scenario: Payment method is understandable without color
- **WHEN** payment-option colors are unavailable or viewed in grayscale
- **THEN** the visible text label and icon continue to identify Efectivo, Tarjeta, and Transferencia

### Requirement: Weighable products are not checked against stock
The POS SHALL NOT query or cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`, unlike a `unitario` product. Adding or increasing a `pesable` line's weight SHALL never be blocked by a client-side stock check.

#### Scenario: Weighable product is added without a stock check
- **WHEN** a `pesable` product is added to the cart or its weight is edited
- **THEN** no request to `GET /api/v1/inventory/stock/{product_id}` is issued for that product, and no stock-limit message is shown for it

#### Scenario: Mixed cart still checks stock for unit-based lines
- **WHEN** a cart contains both `unitario` and `pesable` products
- **THEN** stock is checked and enforced only for the `unitario` lines, exactly as it is today

