# ui-foundation

## MODIFIED Requirements

### Requirement: Role-gated navigation shell
The frontend SHALL render a navigation shell that shows only the sections permitted for the authenticated user's **roles**, where a user holds one or more roles and the visible sections are the **union** of what each role permits. Gating SHALL be evaluated as an intersection between the session's roles and the roles a section or route declares, never as equality against a single role. Sections by role: Cashier — POS and their own sales; Inventory Manager — products, stock, movements; Receiving — stock loading and the receiving section, without catalog write access; Admin — everything, including categories, users and reports. Role gating remains UX only; the backend enforces.

#### Scenario: Cashier sees only sales navigation
- **WHEN** a user whose only role is `cashier` is authenticated
- **THEN** the navigation shows the POS section and does not show products, inventory, receiving, categories, or reports

#### Scenario: Direct navigation to a forbidden route
- **WHEN** a cashier navigates directly to `/products` by URL
- **THEN** the frontend redirects them away from the page and no product data is requested

#### Scenario: Inventory Manager has no sales section
- **WHEN** a user whose only role is `inventory` is authenticated
- **THEN** the navigation does not show the sales section, and navigating to it directly redirects them away without requesting sales data

#### Scenario: Users section is Admin-only
- **WHEN** a user whose only role is `inventory` is authenticated
- **THEN** the navigation does not show the users section, and navigating to it directly redirects them away without requesting user data

#### Scenario: Union of two roles
- **WHEN** a user holds `cashier` and `receiving`
- **THEN** the navigation shows the POS section, their sales, the receiving section and stock loading, and still does not show categories, users or reports

#### Scenario: Receiving role has no catalog access
- **WHEN** a user whose only role is `receiving` navigates directly to `/products`
- **THEN** they are redirected away and no product data is requested

#### Scenario: Landing screen for a multi-role user
- **WHEN** a user with several roles logs in
- **THEN** they land on the home screen of the highest-priority role they hold, in the fixed order admin, cashier, receiving, inventory
