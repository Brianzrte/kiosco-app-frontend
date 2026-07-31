# ui-suppliers-purchasing Specification

## Purpose
TBD - created by archiving change add-frontend-suppliers-purchasing. Update Purpose after archive.
## Requirements
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
The frontend SHALL let Admin and Inventory create a pending purchase order using an active supplier, an order date and one or more catalogued products with quantities and unit costs. The displayed order total SHALL come from the backend response and monetary values SHALL be decimal strings formatted with `formatMoney()`. WHEN a supplier is selected for the draft order and the user chooses or changes the product of an item to a product with no active association (preferred or not) with that supplier, the frontend SHALL show an inline warning offering to associate the product with the supplier, without leaving the form or discarding items already entered. Before sending the order to the backend, the frontend SHALL show a confirmation summary of the products, quantities, unit costs, per-item subtotals and order total, and SHALL only call `POST /purchase-orders` after the user explicitly confirms that summary. Each item's product SHALL be selectable through a searchable combobox — typing filters the already-loaded product catalog by name and the result is chosen from a keyboard-navigable list — instead of a native `<select>` listing every product.

#### Scenario: Create pending order
- **WHEN** an authorized user submits a valid order with catalogued items
- **THEN** the backend-created pending order is displayed with its returned total

#### Scenario: Missing required order data
- **WHEN** the user attempts to submit without an active supplier, an item, quantity or unit cost
- **THEN** the invalid fields are identified inline and no request is sent

#### Scenario: Item product has no association with the selected supplier
- **WHEN** a supplier is selected and the user picks, for an item, a product with no active association (preferred or not) with that supplier
- **THEN** the item shows an inline warning stating that the selected product is not associated with the supplier and offers an action to associate it

#### Scenario: Item product already has an association with the selected supplier
- **WHEN** a supplier is selected and the user picks, for an item, a product that already has an active association with that supplier, whether or not it is the preferred one
- **THEN** no association warning is shown for that item

#### Scenario: Associate the product to the supplier inline
- **WHEN** the user activates the association action shown for an item's warning
- **THEN** the frontend re-reads the product's current supplier associations, adds the selected supplier as a non-preferred association without a replenishment frequency, resends the complete associations list, and preserves all previously existing associations

#### Scenario: Inline association succeeds
- **WHEN** the inline association request succeeds
- **THEN** the warning for that item disappears, a success confirmation is shown, and the in-progress order — its other items, quantities and unit costs — is neither cleared nor reloaded

#### Scenario: Inline association fails
- **WHEN** the inline association request fails
- **THEN** the warning remains visible, the backend error message is shown inline for that item, and the rest of the form keeps its entered values

#### Scenario: No supplier selected skips the association check
- **WHEN** no supplier is selected for the draft order
- **THEN** no item evaluates or shows an association warning

#### Scenario: Changing the item's product replaces a stale warning
- **WHEN** the user changes the product of an item more than once before submitting the order
- **THEN** each change triggers its own association check for that item and no warning from a previously selected product remains visible

#### Scenario: Valid order shows a confirmation summary before creation
- **WHEN** the user submits an order that passes the existing field validation
- **THEN** the frontend shows a confirmation summary listing each item's product, quantity, unit cost and subtotal, plus the order total, instead of immediately creating the order

#### Scenario: Confirming the summary creates the order
- **WHEN** the user confirms the order from the summary
- **THEN** the frontend sends `POST /purchase-orders` and, on success, follows the same existing behavior (success confirmation and redirect to the created order)

#### Scenario: Canceling the summary discards nothing
- **WHEN** the user cancels or closes the confirmation summary without confirming
- **THEN** no request is sent and the form keeps every item, quantity and cost exactly as entered

#### Scenario: Order creation fails after confirmation
- **WHEN** `POST /purchase-orders` fails after the user confirms the summary
- **THEN** the summary stays open with the backend error message shown inline, and the user can retry without reopening or rebuilding the summary

#### Scenario: Filter products in an item's combobox
- **WHEN** the user types in an item's product combobox
- **THEN** the frontend filters the already-loaded product catalog by name client-side and shows a keyboard-navigable list of matching results

#### Scenario: No product matches the combobox search term
- **WHEN** no product in the catalog matches the typed term
- **THEN** the combobox shows an explanatory inline message instead of an empty results list

