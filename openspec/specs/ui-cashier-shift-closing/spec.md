# ui-cashier-shift-closing Specification

## Purpose
TBD - created by archiving change add-frontend-cashier-shift-closing. Update Purpose after archive.
## Requirements
### Requirement: Cash closing entry point for cashiers
The frontend SHALL provide a "Cerrar caja" entry point visible only to role `cashier`, reachable from the app shell (`Nav.tsx`) regardless of which screen the cashier is on.

#### Scenario: Cashier sees the entry point
- **WHEN** a user with role `cashier` is logged in
- **THEN** a "Cerrar caja" action is visible in the navigation shell

#### Scenario: Other roles never see it
- **WHEN** a user with role `admin` or `inventory` is logged in
- **THEN** no "Cerrar caja" action is shown

### Requirement: Shift closing modal shows backend-computed expected cash
Opening the "Cerrar caja" action SHALL open a modal that fetches the expected cash total for the current cashier's shift from a backend aggregation endpoint scoped to the authenticated cashier. The frontend SHALL NOT compute this total by summing a paginated list of individual sales client-side.

#### Scenario: Modal loads expected cash
- **WHEN** the cashier opens the "Cerrar caja" modal
- **THEN** it shows the day's expected cash total, sourced from a single backend request

#### Scenario: No confirmed cash sales in the shift
- **WHEN** the cashier has zero confirmed cash sales for the shift
- **THEN** the modal shows an expected cash of zero, not an error

### Requirement: Counted cash input and computed difference
The modal SHALL let the cashier enter the physically counted cash amount and SHALL display the difference against the expected cash (counted − expected), computed after the expected total is loaded.

#### Scenario: Difference shown
- **WHEN** the cashier enters a counted cash amount
- **THEN** the modal shows the difference against the expected cash, positive or negative

### Requirement: Explicit confirmation before saving
The modal SHALL require an explicit confirmation step before persisting the closing — matching the confirm-dialog pattern used elsewhere in the app (e.g. product deactivation). The action button SHALL disable while the request is pending and SHALL never allow a second concurrent submission.

#### Scenario: Cashier confirms
- **WHEN** the cashier reviews the counted amount and difference and confirms
- **THEN** the frontend issues the persist request and shows a success toast on completion

#### Scenario: Save fails
- **WHEN** the persist request fails
- **THEN** the modal shows the backend's error message and the closing is not treated as saved

### Requirement: Closing never blocks sales
The cash closing action SHALL have no effect on the POS or on the cashier's ability to keep registering sales — there is no shift/session concept in the domain that this action opens or closes.

#### Scenario: POS remains usable after closing
- **WHEN** a cashier confirms a cash closing
- **THEN** they can immediately continue registering new sales in the POS without restriction
