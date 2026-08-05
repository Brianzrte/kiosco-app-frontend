## MODIFIED Requirements

### Requirement: Atomic sale confirmation
Confirming SHALL send the cart's items and the composed payment to a single backend operation that creates the sale, registers its items and payment, and confirms it within one transaction; no separate `POST /api/v1/sales`, `POST /api/v1/sales/{id}/items`, or `PUT /api/v1/sales/{id}/payment` call SHALL be made as an independent, individually-failable step of confirmation. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success and SHALL NOT assume any partial record (sale, item, or payment) was created on the backend: the cart is preserved, and a retry SHALL be a self-contained new attempt of the same single operation, not a continuation of a previously retained sale id. Each cart line — whether `unitario` or `pesable` — SHALL be included in that single operation with its weight or quantity and, when one was entered, its real price, exactly as composed in the cart.

#### Scenario: Successful confirmation
- **WHEN** the cashier confirms a valid sale
- **THEN** the confirmation shows "Venta confirmada" with the sale number, the cart resets, and the scan input regains focus

#### Scenario: A failed confirmation leaves no partial record to retry against
- **WHEN** confirming a sale fails for any reason
- **THEN** the frontend does not retain any sale id from the failed attempt, and a retry sends the same single operation again as a fresh attempt

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
- **THEN** the backend error message is shown, the cart remains intact, and no partial sale, item, or payment record is left behind for the cashier or an operator to clean up

#### Scenario: Network failure during confirmation
- **WHEN** the confirmation request fails with a network error
- **THEN** the frontend shows a warning that the sale state is unknown, keeps the cart, and instructs the cashier to verify before retrying

#### Scenario: Weighable line reaches the backend with its weight and real price
- **WHEN** a sale containing a `pesable` line with an edited real price is confirmed
- **THEN** the single confirmation operation carries that line's weight and its real price, and the effective price used in the frontend total matches what was sent

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
