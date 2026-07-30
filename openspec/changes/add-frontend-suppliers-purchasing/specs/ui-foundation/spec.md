## ADDED Requirements

### Requirement: Unified purchasing and receiving navigation
The frontend SHALL declare one canonical `Compras y recepción` navigation section at `/purchasing` for Admin, Inventory and Receiving. It SHALL replace separate supplier and receiving entries. The hub SHALL show pending purchase orders to every authorized role and render management actions only when the user holds Admin or Inventory; Receiving-only users SHALL retain history and reception access but SHALL not be offered supplier or purchase-order creation.

#### Scenario: Admin sees the unified section and management actions
- **WHEN** an Admin opens navigation
- **THEN** one Compras y recepción section is available and its hub offers creation, history and supplier-management actions

#### Scenario: Inventory sees the unified section and management actions
- **WHEN** an Inventory user opens navigation
- **THEN** one Compras y recepción section is available and its hub offers creation, history and supplier-management actions

#### Scenario: Receiving-only user is not offered management
- **WHEN** a user holding only `receiving` opens navigation
- **THEN** Compras y recepción is available with pending orders and history, while supplier creation and purchase-order creation controls are not rendered

#### Scenario: Forbidden management route
- **WHEN** a Cashier or receiving-only user navigates directly to `/purchasing/new` or `/purchasing/suppliers`
- **THEN** the frontend redirects away before requesting protected management data

#### Scenario: Legacy entry redirects to the canonical section
- **WHEN** an authorized user opens `/receiving` or `/suppliers`
- **THEN** `/receiving` redirects to `/purchasing` and `/suppliers` redirects to `/purchasing/suppliers`, without rendering a duplicate operational surface
