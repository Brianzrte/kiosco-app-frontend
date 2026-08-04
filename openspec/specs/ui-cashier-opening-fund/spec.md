# ui-cashier-opening-fund Specification

## Purpose
TBD - created by archiving change add-frontend-cashier-opening-fund. Update Purpose after archive.
## Requirements
### Requirement: Admin declares an opening fund for an operator
The frontend SHALL let an Admin declare an opening fund from
`/reports/cash-closings` for an active user with role `admin` or `cashier`,
including the authenticated Admin. The selector SHALL call that person an
“operador”; the transport body SHALL retain the backend field `cashier_id`.
The amount SHALL be a non-negative decimal string with up to two decimals.

#### Scenario: Admin declares a fund
- **WHEN** an Admin selects an eligible operator, business date and amount
- **THEN** the frontend submits the declaration once, shows success on `201` or
  `200`, and reloads the reconciliation report

#### Scenario: Confirmed fund rejects a replacement
- **WHEN** the backend responds `409` because the selected fund is confirmed
- **THEN** the form keeps its entered values, shows the backend message inline
  and does not treat the fund as saved

### Requirement: Operator confirms own pending opening fund without blocking work
The frontend SHALL show an authenticated Admin or Cashier only their own
`declared` current opening fund in a non-modal app-shell banner. It SHALL
state the amount and offer “Confirmar conteo”, without an editable amount.
Confirmation SHALL start the backend shift and SHALL never block the POS.

#### Scenario: Pending fund is confirmed
- **WHEN** an operator activates “Confirmar conteo”
- **THEN** the frontend persists confirmation, removes the banner after a
  successful response, and keeps the rest of the app usable throughout

#### Scenario: Current fund is absent or cannot load
- **WHEN** the session-scoped current-fund response is `null` or errors
- **THEN** no banner is shown and the operator can continue using the POS

### Requirement: Daily report presents the nullable opening-fund summary
The daily reconciliation report SHALL render a backend-provided opening-fund
summary separately from closing reconciliation, using text as well as tone.

#### Scenario: Report row includes a fund
- **WHEN** a daily-status row includes a declared or confirmed opening fund
- **THEN** the row shows its amount and state separately from reconciliation

#### Scenario: Report row has no fund
- **WHEN** a daily-status row has `opening_fund = null`
- **THEN** no opening-fund indicator is shown and no row is fabricated
