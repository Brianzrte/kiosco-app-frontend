## MODIFIED Requirements

### Requirement: Purchasing hub prioritizes pending orders
The frontend SHALL provide `/purchasing` as the shared operational hub for Admin, Inventory and Receiving. Its header SHALL carry the section title, a one-line description and the section actions, and the pending-order region SHALL be the dominant content of the page; the frontend SHALL NOT render a separate lateral action panel. The pending region SHALL request only `PENDING` purchase orders, support the backend filters by supplier and date range, and let each order be opened from its row. Each pending order SHALL be rendered as a row-sized card showing supplier name, order date, total through `formatMoney()`, a text status badge, a badge when the order contains items pending catalog registration, and a direct action that opens that order's detail to receive it. The row SHALL only render data present in the purchase-order listing response; it SHALL NOT request an order detail to enrich a row. A counter SHALL state how many pending orders are listed. Supplier and date filters SHALL be presented as a compact block below the pending region, together with a link to the replenishment suggestions of the new-order form for users authorized to create orders. Below the desktop breakpoint the pending orders SHALL stack before the filter block and no page-level horizontal overflow SHALL be required.

#### Scenario: Pending orders dominate the hub
- **WHEN** an authorized user opens `/purchasing` at desktop width
- **THEN** the pending orders are the dominant region of the page, the section actions live in the header, and no lateral action panel is rendered

#### Scenario: Pending order row states its data and its action
- **WHEN** the hub lists a pending order
- **THEN** its row shows the supplier name, the order date, the total formatted with `formatMoney()`, a text status badge and an action that opens that order to receive it, and no additional request is made per row

#### Scenario: Order with uncatalogued items is flagged in the hub
- **WHEN** a listed pending order contains at least one free-text item
- **THEN** its row carries a badge indicating that it has items pending catalog registration

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** pending orders appear before the filter block, every row keeps supplier, total, status and its action reachable, and no page-level horizontal overflow is required

#### Scenario: Pending-order filters
- **WHEN** the user changes supplier or date filters in the filter block
- **THEN** the frontend sends the supported query values with `status=PENDING`, resets pagination to the first page, and distinguishes no filtered results from no pending orders

#### Scenario: Hub without pending orders
- **WHEN** no pending order matches an unfiltered request
- **THEN** the hub explains that there are no pending orders to receive and offers the order-creation action to a user authorized to create orders

#### Scenario: Hub fails to load pending orders
- **WHEN** the pending-orders request fails
- **THEN** the hub shows the backend `message` with a retry action and renders no partial list

### Requirement: Role-adaptive purchasing actions
The purchasing hub SHALL present, in its header, the actions to create a purchase order, view order history and manage suppliers. It SHALL render all three only for Admin or Inventory, with order creation as the primary action and the other two as secondary ones, and SHALL NOT render create, supplier-management or replenishment-suggestion entry points for a user holding only Receiving. The history action SHALL be available to every role authorized to list purchase orders. The hub SHALL NOT request an endpoint that the current user's role is not authorized to call.

#### Scenario: Management user sees actions
- **WHEN** an Admin or Inventory user opens the hub
- **THEN** the header contains Crear pedido as the primary action plus Historial de pedidos and Lista de proveedores as secondary ones

#### Scenario: Receiving user sees only authorized actions
- **WHEN** a Receiving-only user opens the hub
- **THEN** the header does not contain Crear pedido or Lista de proveedores, the replenishment-suggestions link is not rendered, and no request to a creation-only endpoint is made

### Requirement: Replenishment suggestions require review
The frontend SHALL display backend-generated replenishment suggestions that account for current stock, sales volume, replenishment frequency and product–supplier relationships. It SHALL let an authorized user review and adjust a suggestion before creating a purchase order, and SHALL never calculate the suggestion or create an order automatically in the browser. Suggestions SHALL be presented inside the new-order form as secondary help placed after the order's item list, never above it, with a badge stating how many low-stock suggestions there are and, for each suggestion, its backend-provided explanation next to an action that adds it to the order with the suggested quantity. WHEN no supplier is selected for the draft order, the frontend SHALL split the suggestions into two distinct sections — products with a positive suggested quantity ("Bajos de stock") and products with incomplete planning data, identified by a null suggested quantity ("Datos de planificación incompletos") — instead of a single undifferentiated list, SHALL show each section's own empty message when that section has no items, and SHALL visually distinguish the two sections with a color tone in addition to their text labels, never relying on color alone. The incomplete-planning-data section SHALL let the user mark a product, enter a manual quantity and confirm it to add the product as an order item, since the backend cannot compute a suggested quantity for these products. The incomplete-planning-data section SHALL offer a search control that filters its items by product name against the already-loaded suggestions, without requesting new data from the backend.

