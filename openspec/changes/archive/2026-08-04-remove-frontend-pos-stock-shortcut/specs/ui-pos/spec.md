## MODIFIED Requirements

### Requirement: Atomic sale confirmation

Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative. Each cart line — whether `unitario` or `pesable` — SHALL be sent to `POST /api/v1/sales/{id}/items` with its weight or quantity and, when one was entered, its real price, exactly as composed in the cart.

The success confirmation SHALL offer "Nueva venta" alongside the existing "Ver detalle" link, and no other action. "Nueva venta" SHALL close the confirmation. Neither "Nueva venta" nor the confirmation's appearance itself SHALL move keyboard focus away from the scan input or otherwise block scanning the next barcode; auto-dismiss, dismissal by any other means, and starting the next scan SHALL all continue to close the confirmation.

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
- **WHEN** a sale is confirmed successfully, regardless of the confirming session's access to the inventory screen
- **THEN** the confirmation shows only "Nueva venta" and "Ver detalle", without an action to initialize or navigate to stock

#### Scenario: "Inicializar stock" targets the last line added to the cart
- **WHEN** the confirmed sale had one or more product lines
- **THEN** the confirmation offers no action that targets a product for stock initialization or opens inventory

#### Scenario: Stock shortcut is absent without inventory access
- **WHEN** the confirming session has no access to the inventory screen
- **THEN** the confirmation still shows "Nueva venta" and "Ver detalle" only

#### Scenario: "Ahora no" behaves like the previous "Nueva venta"
- **WHEN** the cashier activates "Nueva venta"
- **THEN** the confirmation closes and the scan input is ready for the next sale

#### Scenario: The confirmation never blocks the next scan
- **WHEN** the confirmation is visible
- **THEN** keyboard focus remains available to the scan input and scanning the next barcode dismisses the confirmation the same way it always has
