# ui-sales

## ADDED Requirements

### Requirement: Payment breakdown display
Wherever a sale's payment is displayed, the frontend SHALL render the payment breakdown returned by the backend. A sale with one payment SHALL display that method alone; a sale with two or more SHALL display each method with its amount. Every known payment method — cash, card, and transfer — SHALL have a human-readable label ("Efectivo", "Tarjeta", "Transferencia"); a sale paid by transfer SHALL never show the raw backend value. The frontend SHALL NOT collapse a split payment into an undifferentiated label such as "Mixto", and SHALL NOT read the deprecated single `payment_method` field. This display SHALL remain plain text, with no color coding — the dedicated payment-method color is scoped to the POS payment selector only (see `ui-pos`, requirement "Payment composition").

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
