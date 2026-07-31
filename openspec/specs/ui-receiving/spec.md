# ui-receiving Specification

## Purpose
TBD - created by archiving change add-frontend-user-roles-and-receiving. Update Purpose after archive.
## Requirements
### Requirement: Receiving section restricted to Receiving and Admin
The frontend SHALL expose a receiving section at `/receiving`, reachable only by users holding role `receiving` or role `admin`, gated with `requireRole()` in `page.tsx` and declared in `NAV_ITEMS` with the same roles. The section SHALL be read-only over the purchase order itself: it SHALL NOT offer creating purchase orders or suppliers, which have no frontend management UI.

#### Scenario: Receiving role reaches the section
- **WHEN** a user whose roles include `receiving` opens the navigation
- **THEN** the receiving section is listed and opening it renders the purchase order list

#### Scenario: Cashier without the receiving role is kept out
- **WHEN** a user whose only role is `cashier` navigates directly to `/receiving`
- **THEN** they are redirected away and no purchase order data is requested

#### Scenario: No creation affordance
- **WHEN** any authorized user views the receiving section
- **THEN** no control to create a purchase order or a supplier is rendered

### Requirement: Purchase order list ordered for receiving
The frontend SHALL list purchase orders from `GET /purchase-orders`, showing supplier name, order date, total and status, with pending orders first — the receiving user's question is always "what is arriving", not "what arrived". The list SHALL be filterable by supplier and by date range, SHALL be paginated using the backend's page and total, and SHALL handle loading, empty and error states explicitly. Totals SHALL render through `formatMoney()` and dates through the `es-AR` formatter.

#### Scenario: Pending orders first
- **WHEN** the list loads with both pending and received orders in range
- **THEN** pending orders are listed before received ones

#### Scenario: No orders in range
- **WHEN** the applied filters match no purchase order
- **THEN** an empty state explains that there are no orders for those filters and offers clearing them

#### Scenario: Listing fails
- **WHEN** the request fails
- **THEN** the backend's `message` is shown with a retry action, and no partial list is rendered

#### Scenario: Row opens the detail
- **WHEN** the user activates a row, by pointer or by keyboard
- **THEN** the frontend navigates to `/receiving/[id]` for that order

### Requirement: Purchase order detail
The frontend SHALL render a purchase order detail at `/receiving/[id]` from `GET /purchase-orders/{id}`, listing every item with its product name or free-text description, quantity, unit cost and subtotal, plus the order total, supplier, order date and status. A received order SHALL additionally display who received it, when, and with which payment method. Removed items SHALL remain visible, visually struck through and labelled with their removal reason — a removed item is a record, not a deletion.

#### Scenario: Pending order detail
- **WHEN** a pending order is opened
- **THEN** its items and total are listed and the receiving actions are available

#### Scenario: Received order detail
- **WHEN** a received order is opened
- **THEN** the receiving user, the reception date and time, and the payment method are displayed, and no receiving action is offered

#### Scenario: Removed item stays visible
- **WHEN** an order containing a removed item is opened
- **THEN** the item is shown struck through with its removal reason and is excluded from the total

### Requirement: Confirm reception with payment method
The frontend SHALL let an authorized user confirm the reception of a `PENDING` order through a dialog that requires choosing a payment method — efectivo, transferencia or cuenta corriente — and that states, before confirmation, that the reception will record their user, the current date and time, the quantities actually delivered, stock movements and the order closure. The dialog SHALL let the user review or enter the quantity actually delivered for each active order item. Confirmation SHALL call the backend reception contract with the chosen method and delivered quantities. The confirm button SHALL be disabled while the request is in flight and until a method is chosen. On success the frontend SHALL show a success toast and re-read the order rather than assuming the resulting state. Backend failures SHALL surface the `message` inline in the dialog, leaving the chosen method and quantities intact.

#### Scenario: Successful reception
- **WHEN** the user chooses a payment method, confirms delivered quantities and the backend accepts reception
- **THEN** the order is re-read as `RECEIVED`, showing the receiving user, timestamp and payment method, stock reflects the delivered quantities, and a success toast is shown

