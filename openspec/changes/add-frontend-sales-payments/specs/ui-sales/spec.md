# ui-sales

## ADDED Requirements

### Requirement: Payment breakdown display
Wherever a sale's payment is displayed, the frontend SHALL render the payment breakdown returned by the backend. A sale with one payment SHALL display that method alone; a sale with two or more SHALL display each method with its amount. The frontend SHALL NOT collapse a split payment into an undifferentiated label such as "Mixto", and SHALL NOT read the deprecated single `payment_method` field.

#### Scenario: Single payment
- **WHEN** a sale has one payment
- **THEN** the method is displayed on its own, without amounts

#### Scenario: Split payment shows the composition
- **WHEN** a sale has two or more payments
- **THEN** each method is displayed with its amount

#### Scenario: Deprecated field is not consumed
- **WHEN** any sale is rendered
- **THEN** the display derives from the payments collection, never from a single payment-method field

#### Scenario: Historic migrated sale
- **WHEN** a sale confirmed before the payments migration is displayed
- **THEN** it shows its single migrated payment without any error or placeholder