#### Scenario: Review a suggestion
- **WHEN** the backend returns replenishment items
- **THEN** each item and its backend-provided rationale is visible before the user creates an order

#### Scenario: Suggestions are secondary to the order being built
- **WHEN** the new-order form is open
- **THEN** the suggestions block appears after the order's item list, headed by a badge with the number of low-stock suggestions, and each low-stock suggestion offers an action to add it with its suggested quantity

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

## ADDED Requirements

### Requirement: New purchase order preloads the supplier's last order
The frontend SHALL preload the draft of a new purchase order with the lines of the supplier's most recent purchase order, read from the existing listing and detail endpoints, so recurring purchases do not have to be retyped. The preload SHALL run when a supplier is chosen or changed and the draft is still pristine — no item has a selected product — and SHALL otherwise offer an explicit action to bring the last order in, never replacing entered work without the user asking for it. Every preloaded line SHALL be editable in quantity and unit cost and removable from the draft without any justification, because the draft is not an existing order. The frontend SHALL exclude from the preload the lines that were removed from the previous order, the free-text lines with no product, and the lines whose product is inactive or absent from the loaded catalog, and SHALL name each excluded line with its reason. The preload SHALL never send a request other than the existing purchase-order listing and detail endpoints, and SHALL never create a template entity.

#### Scenario: Preload the last order for a supplier
- **WHEN** the user selects a supplier in a pristine new-order draft and that supplier has previous orders
- **THEN** the draft is filled with the eligible lines of the supplier's most recent order, each with its quantity and unit cost, and a banner states that the lines come from that order, gives its date and makes clear that nothing is confirmed and everything is editable

#### Scenario: Excluded lines are named, not dropped silently
- **WHEN** the previous order contains removed lines, free-text lines, or lines whose product is inactive or missing from the loaded catalog
- **THEN** those lines are not added to the draft and the banner lists them by the name they had in the previous order together with the reason each one was left out

#### Scenario: First order to a supplier
- **WHEN** the selected supplier has no previous purchase order
- **THEN** the form states that it is the first order to that supplier, the draft stays empty and usable, and no error is shown

#### Scenario: Preload does not overwrite entered work
- **WHEN** the user changes the supplier while the draft already has at least one line with a selected product
- **THEN** the draft is left untouched and an explicit action to bring in that supplier's last order is offered instead

#### Scenario: Preload fails
- **WHEN** either request behind the preload fails
- **THEN** a non-blocking notice shows the backend `message` with an action to retry the preload, the form remains fully usable to build the order by hand, and order creation is not blocked

#### Scenario: Preload keeps its own loading state
- **WHEN** the preload requests are in flight
- **THEN** a loading indicator is shown inside the items area while the supplier and date fields remain usable

#### Scenario: Focus stays with the user during preload
- **WHEN** the preload finishes and fills the draft
- **THEN** focus remains on the supplier control, the banner is announced through a polite live region, and focus is never moved to the end of the item list

#### Scenario: A previous order that was cancelled still serves as a source
- **WHEN** the supplier's most recent order was closed as `CANCELLED`
- **THEN** its eligible lines are preloaded anyway and the banner names that order and its date

### Requirement: Purchase-order detail at the purchasing route
The frontend SHALL render a purchase-order detail at `/purchasing/[id]` from `GET /purchase-orders/{id}` for every role authorized to read purchase orders, listing every item with its product name or free-text description, requested quantity, received quantity, unit cost and subtotal, plus the order total, supplier, order date and status. Money SHALL be rendered with `formatMoney()` and dates with the `es-AR` formatter; the total SHALL always come from the backend and SHALL never be computed in the browser. A received order SHALL additionally display who received it, when, and with which payment method, and SHALL offer no receiving, item-adding or item-removing action. Removed items SHALL remain visible, struck through and labelled with their removal reason — a removed item is a record, not a deletion — and SHALL be listed apart from the items still to resolve.

#### Scenario: Pending order detail
- **WHEN** a pending order is opened
- **THEN** its items and total are listed and the reception actions are available

