## ADDED Requirements

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

### Requirement: Supplier payments and balances
The frontend SHALL let a backend-authorized user register a supplier payment with a date, decimal-string amount, payment method and one or more received purchase orders, then display the backend-returned balance for reconciliation. It SHALL not allow the browser to calculate or alter balances.

#### Scenario: Register a partial payment
- **WHEN** an authorized user records a payment smaller than the outstanding balance of an order
- **THEN** the returned remaining balance is displayed after the payment is recorded

#### Scenario: Allocate payment across orders
- **WHEN** an authorized user associates a payment with more than one received order
- **THEN** the backend-confirmed allocations and balances are shown

#### Scenario: Invalid payment
- **WHEN** the backend rejects a payment because of its amount, order status or balance
- **THEN** the backend message is shown inline and no success confirmation is shown

### Requirement: Supplier and purchasing states are explicit
Every supplier, order, planning, payment and balance view SHALL render explicit loading, empty, error and success feedback. Errors SHALL retain entered form values, provide retry where applicable and surface the backend message.

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
- **THEN** the supplier, status, total or balance and primary action remain available without relying on color alone
