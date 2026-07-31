## ADDED Requirements

### Requirement: Purchasing hub prioritizes pending orders
The frontend SHALL provide `/purchasing` as the shared operational hub for Admin, Inventory and Receiving. At desktop width it SHALL divide the main content vertically into a pending-order region occupying four fifths of the available width and an action panel occupying one fifth; below the desktop breakpoint it SHALL stack pending orders before actions. The pending region SHALL request only `PENDING` purchase orders, support backend filters by supplier and date range, and link each order to its detail.

#### Scenario: Pending orders dominate the hub
- **WHEN** an authorized user opens `/purchasing` at desktop width
- **THEN** pending orders occupy the dominant four-fifths region and the action panel occupies the remaining fifth

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** pending orders appear before the action panel and no page-level horizontal overflow is required

#### Scenario: Pending-order filters
- **WHEN** the user changes supplier or date filters in the pending-order region
- **THEN** the frontend sends the supported query values with `status=PENDING`, resets pagination to the first page, and distinguishes no filtered results from no pending orders

### Requirement: Role-adaptive purchasing actions
The purchasing hub SHALL present a panel with links to create a purchase order, view order history and manage suppliers. It SHALL render all three links only for Admin or Inventory and SHALL not render create or supplier-management controls for a user holding only Receiving. The history link SHALL be available to all roles authorized to list purchase orders.

#### Scenario: Management user sees actions
- **WHEN** an Admin or Inventory user opens the hub
- **THEN** the panel contains Crear pedido, Historial de pedidos and Lista de proveedores

#### Scenario: Receiving user sees only authorized actions
- **WHEN** a Receiving-only user opens the hub
- **THEN** the panel does not contain Crear pedido or Lista de proveedores and no request to a creation-only endpoint is made

### Requirement: Purchase-order history is filterable and inspectable
The frontend SHALL provide a paginated purchase-order history screen for users authorized to list orders. Its table SHALL show supplier, status, order date, receiving user and total, use `formatMoney()` for total, and let the user open an order detail. It SHALL support only the verified backend filters: supplier, date range and status values `PENDING` or `RECEIVED` (plus no status filter for all results); it SHALL not present an unsupported cancelled-status or global-text-search filter.

#### Scenario: View filtered history
- **WHEN** an authorized user applies a supplier, date range or supported status filter
- **THEN** the frontend requests the server-paginated history with those filters and returns to page one

#### Scenario: Inspect a historical order
- **WHEN** the user activates a history row by pointer, Enter or Space
- **THEN** the order detail opens and preserves access to its backend-authorized actions

### Requirement: Purchase-order detail exposes backend item audit fields
The frontend SHALL show purchase-order items using backend-provided requested and received quantities, non-delivery reason, free-text description and removal fields. It SHALL label an uncatalogued free-text item as pending catalog registration and a removed item as removed with its reason; it SHALL not manufacture a generic item-status field in the browser.

#### Scenario: Added or rejected item is traceable
- **WHEN** an order detail contains a free-text item or an item removed with a reason
- **THEN** the item is visibly labelled pending catalog registration or removed, respectively, and the supplied reason remains visible

### Requirement: Supplier management preserves history
The frontend SHALL let authorized users create, edit and deactivate suppliers, showing inactive suppliers in historical purchase data but excluding them from new-order choices. It SHALL not offer permanent deletion.

#### Scenario: Create supplier
- **WHEN** an authorized user submits a valid new supplier
- **THEN** the supplier appears as active and can be selected for a new purchase order

#### Scenario: Deactivate supplier
- **WHEN** an authorized user confirms deactivation of a supplier
- **THEN** the supplier remains visible in historical orders and reports but is unavailable for new orders

#### Scenario: Duplicate or invalid supplier
- **WHEN** the backend rejects supplier creation or editing
- **THEN** its message is shown inline and the entered values remain available for correction

### Requirement: Products can be linked to multiple suppliers
The frontend SHALL let authorized users associate a product with one or more suppliers and identify the preferred supplier from the backend response. It SHALL display the backend-provided purchase data for each association and SHALL not derive a preferred supplier locally.

