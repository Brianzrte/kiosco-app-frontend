## MODIFIED Requirements

### Requirement: Operational sales list
The frontend SHALL show the operational sales list from `GET /api/v1/sales`. Role `admin` SHALL see every sale and SHALL have a cashier filter; role `inventory` SHALL be redirected away without a request being issued. Role `cashier` access is governed by the own-sales requirement below. The list SHALL default to confirmed sales and SHALL support filtering by status, date range, and cashier, with pagination. Draft and confirmed sales SHALL be visually distinguished by a labelled badge, never by colour alone, and no aggregate total displayed over the list SHALL include drafts. The number of rows requested per page SHALL adjust to the viewport actually available (both the desktop table and the mobile card list) instead of a fixed count, clamped to a minimum and maximum row count, so that a standard desktop or tablet viewport does not force page-level scroll to see the list; the frontend SHALL recompute this count and return to the first page whenever the viewport is resized in a way that changes how many rows fit.

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

#### Scenario: Page size fits the viewport instead of overflowing it
- **WHEN** the sales list is rendered on a standard desktop viewport
- **THEN** the number of rows requested for that page is sized to what fits below the filters without forcing the page to scroll vertically, within a fixed minimum and maximum row count

#### Scenario: Resize recomputes the page size
- **WHEN** the browser window is resized (including a viewport change that crosses the breakpoint between the desktop table and the mobile card layout) while the sales list is mounted
- **THEN** the frontend recomputes how many rows fit for whichever layout is now visible and returns the list to its first page

### Requirement: Payment breakdown display
Wherever a single sale's payment is displayed — a sale's detail view and a return's line — the frontend SHALL render the payment breakdown returned by the backend as plain text, with no color coding. A sale with one payment SHALL display that method alone; a sale with two or more SHALL display each method with its amount. Every known payment method — cash, card, and transfer — SHALL have a human-readable label ("Efectivo", "Tarjeta", "Transferencia"); a sale paid by transfer SHALL never show the raw backend value. The frontend SHALL NOT collapse a split payment into an undifferentiated label such as "Mixto", and SHALL NOT read the deprecated single `payment_method` field.

This plain-text-only rule governs any display of an individual sale's payment method except for two named, narrow carve-outs, neither of which generalizes the rule for any other or any future display of a sale's payment: Historial de ventas' aggregated day-level summary (`SummaryCards`, shown to both Admin and Cashier), and the sales list's payment-method column.

`SummaryCards` MAY use a distinct, reinforcing color on the icon tile and border of each of its five cards: the POS payment-method colors for "Efectivo", "Tarjeta", and "Transferencia", `pastel-pink` for "Ventas hoy", and `pastel-yellow` for "Total facturado". The card background and its text remain unchanged, and the existing icon and text label always identify the metric without relying on color.

The sales list's payment-method column SHALL render each sale's payment method(s) as a solid-fill, labelled badge using the same POS payment-method colors ("Efectivo", "Tarjeta", "Transferencia"), with the method's label always present as text inside the badge — color SHALL NOT be the only channel. A sale with one payment SHALL show a single badge. A sale with two payments (a split) SHALL show both badges, one per payment, in the same order the payments arrive from the backend, with no reordering and no amount shown next to either badge. A sale with no recorded payment (an unconfirmed draft) SHALL show a dash, matching the existing empty-cell convention used elsewhere in the same list. This is the second named, narrow exception to the plain-text rule above; the detail view and a return's line are unaffected and keep the plain-text treatment.

#### Scenario: Single payment
- **WHEN** a sale has one payment
- **THEN** the method is displayed on its own, without amounts

#### Scenario: Split payment shows the composition
- **WHEN** a sale has two or more payments
- **THEN** each method is displayed with its amount

#### Scenario: Transfer payment is labelled, not raw
- **WHEN** a sale includes a payment with method `TRANSFER`
- **THEN** it is displayed as "Transferencia", the same treatment as cash and card

#### Scenario: Deprecated field is not consumed
- **WHEN** any sale is rendered
- **THEN** the display derives from the payments collection, never from a single payment-method field

#### Scenario: Historic migrated sale
- **WHEN** a sale confirmed before the payments migration is displayed
- **THEN** it shows its single migrated payment without any error or placeholder

#### Scenario: Per-sale payment stays plain text outside the list column
- **WHEN** an individual sale's payment method is shown in a sale's detail view or a return's line
- **THEN** it is rendered in plain text with no color coding, regardless of payment method

#### Scenario: Aggregated day summary uses its five reinforcing accents
- **WHEN** Historial de ventas' aggregated day summary displays its five cards
- **THEN** "Ventas hoy" uses `pastel-pink`, "Total facturado" uses `pastel-yellow`, and the three payment cards use their matching POS payment-method color, each limited to the icon tile and card border alongside the existing icon and text label

#### Scenario: Aggregate totals unaffected by the accent treatment
- **WHEN** the aggregated day summary is displayed with its reinforcing accents applied
- **THEN** the underlying amounts, labels, and their source (the backend-aggregated `by_payment_method` figures) are unchanged from before this requirement was modified

#### Scenario: List shows a single payment as one badge
- **WHEN** a sale in the sales list has exactly one payment
- **THEN** its payment-method column shows one solid-fill badge with that method's label, in its matching color, and no amount

#### Scenario: List shows a split payment as two badges in arrival order
- **WHEN** a sale in the sales list has two payments
- **THEN** its payment-method column shows both badges, one per payment, in the same order as `payments` arrives from the backend, each with its own color and label, and neither showing an amount

#### Scenario: List shows a dash for a sale with no payment
- **WHEN** a sale in the sales list has no recorded payment (an unconfirmed draft)
- **THEN** its payment-method column shows a dash, not an empty cell or an error

#### Scenario: List badges are never color-only
- **WHEN** any payment-method badge is rendered in the sales list
- **THEN** the method's label text is always present inside the badge, regardless of color