#### Scenario: Received order detail
- **WHEN** a received order is opened
- **THEN** the receiving user, the reception date and time, and the payment method are displayed, and no reception, add-item or remove-item action is offered

#### Scenario: Cancelled order detail
- **WHEN** an order that was closed as `CANCELLED` is opened
- **THEN** its status is shown as cancelled with the per-item reasons that were recorded, and no reception action is offered

#### Scenario: Removed item stays visible
- **WHEN** an order containing a removed item is opened
- **THEN** the item is shown struck through with its removal reason, apart from the items pending resolution, and is excluded from the total the backend returns

#### Scenario: Detail fails to load
- **WHEN** `GET /purchase-orders/{id}` fails
- **THEN** the backend `message` is shown with a retry action and no partial order is rendered

### Requirement: Purchase-order lines are resolved one by one before confirming reception
The frontend SHALL let an authorized user resolve the reception of a `PENDING` order line by line, on the order detail itself and not inside a dialog. Each active line SHALL offer exactly three actions of equal weight, each identified by icon and text and not by color alone: receive everything that was requested, receive less than requested, and record that the supplier did not deliver it. Receiving less SHALL open an inline panel asking for the received quantity and a mandatory reason for the difference; recording a non-delivery SHALL open an inline panel asking for a mandatory reason. The action that confirms such a line SHALL stay disabled, with a visible explanation of what is missing, while its reason is blank — the block SHALL happen before any request is attempted. A resolved line SHALL collapse into a labelled summary of its outcome with an action to undo it, and undoing SHALL restore the three actions for that line. No resolution SHALL send any request: the whole resolution SHALL be local state until the user confirms the reception, and the received quantity SHALL be constrained to the range the backend accepts, from zero up to the requested quantity. The detail SHALL show a permanent warning stating that every line needs an action before confirming and that an order with nothing received is cancelled, plus a live counter of how many lines are resolved out of how many are active. The confirmation control SHALL have three states: disabled while lines remain unresolved, a normal reception confirmation when every line is resolved and something is received, and an explicitly labelled cancel-the-order confirmation when every line is resolved and nothing is received.

#### Scenario: Receive a line in full
- **WHEN** the user activates the receive-everything action of a line
- **THEN** the line collapses into a summary stating that it was fully received with its quantity, an undo action appears, and no request is sent

#### Scenario: Receive less than requested
- **WHEN** the user activates the receive-less action of a line
- **THEN** an inline panel opens asking for the received quantity and a mandatory reason for the difference, with focus on the quantity field

#### Scenario: Reason blocks the line before any attempt
- **WHEN** the reason of a receive-less or non-delivery panel is blank
- **THEN** the action that confirms that line is disabled, a message states which reason is missing, and no request is sent

#### Scenario: Record that the supplier did not deliver a line
- **WHEN** the user confirms the non-delivery panel of a line with a reason
- **THEN** the line collapses into a summary stating that it was not delivered together with its reason, an undo action appears, and no request is sent

#### Scenario: Undo a resolved line
- **WHEN** the user activates the undo action of a resolved line
- **THEN** the line returns to its unresolved state with the three actions available, the resolved counter decreases, and nothing has been sent to the backend

#### Scenario: Received quantity stays within the accepted range
- **WHEN** the user enters a received quantity below zero or above the requested quantity
- **THEN** the line cannot be confirmed, an inline message states the accepted range, and no request is sent

#### Scenario: Confirmation is blocked while lines are unresolved
- **WHEN** at least one active line has no resolution
- **THEN** the confirmation control is disabled and states that every line must be resolved before confirming, and the counter shows how many lines are resolved out of the active total

#### Scenario: Nothing received cancels the order and says so
- **WHEN** every active line is resolved and none of them has a received quantity above zero
- **THEN** the footer states that nothing will be received from this order and the confirmation control is labelled as confirming and cancelling the order

#### Scenario: Warning about the reception is permanent
- **WHEN** a pending order detail is open
- **THEN** a permanent warning states that each line needs an action before confirming and that an order with nothing received is cancelled

#### Scenario: Resolution survives a re-read of the order
- **WHEN** the order is re-read because an item was added or removed
- **THEN** the resolutions of the lines that are still active are preserved, a newly added line appears unresolved, and the counter and confirmation state are updated accordingly

#### Scenario: Order with no active line
- **WHEN** a pending order has no active line left to resolve
- **THEN** the detail explains that there is nothing to receive and offers no confirmation control