#### Scenario: Multiple supplier choices
- **WHEN** a product has more than one active associated supplier
- **THEN** the user can see each association and its preferred status

#### Scenario: Product without a preferred supplier
- **WHEN** the backend returns a product without a preferred supplier
- **THEN** the frontend explains that planning needs supplier selection and does not invent one

### Requirement: Manual purchase-order creation
The frontend SHALL let Admin and Inventory create a pending purchase order using an active supplier, an order date and one or more catalogued products with quantities and unit costs. The displayed order total SHALL come from the backend response and monetary values SHALL be decimal strings formatted with `formatMoney()`.

#### Scenario: Create pending order
- **WHEN** an authorized user submits a valid order with catalogued items
- **THEN** the backend-created pending order is displayed with its returned total

#### Scenario: Missing required order data
- **WHEN** the user attempts to submit without an active supplier, an item, quantity or unit cost
- **THEN** the invalid fields are identified inline and no request is sent

### Requirement: Replenishment suggestions require review
The frontend SHALL display backend-generated replenishment suggestions that account for current stock, sales volume, replenishment frequency and product–supplier relationships. It SHALL let an authorized user review and adjust a suggestion before creating a purchase order, and SHALL never calculate the suggestion or create an order automatically in the browser.

#### Scenario: Review a suggestion
- **WHEN** the backend returns replenishment items
- **THEN** each item and its backend-provided rationale is visible before the user creates an order

#### Scenario: No replenishment required
- **WHEN** the backend returns no replenishment suggestion
- **THEN** the frontend shows an empty state explaining that no replenishment is currently required

#### Scenario: Planning data is incomplete
- **WHEN** the backend reports that a product lacks planning data
- **THEN** the frontend displays the backend-provided reason and does not guess a quantity or supplier

### Requirement: One full payment per purchase order
The frontend SHALL let Admin or Cashier register the one outstanding full payment of a received purchase order paid on account, using a decimal-string amount and `cash` or `transfer`. It SHALL display the backend-returned payment and SHALL not calculate balances or distribute a payment across orders.

#### Scenario: Register the outstanding full payment
- **WHEN** an authorized user records an amount equal to the final total of an account purchase order
- **THEN** the backend-confirmed payment is displayed after it is recorded

#### Scenario: Partial or duplicate payment
- **WHEN** the backend rejects a partial amount or a second payment
- **THEN** the backend message is shown inline and no success confirmation is shown

#### Scenario: Invalid payment
- **WHEN** the backend rejects a payment because of its amount, order status or duplicate-payment state
- **THEN** the backend message is shown inline and no success confirmation is shown

### Requirement: Supplier and purchasing states are explicit
Every supplier, order, planning, payment and payment-state view SHALL render explicit loading, empty, error and success feedback. Errors SHALL retain entered form values, provide retry where applicable and surface the backend message.

#### Scenario: Empty supplier list
- **WHEN** no suppliers exist
- **THEN** the view explains that there are no suppliers and offers the primary creation action to an authorized user

#### Scenario: Data load fails
- **WHEN** a primary purchasing request fails
- **THEN** no partial data is rendered and the backend message and a retry action are shown

#### Scenario: Successful mutation
- **WHEN** a supplier, order or payment mutation succeeds
- **THEN** the frontend shows a Spanish success confirmation matching the action and reloads authoritative data

### Requirement: Supplier and purchasing interaction is accessible
Supplier and purchasing views SHALL be usable by keyboard, preserve managed dialog focus, show visible focus, use labels and text status, and remain usable at mobile width.

#### Scenario: Keyboard row activation
- **WHEN** a keyboard user focuses a supplier or purchase-order row
- **THEN** Enter opens its available detail action and visible focus remains present

#### Scenario: Dialog focus return
- **WHEN** a create, edit, payment or confirmation dialog closes without navigation
- **THEN** focus returns to its trigger

#### Scenario: Mobile purchasing action
- **WHEN** the view is used at mobile width
- **THEN** the supplier, status, total or payment state and primary action remain available without relying on color alone
