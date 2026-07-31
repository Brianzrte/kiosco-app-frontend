## MODIFIED Requirements

### Requirement: Daily sales summary cards
The frontend SHALL show, on the operational sales screen (`/sales`), summary cards for the current day: count of confirmed sales, total revenue, total paid in cash, total paid by card, and total paid by transfer. The figures SHALL come from a backend aggregation endpoint; the frontend SHALL NOT compute them by summing a paginated list of individual sales client-side. This requirement is restricted to role `admin`, matching the rest of `/sales`.

Below the `md` breakpoint, the five cards SHALL be presented in a horizontally scrollable carousel with scroll-snap, so they do not stack and consume excessive vertical space before the sales list is reachable. From `md` up, the existing layout SHALL remain unchanged.

#### Scenario: Admin sees today's summary
- **WHEN** an Admin opens `/sales`
- **THEN** cards show today's confirmed sale count, total revenue, total cash, total card, and total transfer, sourced from the backend aggregation endpoint

#### Scenario: No confirmed sales today
- **WHEN** there are zero confirmed sales for the current day
- **THEN** the cards show zero values, not an error or an empty-state replacing the whole screen

#### Scenario: No sales by transfer in range
- **WHEN** there are confirmed sales for the current day but none paid by transfer
- **THEN** the transfer card shows zero, not a missing card or an error

#### Scenario: Aggregation is never computed client-side
- **WHEN** the summary cards are requested
- **THEN** the frontend issues a single request to the backend's aggregation endpoint and renders its totals directly, without fetching individual sales to sum them

#### Scenario: Cards scroll horizontally on mobile
- **WHEN** the summary cards are viewed below the `md` breakpoint
- **THEN** the five cards are laid out in a horizontally scrollable, scroll-snapping row instead of stacking vertically

#### Scenario: Desktop and tablet layout is unchanged
- **WHEN** the summary cards are viewed at or above the `md` breakpoint
- **THEN** their existing layout is unchanged by this requirement

## REMOVED Requirements

### Requirement: Cash closing tool

**Reason**: product decision to drop this admin-only, read-only cash-closing tool from `/sales` entirely, without relocating or preserving its functionality elsewhere. It is unrelated to, and not a substitute for, the cashier's real shift-closing flow (`ui-cashier-shift-closing`), which is unaffected by this removal.

**Migration**: none. The "Cierre de caja" button and the panel it opened (breakdown of confirmed sale count, total revenue, cash, card, and transfer over an operator-selected date range) are removed from `/sales` with no replacement screen, report, or control offered in their place.
