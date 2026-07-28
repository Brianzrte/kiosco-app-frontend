## ADDED Requirements

### Requirement: Supplier purchasing performance report
The frontend SHALL provide an Admin-only purchase report by supplier and date range using a backend aggregate, presenting investment, purchase-order count, complete and incomplete deliveries, and undelivered products. It SHALL render returned monetary values through `formatMoney()` and SHALL never derive these metrics by regrouping paginated purchase orders in the browser.

#### Scenario: Supplier performance for a range
- **WHEN** an Admin selects a date range and optional supplier filter
- **THEN** the report displays the backend-returned investment, order count, delivery-completion figures and undelivered products for that selection

#### Scenario: No purchases in range
- **WHEN** the selected range has no purchases
- **THEN** an empty state explains that there are no purchases for the period and offers clearing the active filters

#### Scenario: Aggregate request fails
- **WHEN** the supplier performance request fails
- **THEN** the backend message and retry action are shown and no partial metric is displayed

#### Scenario: Non-admin is blocked
- **WHEN** a user without Admin role reaches the supplier report route
- **THEN** the frontend redirects away before requesting report data
