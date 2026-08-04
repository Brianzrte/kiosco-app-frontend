## ADDED Requirements

### Requirement: Shared localized money input
The frontend SHALL provide a shared UI-kit control for monetary amounts. It
SHALL display an Argentine money representation with `$`, `.` thousands and
`,` decimals while exposing the existing dot-decimal string to its consumer.

#### Scenario: Integer amount is entered
- **WHEN** an operator enters `20000` in a monetary field
- **THEN** the field presents `$ 20.000,00` and the form value is `"20000.00"`

#### Scenario: Decimal amount is entered
- **WHEN** an operator enters `20000.5`, `20000,5` or pastes `20.000,50`
- **THEN** the field presents `$ 20.000,50` and the form value is `"20000.50"`

#### Scenario: Invalid or empty value
- **WHEN** the monetary field is empty or its value cannot be normalized
- **THEN** it preserves the form's validation behavior and does not send a
  localized or fabricated amount to the backend

### Requirement: Money formatting is limited to monetary fields
The frontend SHALL use the shared monetary control for amount, price and cost
fields, and SHALL NOT apply it to weight, quantity, percentage or other decimal
inputs with different units.

#### Scenario: Weight input remains unit-based
- **WHEN** an operator edits a product weight
- **THEN** the input remains a weight field without currency symbol or money
  thousands formatting
