# ui-sales Specification

## Purpose
TBD - created by archiving change add-frontend-sales-v15. Update Purpose after archive.
## Requirements
### Requirement: Operational sales list
The frontend SHALL show the operational sales list from `GET /api/v1/sales`. Role `admin` SHALL see every sale and SHALL have a cashier filter; role `inventory` SHALL be redirected away without a request being issued. Role `cashier` access is governed by the own-sales requirement below. The list SHALL default to confirmed sales and SHALL support filtering by status, date range, and cashier, with pagination. Draft and confirmed sales SHALL be visually distinguished by a labelled badge, never by colour alone, and no aggregate total displayed over the list SHALL include drafts.

#### Scenario: Admin lists sales
- **WHEN** an Admin opens the sales section
- **THEN** confirmed sales are listed newest first, paginated

#### Scenario: Drafts are visible and unmistakable
- **WHEN** the status filter includes drafts
- **THEN** each draft is marked with a labelled badge, shows no sale number, and its total is presented distinctly from a closed sale's

#### Scenario: Drafts never inflate totals
- **WHEN** the list displays any aggregate figure and drafts are present
- **THEN** that figure excludes drafts

#### Scenario: Inventory Manager cannot reach the section
- **WHEN** a user with role `inventory` navigates directly to the sales URL
- **THEN** they are redirected away and no request to `/api/v1/sales` is issued

#### Scenario: Date column states its meaning
- **WHEN** drafts and confirmed sales appear together
- **THEN** creation and confirmation dates are shown as separately labelled values rather than a single ambiguous date column

### Requirement: Cashier sees only their own sales, defaulting to today
The frontend SHALL offer the sales list to a user whose access to it comes from role `cashier` and not from role `admin`, restricted to that cashier's own sales, including their own drafts, and restricted to the **current day**. The ownership restriction SHALL be enforced by the backend scoping the response to the authenticated user; the frontend SHALL NOT request an unrestricted list and filter it client-side under any circumstance. For a cashier the cashier filter SHALL be omitted entirely rather than rendered disabled, and the date range control SHALL be omitted as well: the day is fixed to today and displayed as a static label, so the screen never offers a range the backend will silently clip. The screen SHALL also show cards with that cashier's confirmed sales today — count, total billed, cash and card — from `GET /sales/today-summary`; it SHALL never derive those aggregates from the paginated list. A user holding both `cashier` and `admin` SHALL get the Admin view, with the adjustable date range and the cashier filter.

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

### Requirement: Find a sale by number
The frontend SHALL provide an exact-match search by sale number, presented separately from the range filters. Activating it SHALL clear the other filters so an exact lookup cannot be silently narrowed by an unrelated date range. A search matching nothing SHALL render an empty state, not an error.

#### Scenario: Sale found by number
- **WHEN** an Admin searches an existing sale number
- **THEN** that sale is shown

#### Scenario: Search clears competing filters
- **WHEN** an Admin searches by number while a date range is applied
- **THEN** the date range is cleared before the search runs

#### Scenario: No match
- **WHEN** the searched number matches no sale
- **THEN** an empty state explains that no sale has that number

### Requirement: Sale detail view
The frontend SHALL provide a dedicated detail view for a single sale, reached by activating its row in the operational list. The view SHALL show every item (product name, quantity, unit price, subtotal) and every payment (method and amount) from `GET /api/v1/sales/{id}`, plus its status, sale number (or dash), and the relevant date. Access is scoped exactly like the list: an Admin may open any sale; a cashier may open only their own. The detail view SHALL be read-only regarding the sale itself — no control on this screen edits items, quantities, or payments of a confirmed sale.

#### Scenario: Admin opens a sale's detail
- **WHEN** an Admin activates a row in the sales list
- **THEN** the detail view shows that sale's items, payments, status, and number

#### Scenario: Cashier opens their own sale's detail
- **WHEN** a cashier activates a row in their own sales list
- **THEN** the detail view loads normally

#### Scenario: Direct navigation respects the same scope as the list
- **WHEN** a cashier navigates directly to the detail URL of a sale that is not theirs
- **THEN** the backend rejects the request and the frontend shows the resulting error, never a client-side ownership check that only hides the row