#### Scenario: Select a product from the combobox
- **WHEN** the user picks a result from the item's combobox, by mouse or keyboard
- **THEN** the item's product is set to the selected product, the same way selecting a `<select>` option did, and any dependent behavior for that item (such as the supplier association check) reacts to the new product exactly as before

### Requirement: Replenishment suggestions require review
The frontend SHALL display backend-generated replenishment suggestions that account for current stock, sales volume, replenishment frequency and product–supplier relationships. It SHALL let an authorized user review and adjust a suggestion before creating a purchase order, and SHALL never calculate the suggestion or create an order automatically in the browser. WHEN no supplier is selected for the draft order, the frontend SHALL split the suggestions into two distinct sections — products with a positive suggested quantity ("Bajos de stock") and products with incomplete planning data, identified by a null suggested quantity ("Datos de planificación incompletos") — instead of a single undifferentiated list, SHALL show each section's own empty message when that section has no items, and SHALL visually distinguish the two sections with a color tone in addition to their text labels, never relying on color alone. The incomplete-planning-data section SHALL let the user mark a product, enter a manual quantity and confirm it to add the product as an order item, since the backend cannot compute a suggested quantity for these products. The incomplete-planning-data section SHALL offer a search control that filters its items by product name against the already-loaded suggestions, without requesting new data from the backend.

#### Scenario: Review a suggestion
- **WHEN** the backend returns replenishment items
- **THEN** each item and its backend-provided rationale is visible before the user creates an order

#### Scenario: No replenishment required
- **WHEN** the backend returns no replenishment suggestion
- **THEN** the frontend shows an empty state explaining that no replenishment is currently required

#### Scenario: Planning data is incomplete
- **WHEN** the backend reports that a product lacks planning data
- **THEN** the frontend displays the backend-provided reason and does not guess a quantity or supplier

#### Scenario: Suggestions split into low-stock and incomplete-data sections
- **WHEN** the user opens the manual order form without selecting a supplier
- **THEN** suggestions with a positive suggested quantity appear under a low-stock section offering the existing "use quantity" action, and suggestions with a null suggested quantity appear under a separate incomplete-planning-data section showing the backend rationale without an automatic use action

#### Scenario: One suggestion section is empty
- **WHEN** either the low-stock or the incomplete-planning-data section has no items while the other section does
- **THEN** the empty section shows its own explanatory empty message instead of disappearing without explanation

#### Scenario: Supplier already selected keeps the same two sections
- **WHEN** the user has selected a supplier for the draft order
- **THEN** the suggestions list still shows the same low-stock and incomplete-planning-data sections, unfiltered by the selected supplier, until a supplier-scoped suggestions capability is delivered

#### Scenario: Sections are distinguished by color in addition to text
- **WHEN** the two suggestion sections are shown
- **THEN** each section uses a distinct color tone from the existing design-system tokens, and the section headings and item text remain legible without relying on that color to convey meaning

#### Scenario: Mark an incomplete-planning-data item for manual quantity entry
- **WHEN** the user checks the checkbox of an item in the incomplete-planning-data section
- **THEN** the frontend reveals an inline quantity field and a confirm action for that item, without adding anything to the order yet

#### Scenario: Confirm a manual quantity adds the item to the order
- **WHEN** the user enters a quantity and activates the confirm action for a checked incomplete-planning-data item
- **THEN** the frontend adds the product as an order item with that quantity and an empty unit cost, the same way the low-stock section's "use quantity" action does

#### Scenario: Unchecking before confirming discards the pending entry
- **WHEN** the user unchecks an incomplete-planning-data item before confirming a quantity
- **THEN** the inline quantity field is hidden and no item is added to the order

#### Scenario: Expand the incomplete-planning-data search field
- **WHEN** the user activates the search icon next to the "Datos de planificación incompletos" heading
- **THEN** a text field expands to the left of the icon, keeping the heading and icon in place

#### Scenario: Filter incomplete-planning-data items by product name
- **WHEN** the user types a term in the expanded search field
- **THEN** only incomplete-planning-data items whose product name matches the term remain visible, filtered client-side over the already-loaded suggestions

#### Scenario: No incomplete-planning-data item matches the search term
- **WHEN** no incomplete-planning-data item's product name matches the typed term
- **THEN** the section shows an explanatory empty state instead of an unexplained empty list

#### Scenario: Collapse the incomplete-planning-data search field
- **WHEN** the user activates the search icon again, presses Escape while the field is focused, or leaves the empty field
- **THEN** the field collapses and the section shows the full incomplete-planning-data list again, with the search term cleared

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