#### Scenario: Resolution is operable by keyboard
- **WHEN** a keyboard user moves through a line
- **THEN** the three actions are reachable in reading order with visible focus, opening a panel moves focus into its first field, confirming the line moves focus to its undo action, and undoing returns focus to the line's actions

#### Scenario: Resolution at mobile width
- **WHEN** the detail is used at 320 px
- **THEN** each line stacks its data and its three actions keep their full labels and a touch target of at least 44 px, without page-level horizontal overflow

### Requirement: Reception confirmation records the payment method and re-reads the order
The frontend SHALL send the whole resolution of a `PENDING` order in a single reception request, through a confirmation dialog that requires choosing a payment method — efectivo, transferencia or cuenta corriente — and that states, before confirming, that the reception will record the user, the current date and time, the quantities actually delivered, the stock movements and the closure of the order. The dialog SHALL summarise how many lines are received in full, how many partially and how many were not delivered, and SHALL state, when nothing is received, that the order will be closed as cancelled while the payment method is still required. The confirmation SHALL stay disabled until a method is chosen and while the request is in flight. On success the frontend SHALL show a Spanish success confirmation matching the outcome and re-read the order instead of assuming the resulting state. Backend failures SHALL surface the `message` inline in the dialog, keeping the chosen method and the whole local resolution intact.

#### Scenario: Successful reception
- **WHEN** every line is resolved, the user chooses a payment method and the backend accepts the reception
- **THEN** the order is re-read as `RECEIVED` showing the receiving user, the timestamp and the payment method, and a success confirmation is shown

#### Scenario: Payment method is mandatory
- **WHEN** the confirmation dialog opens with no payment method chosen
- **THEN** the confirmation action is disabled until one is chosen

#### Scenario: What gets recorded is stated up front
- **WHEN** the confirmation dialog is open
- **THEN** it states that the user, date and time, actual delivered quantities, stock movements and order closure will be recorded

#### Scenario: Confirming a reception with nothing received
- **WHEN** the user confirms with every line resolved and nothing received
- **THEN** the dialog states beforehand that the order will be closed as cancelled, still requires a payment method, and on success the order is re-read as `CANCELLED` with a confirmation matching that outcome

#### Scenario: Reception fails
- **WHEN** the backend rejects the reception
- **THEN** the dialog stays open showing the backend `message`, the local resolution and the chosen method are preserved, the order is not shown as received and no stock update is reported

#### Scenario: Already received by someone else
- **WHEN** the order was received by someone else since the page loaded and the backend responds `409`
- **THEN** the message is surfaced, the order is re-read, and if it is no longer pending the resolution area is replaced by the recorded reception

### Requirement: Remove a line from the order with a mandatory reason
The frontend SHALL let an authorized user remove a line from a `PENDING` order — the line should not be part of the order at all — through an action that is visibly separate from the three reception actions, always via a dialog requiring a non-empty reason. Submission SHALL call `DELETE /purchase-orders/{id}/items/{item_id}` carrying the reason. The confirm action SHALL stay disabled while the reason is blank and while the request is in flight. The dialog SHALL state that removing the line is immediate and cannot be undone, which is why it is not the same as recording that the supplier did not deliver it. On success the order SHALL be re-read and the line SHALL remain visible as removed, with its reason, outside the resolution area.

#### Scenario: Reason is mandatory
- **WHEN** the removal dialog is open with an empty reason
- **THEN** the confirm action is disabled and no request is sent

#### Scenario: Removal is distinguished from a non-delivery
- **WHEN** the removal dialog is open
- **THEN** it states that the removal is immediate, cannot be undone, and is not the way to record that the supplier did not deliver the item

#### Scenario: Successful removal
- **WHEN** the user enters a reason and confirms
- **THEN** the order is re-read, the line appears as removed with its reason outside the resolution area, and a success confirmation is shown

#### Scenario: Removal fails
- **WHEN** the backend rejects the removal
- **THEN** the dialog stays open showing the backend `message` and the line is still listed as active

#### Scenario: Received orders cannot be edited
- **WHEN** a `RECEIVED` order is open
- **THEN** no control to remove a line is rendered

