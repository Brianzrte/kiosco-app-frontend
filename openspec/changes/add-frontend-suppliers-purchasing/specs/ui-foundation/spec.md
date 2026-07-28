## ADDED Requirements

### Requirement: Supplier and purchasing navigation
The frontend SHALL declare supplier and purchase-order sections in the role-gated navigation for Admin and Inventory, and SHALL not expose those sections to a Cashier or to a user holding only `receiving`. It SHALL preserve the receiving section's restricted scope from `ui-receiving`.

#### Scenario: Admin sees purchasing management
- **WHEN** an Admin opens navigation
- **THEN** supplier and purchase-order management sections are available

#### Scenario: Inventory sees purchasing management
- **WHEN** an Inventory user opens navigation
- **THEN** supplier and purchase-order management sections are available

#### Scenario: Receiving-only user is not offered management
- **WHEN** a user holding only `receiving` opens navigation
- **THEN** supplier creation and purchase-order creation sections are not shown

#### Scenario: Forbidden direct route
- **WHEN** a Cashier or receiving-only user navigates directly to a supplier or purchasing-management route
- **THEN** the frontend redirects away before requesting protected management data
