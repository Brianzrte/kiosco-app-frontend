# ui-cashier-shift-closing Specification

## Purpose
TBD - created by archiving change add-frontend-cashier-shift-closing. Update Purpose after archive.
## Requirements
### Requirement: Cash closing entry point for cashiers
The frontend SHALL provide a "Cerrar caja" entry point visible to roles
`cashier` and `admin`, reachable from the app shell regardless of which screen
the operator is on. Roles without either operator role SHALL not see it.

#### Scenario: Cashier sees the entry point
- **WHEN** a user with role `cashier` is logged in
- **THEN** a "Cerrar caja" action is visible in the navigation shell

#### Scenario: Admin sees the entry point
- **WHEN** a user with role `admin` is logged in
- **THEN** a "Cerrar caja" action is visible in the navigation shell

#### Scenario: Other roles never see it
- **WHEN** a user without role `cashier` or `admin` is logged in
- **THEN** no "Cerrar caja" action is shown

### Requirement: Shift closing modal shows backend-computed expected cash
Opening the "Cerrar caja" action SHALL open a modal for the authenticated
operator's active shift. The frontend SHALL submit no client-selected start
boundary and SHALL show the backend-derived interval and expected cash after a
successful closing; it SHALL NOT compute this total from individual sales.

#### Scenario: Modal loads expected cash
- **WHEN** the operator opens the "Cerrar caja" modal
- **THEN** it loads their backend-scoped reconciliation state and uses the
  backend closing response for expected cash

#### Scenario: No confirmed cash sales in the shift
- **WHEN** the operator has an active shift with zero confirmed cash sales
- **THEN** the backend-derived expected cash includes only its confirmed
  opening fund and the modal does not show an error

### Requirement: Counted cash input and computed difference
The modal SHALL let the operator enter the physically counted cash amount and
SHALL display the backend-computed difference against expected cash after the
closing response. It SHALL show the confirmed opening fund as a separate
reference and SHALL state that it is already included in expected cash.

#### Scenario: Difference shown
- **WHEN** the operator confirms a counted cash amount
- **THEN** the modal shows the backend-derived difference, positive or negative

### Requirement: Explicit confirmation before saving
The modal SHALL require an explicit confirmation step before persisting the
closing. The action button SHALL disable while the request is pending and SHALL
never allow a second concurrent submission.

#### Scenario: Cashier confirms
- **WHEN** the operator reviews the counted amount and confirms
- **THEN** the frontend issues the persist request and shows a success toast on completion

#### Scenario: Save fails
- **WHEN** the persist request fails
- **THEN** the modal shows the backend's error message and the closing is not treated as saved

### Requirement: Closing never blocks sales
The cash closing action SHALL have no effect on the POS or on an operator's
ability to keep registering sales.

#### Scenario: POS remains usable after closing
- **WHEN** an operator confirms a cash closing
- **THEN** they can immediately continue registering new sales in the POS without restriction

### Requirement: Provisional closing can be corrected by its owner
The frontend SHALL allow the operator to submit a correction only for a
backend-reported `provisional` closing. A `sealed` closing SHALL be read-only.

#### Scenario: Sealed closing cannot be corrected
- **WHEN** a closing is reported as sealed or correction returns `409`
- **THEN** no editable correction action remains and the backend message is
  shown where the request was attempted
