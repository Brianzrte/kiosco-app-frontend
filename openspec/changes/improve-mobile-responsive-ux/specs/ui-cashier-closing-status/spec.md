## MODIFIED Requirements

### Requirement: Admin can review daily reconciliation states
The frontend SHALL provide an Admin-only report of daily reconciliation states,
with one row per Cashier and business day. The report SHALL distinguish a day
with no activity from a day that has sales but no closing, a current open day,
a recorded closing, and a closing that needs updating.

Below the `md` breakpoint, the report SHALL render as one card per Cashier-day instead of a table. Each card SHALL show, at minimum, the Cashier, the business day, the reconciliation state, and the difference between expected and counted cash — state and difference are the two figures most useful for spotting a closing that needs attention, and neither SHALL require horizontal scrolling to see. The report's date-range and Cashier filters SHALL collapse into the shared collapsible filter group.

#### Scenario: Admin reviews a range with mixed states
- **WHEN** an Admin requests a date range containing Cashiers with recorded,
  pending, unclosed and inactive days
- **THEN** the report shows each Cashier-day's state together with its relevant
  sales, expected-cash, counted-cash, difference and latest-closing data

#### Scenario: Admin opens an empty range
- **WHEN** the selected range contains no Cashier-day activity
- **THEN** the report shows an explicit empty state rather than an error

#### Scenario: Non-admin cannot access the report
- **WHEN** a Cashier or Inventory Manager navigates to the report
- **THEN** the frontend gates the route and no report request is issued

#### Scenario: Mobile report renders cards with state and difference
- **WHEN** the report is viewed below the `md` breakpoint
- **THEN** each Cashier-day renders as a card showing at minimum the Cashier, the business day, the reconciliation state, and the cash difference, without a horizontally scrolling table

#### Scenario: Filters are collapsed by default on mobile
- **WHEN** the report is viewed below the `md` breakpoint
- **THEN** the date-range and Cashier filters are reachable inside a collapsed group, not expanded by default
