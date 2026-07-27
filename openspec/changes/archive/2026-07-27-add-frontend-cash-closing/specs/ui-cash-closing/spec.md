# ui-cash-closing

> Bloqueado por backend. Ninguna de las siguientes requirements se implementa hasta que el endpoint pedido en `backend-request.md` exista y esté desplegado. Ver `design.md` para la investigación que confirma la ausencia.

## ADDED Requirements

### Requirement: Daily sales summary cards
The frontend SHALL show, on the operational sales screen (`/sales`), summary cards for the current day: count of confirmed sales, total revenue, total paid in cash, and total paid by card. The figures SHALL come from a backend aggregation endpoint; the frontend SHALL NOT compute them by summing a paginated list of individual sales client-side. This requirement is restricted to role `admin`, matching the rest of `/sales`.

#### Scenario: Admin sees today's summary
- **WHEN** an Admin opens `/sales`
- **THEN** four cards show today's confirmed sale count, total revenue, total cash, and total card, sourced from the backend aggregation endpoint

#### Scenario: No confirmed sales today
- **WHEN** there are zero confirmed sales for the current day
- **THEN** the cards show zero values, not an error or an empty-state replacing the whole screen

#### Scenario: Aggregation is never computed client-side
- **WHEN** the summary cards are requested
- **THEN** the frontend issues a single request to the backend's aggregation endpoint and renders its totals directly, without fetching individual sales to sum them

### Requirement: Cash closing tool
The frontend SHALL provide a cash-closing view that shows the same breakdown as the summary cards (confirmed sale count, total revenue, total cash, total card) over an operator-selected date range, defaulting to the current day. It SHALL be reachable from `/sales` and restricted to role `admin`.

#### Scenario: Admin closes the day's register
- **WHEN** an Admin opens the cash-closing tool with the default range
- **THEN** it shows today's totals broken down by payment method

#### Scenario: Admin selects a different range
- **WHEN** an Admin changes the date range
- **THEN** the breakdown updates to match the newly selected range, sourced from the same backend aggregation endpoint

#### Scenario: Tool never blocks selling
- **WHEN** the cash-closing tool is open or in use
- **THEN** it has no effect on the POS or on any cashier's ability to register sales — there is no "close the register" action that locks anything, because no such concept exists in the backend domain