#### Scenario: Detail view never mutates the sale
- **WHEN** viewing a confirmed sale's detail
- **THEN** no control on the screen changes its items, quantities, or payments

### Requirement: Sale numbers are optional and non-contiguous
The frontend SHALL treat `sale_number` as optional. A sale without a number SHALL display a dash, never a zero, an empty cell, or an error. The interface SHALL NOT present the numbering as contiguous, and SHALL NOT display any counter implying sales are sequential without gaps. When sorting by number, sales without one SHALL be ordered last in both directions.

#### Scenario: Historic sale without a number
- **WHEN** a sale confirmed before numbering existed is listed
- **THEN** its number column shows a dash

#### Scenario: Gaps are not presented as loss
- **WHEN** the listed sale numbers skip values
- **THEN** no message, counter, or indicator suggests missing or lost sales

#### Scenario: Unnumbered sales sort last
- **WHEN** the list is sorted by sale number in either direction
- **THEN** sales without a number appear at the end

### Requirement: Payment breakdown display
Wherever a single sale's payment is displayed — the sales list's payment-method column, a sale's detail view, and a return's line — the frontend SHALL render the payment breakdown returned by the backend as plain text, with no color coding. A sale with one payment SHALL display that method alone; a sale with two or more SHALL display each method with its amount. Every known payment method — cash, card, and transfer — SHALL have a human-readable label ("Efectivo", "Tarjeta", "Transferencia"); a sale paid by transfer SHALL never show the raw backend value. The frontend SHALL NOT collapse a split payment into an undifferentiated label such as "Mixto", and SHALL NOT read the deprecated single `payment_method` field.

This plain-text-only rule governs any display of an individual sale's payment method. It does NOT extend to Historial de ventas' aggregated day-level summary (`SummaryCards`, shown to both Admin and Cashier). That summary MAY use a distinct, reinforcing color on the icon tile and border of each of its five cards: the POS payment-method colors for "Efectivo", "Tarjeta", and "Transferencia", `pastel-pink` for "Ventas hoy", and `pastel-yellow` for "Total facturado". The card background and its text remain unchanged, and the existing icon and text label always identify the metric without relying on color. This is a named, narrow exception to the plain-text rule above, not a general relaxation of it: every other display of a sale's payment — including any future one — stays plain text unless explicitly named here.

#### Scenario: Single payment
- **WHEN** a sale has one payment
- **THEN** the method is displayed on its own, without amounts

#### Scenario: Split payment shows the composition
- **WHEN** a sale has two or more payments
- **THEN** each method is displayed with its amount

#### Scenario: Transfer payment is labelled, not raw
- **WHEN** a sale includes a payment with method `TRANSFER`
- **THEN** it is displayed as "Transferencia", in plain text with no color, the same treatment as cash and card

#### Scenario: Deprecated field is not consumed
- **WHEN** any sale is rendered
- **THEN** the display derives from the payments collection, never from a single payment-method field

#### Scenario: Historic migrated sale
- **WHEN** a sale confirmed before the payments migration is displayed
- **THEN** it shows its single migrated payment without any error or placeholder

#### Scenario: Per-sale payment stays plain text
- **WHEN** an individual sale's payment method is shown — in the sales list's payment-method column, a sale's detail view, or a return's line
- **THEN** it is rendered in plain text with no color coding, regardless of payment method

#### Scenario: Aggregated day summary uses its five reinforcing accents
- **WHEN** Historial de ventas' aggregated day summary displays its five cards
- **THEN** "Ventas hoy" uses `pastel-pink`, "Total facturado" uses `pastel-yellow`, and the three payment cards use their matching POS payment-method color, each limited to the icon tile and card border alongside the existing icon and text label

#### Scenario: Aggregate totals unaffected by the accent treatment
- **WHEN** the aggregated day summary is displayed with its reinforcing accents applied
- **THEN** the underlying amounts, labels, and their source (the backend-aggregated `by_payment_method` figures) are unchanged from before this requirement was modified

