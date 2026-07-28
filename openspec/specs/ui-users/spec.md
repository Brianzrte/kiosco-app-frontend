# ui-users Specification

## Purpose
TBD - created by archiving change add-frontend-users. Update Purpose after archive.
## Requirements
### Requirement: User list restricted to Admin
The frontend SHALL show the user list from `GET /api/v1/users` displaying username, role, status, and creation date, ordered so active users are readable at a glance. The section SHALL be reachable only by users with role `admin`; any other role SHALL be redirected away and no user data SHALL be requested. Status SHALL be conveyed by a labelled badge, never by colour alone.

#### Scenario: Admin views the list
- **WHEN** an Admin opens the users section
- **THEN** every user is listed with username, role, status, and creation date

#### Scenario: Non-Admin cannot reach the section
- **WHEN** a user with role `cashier` or `inventory` navigates directly to the users URL
- **THEN** they are redirected away and no request to `/api/v1/users` is issued

#### Scenario: Inactive users are de-emphasised but legible
- **WHEN** the list contains inactive users
- **THEN** they are shown with a labelled inactive badge and reduced text emphasis, and remain readable

#### Scenario: Load failure
- **WHEN** the request fails
- **THEN** an error state explains what happened and offers a retry control

### Requirement: Create user
The frontend SHALL create users via `POST /api/v1/users` with username, password, and role. Role SHALL be chosen from exactly three mutually exclusive options (`cashier`, `inventory`, `admin`), each labelled in Spanish and accompanied by a one-line description of what it permits. The password SHALL be entered once, masked by default, with a control to reveal it. Submission SHALL be disabled while pending.

#### Scenario: User created
- **WHEN** a valid username, password, and role are submitted and accepted
- **THEN** the user appears in the list and a success toast confirms the creation

#### Scenario: Duplicate username
- **WHEN** the backend rejects the username with `409`
- **THEN** the backend message is shown beneath the username field, focus moves to that field, and the other entered values are preserved

#### Scenario: Password can be revealed before submitting
- **WHEN** the Admin activates the reveal control
- **THEN** the typed password becomes readable, and it is masked again by default

#### Scenario: Role is never free text
- **WHEN** the creation form is rendered
- **THEN** role is selectable only from the three defined options and cannot be typed

### Requirement: Deactivate user with irreversibility stated
The frontend SHALL deactivate a user via `PATCH /api/v1/users/{id}/deactivate` only after an explicit confirmation dialog that names the affected user and states that the action cannot be undone from the application. The frontend SHALL NOT offer an undo affordance for this action. When the target is the currently authenticated user, the dialog SHALL additionally warn that access will be lost immediately; the action SHALL still be permitted.

#### Scenario: Confirmation names the consequence
- **WHEN** the Admin triggers deactivation of another user
- **THEN** a dialog names that user and states the action cannot be undone from the application

#### Scenario: Cancelling changes nothing
- **WHEN** the Admin dismisses the confirmation dialog
- **THEN** no request is issued and the user remains active

#### Scenario: Self-deactivation is warned but allowed
- **WHEN** the Admin targets their own account
- **THEN** the dialog additionally warns that access will be lost immediately, and confirming proceeds with the request

#### Scenario: No undo is offered
- **WHEN** a deactivation succeeds
- **THEN** the confirmation feedback offers no undo control

#### Scenario: Backend rejects deactivation
- **WHEN** the backend responds with an error
- **THEN** the backend message is shown and the list still reflects the user as active
