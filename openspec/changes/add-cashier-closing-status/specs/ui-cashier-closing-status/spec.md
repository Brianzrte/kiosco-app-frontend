## ADDED Requirements

### Requirement: Cashier sees the current reconciliation state
The frontend SHALL show a visible, textual reconciliation state for the
authenticated Cashier's current business day in the app shell. The state SHALL
be sourced from a backend aggregate scoped to that Cashier and SHALL NOT block
sales or calculate coverage from client-side sales data.

#### Scenario: Cashier begins a day without a closing
- **WHEN** a Cashier has activity on the current business day and no closing
  covers the current reconciliation point
- **THEN** the app shell shows "Caja en curso" and keeps the POS usable

#### Scenario: Cashier registers a closing with no later sales
- **WHEN** the latest closing covers the Cashier's confirmed sales through its
  recorded cutoff
- **THEN** the app shell shows "Cierre registrado" with the recorded closing
  time

#### Scenario: Sale follows a registered closing
- **WHEN** the Cashier confirms a sale after the latest closing cutoff
- **THEN** the app shell shows "Pendiente de actualizar" and the Cashier can
  register another closing without being prevented from selling

#### Scenario: State cannot be loaded
- **WHEN** the reconciliation-state request fails
- **THEN** the app shell communicates that the state could not be updated,
  surfaces the backend message where available, and does not block the POS

### Requirement: Reconciliation state remains accessible and responsive
The cashier reconciliation indicator SHALL be operable by keyboard, SHALL
communicate its status without relying only on color, and SHALL remain usable
at mobile widths.

#### Scenario: Cashier uses the indicator by keyboard
- **WHEN** a Cashier reaches the indicator with the keyboard and activates it
- **THEN** the associated closing action or detail opens and focus returns to
  the indicator when that interaction closes

#### Scenario: Narrow viewport
- **WHEN** the app shell is rendered on a mobile-width viewport
- **THEN** the indicator retains an accessible status name and does not cause
  horizontal overflow

### Requirement: Admin can review daily reconciliation states
The frontend SHALL provide an Admin-only report of daily reconciliation states,
with one row per Cashier and business day. The report SHALL distinguish a day
with no activity from a day that has sales but no closing, a current open day,
a recorded closing, and a closing that needs updating.

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
