# ui-pos

## MODIFIED Requirements

### Requirement: Atomic sale confirmation
Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number`, presented with high typographic prominence, selectable as text, and persisting until the next sale begins — not only in a transient toast. Displaying the number SHALL NOT move keyboard focus away from the scan input. When the confirmed sale carries no number, the confirmation SHALL simply omit it. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative.

#### Scenario: Successful confirmation
- **WHEN** the cashier confirms a valid sale
- **THEN** the confirmation shows "Venta confirmada" with the sale number, the cart resets, and the scan input regains focus

#### Scenario: Number survives long enough to be used
- **WHEN** a sale is confirmed
- **THEN** the sale number remains visible until the next sale starts and can be selected with the pointer

#### Scenario: Next sale can start immediately
- **WHEN** the sale number is displayed after confirmation
- **THEN** the scan input already holds focus and the next barcode is accepted without any pointer or keyboard action

#### Scenario: Confirmation without a number
- **WHEN** the confirmed sale has no `sale_number`
- **THEN** the confirmation is shown without a number and without any placeholder or error

#### Scenario: Confirmation rejected by backend
- **WHEN** the backend rejects confirmation (e.g. insufficient stock)
- **THEN** the backend error message is shown and the cart remains intact

#### Scenario: Network failure during confirmation
- **WHEN** the confirmation request fails with a network error
- **THEN** the frontend shows a warning that the sale state is unknown, keeps the cart, and instructs the cashier to verify before retrying