#### Scenario: Payment method is mandatory
- **WHEN** the dialog opens with no payment method chosen
- **THEN** the confirm action is disabled until one is chosen

#### Scenario: What gets recorded is stated up front
- **WHEN** the reception dialog is open
- **THEN** it states that the user, date and time, actual delivered quantities, stock movements and order closure will be recorded

#### Scenario: Reception fails
- **WHEN** the backend rejects reception because quantities or stock cannot be updated
- **THEN** the dialog stays open showing the backend `message`, the order is not shown as received, and the frontend does not report a stock update

#### Scenario: Already received
- **WHEN** the order was received by someone else since the page loaded and the backend responds `409`
- **THEN** the message is surfaced and the order is re-read to show its actual state

### Requirement: Add an item that was not in the order
The frontend SHALL let an authorized user add an item to a `PENDING` order when the supplier delivers something that was not ordered. The form SHALL offer two mutually exclusive ways to identify the item: selecting an existing product by searching the catalog by name or code, or — when the product does not exist in the catalog — entering a free-text description. Quantity and unit cost SHALL be required in both cases; unit cost SHALL be entered and sent as a decimal string. Submission SHALL call `POST /purchase-orders/{id}/items`. On success the order SHALL be re-read so the recalculated total comes from the backend and is never computed in the client.

#### Scenario: Add a catalogued product
- **WHEN** the user searches the catalog, selects a product, enters quantity and unit cost, and submits
- **THEN** the item is added and the order is re-read with the backend's recalculated total

#### Scenario: Add an uncatalogued product as free text
- **WHEN** the search finds no product and the user enters a free-text description with quantity and unit cost
- **THEN** the item is added and shown in the order marked as pending catalog registration by an Admin

#### Scenario: Product and description are exclusive
- **WHEN** the user has selected a catalog product
- **THEN** the free-text description field is not submitted, and choosing to describe the item in free text clears the selected product

#### Scenario: Missing quantity or cost
- **WHEN** the user submits without a quantity or without a unit cost
- **THEN** the error is shown inline next to the field and no request is sent

#### Scenario: Total is never computed client-side
- **WHEN** an item is added
- **THEN** the displayed total comes from the re-read order, not from arithmetic over the item list

#### Scenario: Received orders cannot be edited
- **WHEN** a `RECEIVED` order is open
- **THEN** no control to add an item is rendered

### Requirement: Remove an item from the order with a mandatory reason
The frontend SHALL let an authorized user remove an item from a `PENDING` order — the supplier did not deliver it, or delivered it damaged — always through a dialog requiring a non-empty reason, with the same treatment as voiding an item in a sale. Submission SHALL call `DELETE /purchase-orders/{id}/items/{item_id}` carrying the reason. The confirm action SHALL stay disabled while the reason is blank and while the request is in flight. On success the order SHALL be re-read and the item SHALL remain visible as removed, with its reason.

#### Scenario: Reason is mandatory
- **WHEN** the removal dialog is open with an empty reason
- **THEN** the confirm action is disabled and no request is sent

#### Scenario: Successful removal
- **WHEN** the user enters a reason and confirms
- **THEN** the order is re-read, the item appears as removed with its reason, and a success toast is shown

#### Scenario: Removal fails
- **WHEN** the backend rejects the removal
- **THEN** the dialog stays open showing the backend `message` and the item is still listed as active

#### Scenario: Received orders cannot be edited
- **WHEN** a `RECEIVED` order is open
- **THEN** no control to remove an item is rendered

### Requirement: Uncatalogued items are visibly pending
The frontend SHALL mark every free-text item as pending catalog registration, both in the order detail and in the list row of any order that contains one, so an Admin can see there is work left to do. The receiving section SHALL NOT offer creating the product: catalog registration happens in the products section, by an Admin.

#### Scenario: Marked in the detail
- **WHEN** an order containing a free-text item is opened
- **THEN** the item is labelled as pending registration by an Admin

#### Scenario: Marked in the list
- **WHEN** the list contains an order with at least one free-text item
- **THEN** that row carries a badge indicating it has items pending registration

#### Scenario: No product creation from receiving
- **WHEN** a free-text item is displayed
- **THEN** no action to create the product is offered in the receiving section
