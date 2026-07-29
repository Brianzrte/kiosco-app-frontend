# ui-auth

## MODIFIED Requirements

### Requirement: Login with username and password
The frontend SHALL provide a login page at `/login` that submits username and password to `POST /api/v1/auth/login` and, on success, stores the session token, expiry, and the user's **set of roles**, then redirects the user to the home screen of the highest-priority role they hold, in the fixed order admin, cashier, receiving, inventory. The session SHALL persist `roles` as a set; a single-role response SHALL be stored as a one-element set so nothing downstream reasons about a scalar role.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the frontend stores `{ token, expires_at, roles }` and redirects to the home screen of their highest-priority role (Admin → POS, Cashier → POS, Receiving → receiving, Inventory Manager → products)

#### Scenario: Multi-role login
- **WHEN** a user holding `cashier` and `receiving` logs in
- **THEN** both roles are stored in the session and the navigation reflects the union of both

#### Scenario: Invalid credentials
- **WHEN** the backend responds with an authentication error
- **THEN** the login page shows the backend error message and does not store any session data

#### Scenario: Submit disabled while pending
- **WHEN** a login request is in flight
- **THEN** the submit button is disabled until the response arrives
