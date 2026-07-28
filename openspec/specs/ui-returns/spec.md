# ui-returns Specification

## Purpose
TBD - created by archiving change add-frontend-sales-returns. Update Purpose after archive.
## Requirements
### Requirement: Register a partial return from a sale
The frontend SHALL allow registering a return via `POST /api/v1/sales/{id}/returns`, reached only from a confirmed sale's detail and never from a standalone section. Every item of the sale SHALL be listed with quantity sold, quantity already returned, and quantity still available; items with nothing available SHALL remain visible and marked as fully returned rather than hidden. Quantity controls SHALL be bounded by the available quantity reported by the backend, and the frontend SHALL NOT derive that limit through any rule of its own. Role `admin` SHALL reach this action on any confirmed sale. Role `cashier` SHALL reach this action only on sales they confirmed themselves; whether it is additionally restricted to the same calendar day is decided and enforced by the backend, never recomputed or pre-filtered by the frontend. Role `inventory` SHALL never see this action.

#### Scenario: Availability shown before choosing
- **WHEN** the return form opens for a sale
- **THEN** each item shows quantity sold, already returned, and available

#### Scenario: Fully returned items stay visible
- **WHEN** an item has no remaining available quantity
- **THEN** it is listed with zero available and marked as already returned

#### Scenario: Quantity cannot exceed availability
- **WHEN** the user adjusts a return quantity
- **THEN** it cannot be raised above the available quantity reported by the backend

#### Scenario: Concurrent return invalidates the form
- **WHEN** the backend rejects the return because another return consumed the available quantity
- **THEN** the backend message is shown and the available quantities are reloaded

#### Scenario: Inventory Manager cannot register returns
- **WHEN** an inventory manager views a confirmed sale
- **THEN** no return action is rendered, and requesting the endpoint directly is not offered by the interface

#### Scenario: Cashier reaches the action on their own sale
- **WHEN** a cashier opens the detail of a confirmed sale they registered
- **THEN** the return action is rendered, identical in form and wording to the one Admin sees

#### Scenario: Cashier never sees the action on a sale that is not theirs
- **WHEN** a cashier opens the detail of a confirmed sale confirmed by a different cashier
- **THEN** the return action is not rendered — ownership is already known from the sale's own data, so this is not a business rule the frontend invents

#### Scenario: Cashier is rejected on a sale outside the backend's allowed window
- **WHEN** a cashier attempts to register a return on their own sale and the backend determines it falls outside the allowed window (e.g. a previous day)
- **THEN** the backend's rejection is shown as-is; the frontend does not pre-compute or enforce that time window on its own

### Requirement: Return requires a stated reason
The frontend SHALL require a non-empty reason, validated after trimming whitespace, and SHALL explain that the reason becomes part of the permanent record of the return and of the resulting stock movements. Submission SHALL be blocked while the reason is empty.

#### Scenario: Empty reason blocks submission
- **WHEN** the user attempts to submit with an empty or whitespace-only reason
- **THEN** submission is blocked and the field shows a required-field message

#### Scenario: Purpose of the reason is stated
- **WHEN** the reason field is displayed
- **THEN** accompanying text explains that it is recorded permanently with the return and its stock movements

### Requirement: Returns never claim to refund money
The frontend SHALL present the monetary figure of a return as the value of the returned merchandise, and SHALL state explicitly at the point of confirmation that the system does not execute or reconcile any refund. The frontend SHALL NOT label the amount as an amount to be refunded, nor use any wording implying the money has been returned.

#### Scenario: Amount is labelled as value returned
- **WHEN** the return total is displayed
- **THEN** it is labelled as the value of the returned merchandise, not as an amount refunded or to refund

#### Scenario: Confirmation states the boundary
- **WHEN** the confirmation dialog is shown
- **THEN** it states that the system records the return and restores stock, and that handing the money back is done at the counter

### Requirement: Returns are irreversible and say so
The frontend SHALL state, before the return is confirmed, that a registered return cannot be undone from the application and that the only correction available is a manual stock adjustment which does not remove the record. No undo affordance SHALL be offered after a successful return, and no wording SHALL suggest the return can be edited or cancelled later.

#### Scenario: Irreversibility stated before confirming
- **WHEN** the confirmation dialog is shown
- **THEN** it states that the return cannot be undone from the application

#### Scenario: No undo after success
- **WHEN** a return is registered successfully
- **THEN** the success feedback offers no undo or edit control

#### Scenario: Cancelling changes nothing
- **WHEN** the user dismisses the confirmation dialog
- **THEN** no request is issued and no stock is affected

### Requirement: Return history of a sale
The frontend SHALL show a sale's returns from `GET /api/v1/sales/{id}/returns` within the sale detail, listing for each return its date, the acting user, the reason, the returned items with quantities, and the value returned. The original sale SHALL continue to display its own items and total unchanged.

#### Scenario: History shown in the sale
- **WHEN** a confirmed sale with returns is opened
- **THEN** its returns are listed with date, user, reason, items, and value

#### Scenario: Original sale is untouched
- **WHEN** a sale has returns registered against it
- **THEN** its own items, total, and status are displayed exactly as confirmed

#### Scenario: Sale without returns
- **WHEN** a confirmed sale has no returns
- **THEN** the section states there are no returns, without implying an error

