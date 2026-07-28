# ui-catalog

## Purpose

Listado, detalle, alta, edición y baja de productos; gestión de categorías.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.
## Requirements
### Requirement: Product list
The frontend SHALL show the product list from `GET /api/v1/products` with name, SKU, barcode, category, price, and active status, plus client-side search by name/SKU/barcode and filters by category and active state.

#### Scenario: List renders products
- **WHEN** the product list loads
- **THEN** each product shows name, SKU, barcode (or a dash when null), category, price, and an active/inactive badge

#### Scenario: Filter by category
- **WHEN** a category filter is applied
- **THEN** only products of that category are listed

### Requirement: Create product
The frontend SHALL provide a creation form with name, SKU, optional barcode, category (from `GET /api/v1/categories`), price, and cost, submitting to `POST /api/v1/products`. Prices and costs SHALL be entered and sent as decimal strings.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted
- **THEN** the product is created, a success toast appears, and the list shows the new product as active

#### Scenario: Duplicate SKU or barcode
- **WHEN** the backend rejects the product for a uniqueness violation
- **THEN** the form shows the backend message and preserves the entered values

### Requirement: Edit product
The frontend SHALL allow editing an existing product via `PUT /api/v1/products/{id}` from a detail view at `/products/[id]`.

#### Scenario: Successful edit
- **WHEN** valid changes are saved
- **THEN** the product is updated and the user sees a success toast

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

### Requirement: Category management
The frontend SHALL let Admins list categories from `GET /api/v1/categories` and create them via `POST /api/v1/categories`. Each category SHALL be assigned one of the five pastel colors for its badge, used consistently wherever the category appears.

#### Scenario: Category created
- **WHEN** an Admin submits a new category name
- **THEN** the category appears in the list with a pastel badge

#### Scenario: Non-admin access
- **WHEN** an Inventory Manager or Cashier tries to open `/categories`
- **THEN** access is denied by the role gate

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