### Requirement: Add an item that was not in the order
The frontend SHALL let an authorized user add an item to a `PENDING` order when the supplier delivers something that was not ordered. The form SHALL state the order it is adding to and SHALL offer its two mutually exclusive ways to identify the item as two equally sized tabs, not as a native select: searching the catalog for an existing product, or entering a free-text description when the product does not exist in the catalog. The catalog tab SHALL show the matching products with their name and code; the free-text tab SHALL show, before saving, a warning explaining that the item will remain pending catalog registration, that it can still be received and moved in stock, and that an Admin has to catalog it to make it a regular product. Quantity and unit cost SHALL be required in both tabs; unit cost SHALL be entered and sent as a decimal string. Submission SHALL call `POST /purchase-orders/{id}/items`. On success the order SHALL be re-read so the recalculated total comes from the backend and is never computed in the client.

#### Scenario: Add a catalogued product
- **WHEN** the user searches the catalog, selects a product, enters quantity and unit cost, and submits
- **THEN** the item is added and the order is re-read with the backend's recalculated total

#### Scenario: Add an uncatalogued product as free text
- **WHEN** the user switches to the free-text tab and enters a description with quantity and unit cost
- **THEN** the warning about the item remaining pending catalog registration is visible before submitting, and after submitting the item is added and shown in the order marked as pending catalog registration

#### Scenario: Tabs are exclusive
- **WHEN** the user has selected a catalog product and switches to the free-text tab
- **THEN** only the active tab's identification is submitted and the other one's value is not sent

#### Scenario: Tabs are operable by keyboard
- **WHEN** a keyboard user focuses the tab list
- **THEN** the arrow keys move between the two tabs, the selected tab is exposed as selected to assistive technology, and the panel of the active tab receives focus in reading order

#### Scenario: Missing quantity or cost
- **WHEN** the user submits without a quantity or without a unit cost
- **THEN** the error is shown inline next to the field and no request is sent

#### Scenario: Catalog search finds nothing
- **WHEN** no product matches the typed search term
- **THEN** the catalog tab explains it and points to the free-text tab instead of showing an unexplained empty list

#### Scenario: Total is never computed client-side
- **WHEN** an item is added
- **THEN** the displayed total comes from the re-read order, not from arithmetic over the item list

#### Scenario: Received orders cannot be edited
- **WHEN** a `RECEIVED` order is open
- **THEN** no control to add an item is rendered

### Requirement: Uncatalogued items are visibly pending
The frontend SHALL mark every free-text item as pending catalog registration, both in the order detail and in the row of any listed order that contains one, so an Admin can see there is work left to do. The purchasing section SHALL NOT offer creating the product: catalog registration happens in the products section, by an Admin.

#### Scenario: Marked in the detail
- **WHEN** an order containing a free-text item is opened
- **THEN** the item is labelled as pending registration by an Admin, with text and not only with color

#### Scenario: Marked in the list
- **WHEN** a list contains an order with at least one free-text item
- **THEN** that row carries a badge indicating it has items pending registration

#### Scenario: No product creation from purchasing
- **WHEN** a free-text item is displayed
- **THEN** no action to create the product is offered in the purchasing section

### Requirement: Legacy purchasing routes keep redirecting
The frontend SHALL keep `/suppliers`, `/receiving` and `/receiving/[id]` as redirects to `/purchasing/suppliers`, `/purchasing` and `/purchasing/{id}` respectively, so existing links and bookmarks keep working, and SHALL NOT build any screen under those paths.

#### Scenario: Legacy receiving link
- **WHEN** an authorized user opens `/receiving` or `/receiving/[id]` directly
- **THEN** they are redirected to the equivalent purchasing route and no separate receiving screen is rendered

#### Scenario: Legacy suppliers link
- **WHEN** an authorized user opens `/suppliers` directly
- **THEN** they are redirected to `/purchasing/suppliers`

### Requirement: Purchasing screens follow the approved purchasing redesign
The purchasing hub, the new-order form, the purchase-order detail and the add-item form SHALL follow the approved purchasing redesign, expressed exclusively through the project's design-system tokens and UI kit primitives. No screen of the section SHALL introduce a literal color, radius, shadow or font value taken from the mockup, and no ad-hoc per-screen styling SHALL replace an existing primitive. Any value of the mockup that has no token SHALL be resolved as a token decision before it is used, never as an inline literal.

#### Scenario: Redesign rendered through tokens
- **WHEN** any redesigned purchasing screen is implemented
- **THEN** its colors, radii, shadows and typography come from the design-system tokens and its controls from the shared UI kit

#### Scenario: A mockup value without a token
- **WHEN** the redesign requires a value that no current token expresses
- **THEN** it is resolved by deciding a token rather than by writing the literal value into the screen
