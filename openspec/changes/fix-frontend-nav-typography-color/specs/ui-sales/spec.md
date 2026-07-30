## MODIFIED Requirements

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
