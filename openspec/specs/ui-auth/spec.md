# ui-auth

## Purpose

Flujo de login/logout, almacenamiento de sesión, manejo de expiración y resolución de rol.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.

## Requirements

### Requirement: Login with username and password
The frontend SHALL provide a login page at `/login` that submits username and password to `POST /api/v1/auth/login` and, on success, stores the session token, expiry, and role, then redirects the user to their role's home screen.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the frontend stores `{ token, expires_at, role }` and redirects to the role's default screen (Cashier → POS, Inventory Manager → products, Admin → POS)

#### Scenario: Invalid credentials
- **WHEN** the backend responds with an authentication error
- **THEN** the login page shows the backend error message and does not store any session data

#### Scenario: Submit disabled while pending
- **WHEN** a login request is in flight
- **THEN** the submit button is disabled until the response arrives

### Requirement: Authenticated requests carry the session token
The frontend SHALL send `Authorization: Bearer <token>` on every API request after login. The token SHALL NOT be exposed to client-side JavaScript if an httpOnly-cookie bridge is feasible; otherwise the chosen storage tradeoff SHALL be documented in the design.

#### Scenario: API call after login
- **WHEN** any authenticated screen requests data
- **THEN** the request includes the `Authorization: Bearer` header with the current session token

### Requirement: Session expiry handling
The frontend SHALL treat any `401` response as an expired or invalid session: it SHALL clear local session state and redirect to `/login`.

#### Scenario: Expired session on any request
- **WHEN** an API request returns `401`
- **THEN** session state is cleared and the user is redirected to `/login`

### Requirement: Logout
The frontend SHALL provide a logout action that calls `POST /api/v1/auth/logout`, clears local session state regardless of the response, and redirects to `/login`.

#### Scenario: Successful logout
- **WHEN** the user activates logout
- **THEN** the backend session is invalidated, local state is cleared, and the user lands on `/login`

#### Scenario: Logout with network failure
- **WHEN** the logout request fails
- **THEN** local session state is still cleared and the user is redirected to `/login`

### Requirement: Unauthenticated access redirects to login
The frontend SHALL redirect any unauthenticated access to a protected route to `/login`.

#### Scenario: Direct visit without session
- **WHEN** a visitor without a session opens `/products`
- **THEN** they are redirected to `/login` and no API data is requested
