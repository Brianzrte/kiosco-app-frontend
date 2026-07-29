# ui-pos

## MODIFIED Requirements

### Requirement: Single payment method per sale
The cashier SHALL compose one or more payments for a sale, each with a method (cash, card, or transfer) and an amount, submitted as the complete list to `PUT /api/v1/sales/{id}/payment`. Choosing a single method SHALL remain a single action that imputes the full sale total to that method, requiring no amount entry; splitting SHALL be an optional secondary action that is discoverable from the payment area when cash or card is selected. Transfer SHALL only be selectable as a single, whole-total method: the split-payment action SHALL NOT be offered while transfer is the selected method, and transfer SHALL NOT be offered as one of the two methods to split between. When amounts are split, the cashier SHALL enter one amount and the remaining amount SHALL be derived by decimal subtraction from the total — never by division, proportional split, or any operation that can round. All monetary arithmetic SHALL use decimal-safe helpers and SHALL NOT use floating point. Transfer SHALL be visually distinguished in the payment method selector by a dedicated color, using the same non-color cues (border, selected-radio state) as cash and card so color is never the only channel that communicates the selection.

#### Scenario: Single method stays one action
- **WHEN** the cashier selects cash, card, or transfer without splitting
- **THEN** one payment for the full total is composed and no amount entry is required

#### Scenario: Confirmation blocked without payment method
- **WHEN** the cart has items but no payment method is selected
- **THEN** the confirm action is disabled

#### Scenario: Transfer selection is visually distinct
- **WHEN** the cashier selects transfer
- **THEN** the button is highlighted with its dedicated color, following the same border-plus-background pattern already used for cash and card

#### Scenario: Splitting never offers transfer
- **WHEN** the cashier selects transfer as the payment method
- **THEN** the split-payment action is not offered; splitting remains available only when cash or card is selected, and offers only those two methods to split between

#### Scenario: Split derives the remainder by subtraction
- **WHEN** the cashier enters an amount for one method in a split payment
- **THEN** the other amount is computed as total minus that amount, exactly, with no rounding

#### Scenario: Awkward totals never lose a cent
- **WHEN** a sale total that does not divide evenly is split between two methods
- **THEN** the composed payments sum exactly to the total and confirmation is not rejected for a rounding difference

#### Scenario: Splitting is discoverable
- **WHEN** the payment area is displayed
- **THEN** the option to split the payment is visible without opening a menu

## ADDED Requirements

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

## MODIFIED Requirements

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
