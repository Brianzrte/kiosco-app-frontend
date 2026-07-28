# ui-foundation

## MODIFIED Requirements

### Requirement: Role-gated navigation shell
The frontend SHALL render a navigation shell that shows only the sections permitted for the authenticated user's role (Cashier: POS and their own sales; Inventory Manager: products, stock, movements; Admin: everything including categories, users, and the full sales list).

#### Scenario: Cashier sees only sales navigation
- **WHEN** a user with role `cashier` is authenticated
- **THEN** the navigation shows the POS section and the sales section, and does not show products, inventory, categories, users, or reports

#### Scenario: Direct navigation to a forbidden route
- **WHEN** a cashier navigates directly to `/products` by URL
- **THEN** the frontend redirects them away from the page and no product data is requested

#### Scenario: Inventory Manager has no sales section
- **WHEN** a user with role `inventory` is authenticated
- **THEN** the navigation does not show the sales section, and navigating to it directly redirects them away without requesting sales data

#### Scenario: Users section is Admin-only
- **WHEN** a user with role `inventory` is authenticated
- **THEN** the navigation does not show the users section, and navigating to it directly redirects them away without requesting user data
