# ui-catalog

## ADDED Requirements

### Requirement: Rename category
The frontend SHALL allow an Admin to rename a category via `PUT /api/v1/categories/{id}`, editing the name in place within the category list rather than on a separate screen. `Enter` SHALL confirm and `Escape` SHALL cancel, restoring the previous name. The category's pastel badge colour SHALL be derived from its identifier, so a rename never changes its colour.

#### Scenario: Category renamed
- **WHEN** an Admin confirms a new unique name
- **THEN** the category is updated, a success toast appears, and its badge colour is unchanged

#### Scenario: Duplicate name
- **WHEN** the backend rejects the rename with `409`
- **THEN** the backend message is shown beneath the field, the row stays in edit mode with the typed text, and focus remains in the field

#### Scenario: Rename to the same name
- **WHEN** an Admin saves without altering the name
- **THEN** the operation succeeds and the row leaves edit mode with no error

#### Scenario: Cancelling restores the previous name
- **WHEN** an Admin presses `Escape` while editing
- **THEN** the previous name is restored and no request is issued

#### Scenario: Colour survives a rename
- **WHEN** a category is renamed
- **THEN** its badge colour is identical before and after, everywhere the category appears

## MODIFIED Requirements

### Requirement: Deactivate product
The frontend SHALL offer deactivation (no hard delete) via `POST /api/v1/products/{id}/deactivate` to Admin and Inventory Manager, guarded by a confirmation dialog styled with the Error color. Reactivation via `POST /api/v1/products/{id}/activate` SHALL be offered to Admin only; for any other role the action SHALL be absent from the interface rather than shown disabled. This asymmetry is deliberate: withdrawing a product from sale is a reversible operational act, while returning it to sale reverses an administrative decision.

#### Scenario: Deactivation confirmed
- **WHEN** the user confirms deactivation in the dialog
- **THEN** the product becomes inactive and shows an inactive badge in the list

#### Scenario: Inventory Manager cannot reactivate
- **WHEN** an Inventory Manager views an inactive product
- **THEN** the inactive badge is visible and no reactivation control is rendered anywhere on the screen

#### Scenario: Admin reactivates
- **WHEN** an Admin reactivates an inactive product
- **THEN** the product becomes sellable again and a success toast confirms it

#### Scenario: Reactivation rejected by role
- **WHEN** a reactivation request is nonetheless rejected with `403`
- **THEN** the user is told they lack permission, the session is not cleared, and they are not redirected to login
