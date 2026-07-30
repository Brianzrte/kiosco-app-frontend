## ADDED Requirements

### Requirement: Operational POS visual composition

The POS SHALL use the shared ERP/POS visual language without inserting a
dashboard, greeting or decorative summary before the scan-first task. At
desktop width it SHALL keep scanning/product selection as the main region and
cart, running total, payment balance and confirmation as a persistently visible
checkout region. At mobile width the regions MAY stack, but the scan input and
running total SHALL remain reachable without mouse use.

#### Scenario: Cashier begins immediately
- **WHEN** a cashier opens the POS
- **THEN** the scan input remains the first operational control and has focus,
  without requiring dismissal or navigation through a visual dashboard

#### Scenario: Checkout remains orienting at desktop width
- **WHEN** the cart contains items at desktop width
- **THEN** the cashier can read the running total and reach payment/confirmation
  while products or scan input remain available in the main region

#### Scenario: Responsive POS keeps critical information
- **WHEN** the POS is viewed at mobile width
- **THEN** its regions reflow without horizontal page scrolling and the scanner,
  cart total and confirmation path remain keyboard-operable
