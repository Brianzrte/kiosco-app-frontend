## MODIFIED Requirements

### Requirement: Cashier sees only their own sales, defaulting to today

The frontend SHALL offer the sales list to a user whose access to it comes from role `cashier` and not from role `admin`, restricted to that cashier's own sales, including their own drafts, and restricted to the **current day**. The ownership restriction SHALL be enforced by the backend scoping the response to the authenticated user; the frontend SHALL NOT request an unrestricted list and filter it client-side under any circumstance. For a cashier the cashier filter SHALL be omitted entirely rather than rendered disabled, and the date range control SHALL be omitted as well: the day is fixed to today and displayed as a static label, so the screen never offers a range the backend will silently clip. The screen SHALL also show cards with that cashier's confirmed sales today — count, total billed, cash and card — from `GET /sales/today-summary`; it SHALL never derive those aggregates from the paginated list. A user holding both `cashier` and `admin` SHALL get the Admin view, with the adjustable date range and the cashier filter. While the sales section stays mounted and visible, the cards SHALL re-fetch `GET /sales/today-summary` on a fixed interval so a sale or return registered elsewhere (including from another device) becomes reflected without the cashier navigating away or reloading; a background refresh that fails SHALL be ignored, keeping the last successfully loaded figures on screen, rather than replacing them with the error state used for the initial load.

#### Scenario: Cashier sees their own sales
- **WHEN** a cashier opens the sales section
- **THEN** only sales they registered are listed, including their own drafts

#### Scenario: Cashier's list defaults to today
- **WHEN** a cashier opens the sales section without changing filters
- **THEN** the current day is shown as a static label and no date range control is rendered

#### Scenario: Cashier can still look further back
- **WHEN** a cashier would try to widen the date range
- **THEN** no date range control is available and only the current business day's own sales remain listed

#### Scenario: Cashier's list is fixed to today
- **WHEN** a cashier opens the sales section
- **THEN** the current day is shown as a static label and no date range control is rendered

#### Scenario: Scope is never enforced in the client
- **WHEN** the cashier-facing list is requested
- **THEN** the frontend does not receive other cashiers' sales and performs no client-side ownership filtering

#### Scenario: Cashier filter is absent, not disabled
- **WHEN** a cashier views the list
- **THEN** no cashier filter control is rendered

#### Scenario: Cashier finds their unfinished sale
- **WHEN** a cashier filters their list by draft status
- **THEN** their own unconfirmed sales from today are listed, newest first

#### Scenario: Cashier sees their sales cards
- **WHEN** a cashier opens the sales section
- **THEN** the cards show only their confirmed sales for the current business day, including count, total billed, cash and card

#### Scenario: Cashier summary is unavailable
- **WHEN** the today-summary request fails
- **THEN** the screen shows the backend `message` with a retry action and does not render partial aggregates

#### Scenario: Day rolls over during a shift
- **WHEN** the cashier reloads the list after midnight
- **THEN** the label shows the new day and the previous day's sales are no longer listed

#### Scenario: Admin who is also a cashier
- **WHEN** a user holding `admin` and `cashier` opens the sales section
- **THEN** the Admin view is rendered, with the adjustable date range and the cashier filter

#### Scenario: Cards pick up a change registered elsewhere without navigating
- **WHEN** the cashier's sales section stays open and another sale or a return affecting today's figures is registered by someone else from another device
- **THEN** within one refresh interval the cards' figures update to reflect the current `GET /sales/today-summary` response, without the cashier reloading or navigating away

#### Scenario: Background refresh failure keeps the last good figures
- **WHEN** a periodic refresh of `GET /sales/today-summary` fails while the cards already show data from a previous successful load
- **THEN** the cards keep showing the previously loaded figures, no error replaces them, and the next interval tick retries

#### Scenario: Background refresh does not repeat the initial loading state
- **WHEN** a periodic refresh tick starts while the cards already show data
- **THEN** no loading skeleton or blank state is shown for that tick; the previous figures remain visible until the new ones (if the request succeeds) replace them

## ADDED Requirements

### Requirement: Returned sales are identifiable in the sales history

The sales history SHALL display a labelled pill reading "Con devoluciones" for
each sale whose backend-provided `has_returns` is `true`. The pill SHALL
appear in both the mobile card list and desktop table, and its text SHALL
identify the condition without relying on colour alone. The frontend SHALL use
the existing sales-list response and SHALL NOT issue one return-history request
per row.

#### Scenario: Returned sale is identifiable without extra requests

- **WHEN** the sales history renders a confirmed sale that has been updated by
  a return
- **THEN** its mobile card and desktop row show the "Con devoluciones" pill,
  and the list performs no per-row request to discover it

### Requirement: Sale detail shows the backend net value after a return

When an authorized return is registered, the frontend SHALL keep showing the
immutable return history while treating the total and payment amounts returned
by `GET /api/v1/sales/{id}` as the current net value of the confirmed sale. It
SHALL NOT subtract return-history amounts from that backend total in the
client. While the detail stays mounted and visible, it SHALL re-fetch both the
sale and its return history on a fixed interval, keeping the last successful
detail/history on a background failure. The detail SHALL expose the sale's
`updated_at` as an audit timestamp when it differs from the original
confirmation state, without replacing the return's own recorded date, reason,
actor, or item details.

#### Scenario: Partial return updates the displayed invoice total
- **WHEN** an authorized user registers a partial return and later reads the
  sale detail
- **THEN** the displayed total and payment amounts match the backend net sale,
  the return remains visible with its original detail, and no second client
  subtraction occurs

#### Scenario: Return remains traceable after the sale mutation
- **WHEN** a confirmed sale has one or more returns
- **THEN** the detail shows each immutable return's reason, actor, creation
  date, and returned items, alongside the sale's backend-provided update
  timestamp

#### Scenario: External return appears without navigation
- **WHEN** another authorized user registers a return while a sale detail is
  open
- **THEN** the existing return history and its locally derived net total update
  within one refresh interval without resetting the detail's visible state

### Requirement: Return records the refunded payment distribution

Before registering a return, the frontend SHALL collect one or more refunded
payment amounts using the existing payment methods. Their decimal-string sum
SHALL exactly equal the selected merchandise value, and the frontend SHALL
send that distribution with the existing reason and item selections. It SHALL
show a field-level error and avoid the request when the distribution is empty,
invalid, or does not equal the return value; backend validation remains the
authority for per-method limits and concurrency.

#### Scenario: Mixed-payment return is recorded consistently
- **WHEN** an authorized user returns merchandise from a sale paid with more
  than one method
- **THEN** the user can specify the refunded amount for each method, the total
  equals the selected returned merchandise value, and the request records that
  distribution
