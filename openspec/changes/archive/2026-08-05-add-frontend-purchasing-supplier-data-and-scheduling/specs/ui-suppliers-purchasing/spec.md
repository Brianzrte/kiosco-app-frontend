## MODIFIED Requirements

### Requirement: Purchasing hub prioritizes pending orders
The frontend SHALL provide `/purchasing` as the shared operational hub for Admin, Inventory, Receiving and Cashier. The hub SHALL organize pending orders by their target delivery date into two regions: a dominant "Qué llega hoy" region listing every `PENDING` order whose target delivery date is today or earlier, and a secondary, denser "Esta semana" region listing every `PENDING` order whose target delivery date falls in the following six days. Each region SHALL request only `PENDING` orders with the backend target-date filters, SHALL show supplier, target date, total and status per order, and SHALL link each order to its detail. Below the desktop breakpoint the regions SHALL stack in that same order without page-level horizontal overflow. A `PENDING` order without a target delivery date SHALL NOT be placed in either region, and the hub SHALL offer a link to the complete pending list so those orders remain reachable. The hub SHALL keep the supplier and date-range filters it already supports.

#### Scenario: Pending orders dominate the hub
- **WHEN** an authorized user opens `/purchasing` at desktop width
- **THEN** the target-date pending-order regions are the dominant content of the page, their actions live in the header, and no lateral action panel is rendered

#### Scenario: Pending order row states its data and its action
- **WHEN** the hub lists a pending order
- **THEN** its row shows supplier, target date, total formatted with `formatMoney()` and a text status badge; a row in "Qué llega hoy" also shows an action that opens its detail to receive it, while a row in "Esta semana" opens its detail directly

#### Scenario: Order with uncatalogued items is flagged in the hub
- **WHEN** a listed pending order contains at least one free-text item
- **THEN** its row carries a badge indicating that it has items pending catalog registration

#### Scenario: Today's arrivals dominate the hub
- **WHEN** an authorized user opens `/purchasing` and there are pending orders targeted for today or earlier
- **THEN** those orders appear in the "Qué llega hoy" region, above and visually more prominent than "Esta semana"

#### Scenario: Upcoming orders stay secondary
- **WHEN** a pending order is targeted for a date within the following six days
- **THEN** it appears only in the "Esta semana" region, whose rows offer no per-row receive action while the whole row still opens the order detail

#### Scenario: Overdue order is labelled as such
- **WHEN** a pending order's target delivery date is earlier than today
- **THEN** it appears in "Qué llega hoy" identified as overdue by text, stating how long ago the target date passed, and not by colour alone

#### Scenario: Overdue count is stated
- **WHEN** the "Qué llega hoy" region contains at least one overdue order
- **THEN** its heading states both the number of orders and the number of overdue orders as text

#### Scenario: Pending order without a target date
- **WHEN** a pending order has no target delivery date
- **THEN** it appears in neither region, the hub still offers a link to all pending orders, and no empty or invented date is rendered

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** "Qué llega hoy" appears before "Esta semana", each row remains operable with a touch target of at least 44 px, and no page-level horizontal overflow is required

#### Scenario: Nothing to receive today
- **WHEN** no pending order targets today or earlier
- **THEN** the "Qué llega hoy" region shows its own empty message, distinct from the empty message of "Esta semana" and from the message shown when there is no pending order at all

#### Scenario: Pending-order filters
- **WHEN** the user changes supplier or date filters in the hub
- **THEN** the frontend sends the supported query values with `status=PENDING`, resets pagination to the first page, and distinguishes no filtered results from no pending orders

#### Scenario: Hub without pending orders
- **WHEN** no pending order matches an unfiltered request
- **THEN** the hub explains that there are no pending orders to receive and continues to offer order creation to a user authorized to create orders

#### Scenario: Hub fails to load pending orders
- **WHEN** either target-date pending-order request fails
- **THEN** that region shows the backend `message` with a retry action and renders no partial data for the failed region

### Requirement: Role-adaptive purchasing actions
The purchasing hub SHALL present links to create a purchase order, view order history and manage suppliers. It SHALL render all three links only for Admin or Inventory. It SHALL NOT render the create-order or supplier-management controls for a user holding only Receiving, nor for a user holding only Cashier. The history link SHALL be available to all roles authorized to list purchase orders. A Cashier SHALL reach the hub from the application navigation, SHALL see the pending-order regions and SHALL be able to open an order detail and receive it.

#### Scenario: Management user sees actions
- **WHEN** an Admin or Inventory user opens the hub
- **THEN** the hub offers Crear pedido, Historial de pedidos and Lista de proveedores

#### Scenario: Receiving user sees only authorized actions
- **WHEN** a Receiving-only user opens the hub
- **THEN** Crear pedido and Lista de proveedores are not rendered and no request to a creation-only endpoint is made

#### Scenario: Cashier reaches the hub from navigation
- **WHEN** a user whose roles include `cashier` opens the application navigation
- **THEN** the purchasing entry is listed and opening it renders the pending-order regions

#### Scenario: Cashier sees only receiving actions
- **WHEN** a Cashier-only user opens the hub
- **THEN** Crear pedido and Lista de proveedores are not rendered, and the receive action of each order in "Qué llega hoy" remains available

#### Scenario: Cashier cannot reach creation routes
- **WHEN** a Cashier-only user navigates directly to the new-order route, the supplier list or a supplier detail
- **THEN** they are kept out of those routes and no creation-only request is made

### Requirement: Supplier management preserves history
The frontend SHALL let authorized users create, edit and deactivate suppliers, showing inactive suppliers in historical purchase data but excluding them from new-order choices. It SHALL not offer permanent deletion. Creating and editing a supplier SHALL also accept its optional contact data — phone, address, visit frequency in days, visit notes and general notes — sending only the values entered and never fabricating a default. Every one of those fields SHALL be nullable, since suppliers registered before the field existed have none.

#### Scenario: Create supplier
- **WHEN** an authorized user submits a valid new supplier
- **THEN** the supplier appears as active and can be selected for a new purchase order

#### Scenario: Create supplier with contact data
- **WHEN** an authorized user submits a new supplier including phone, address, visit frequency, visit notes or general notes
- **THEN** those values are sent with the creation request and are visible afterwards on the supplier's detail

#### Scenario: Supplier without contact data
- **WHEN** a supplier has no phone, address or visit frequency
- **THEN** each missing field is shown as undefined rather than blank, and no contact section disappears

#### Scenario: Deactivate supplier
- **WHEN** an authorized user confirms deactivation of a supplier
- **THEN** the supplier remains visible in historical orders and reports but is unavailable for new orders

#### Scenario: Duplicate or invalid supplier
- **WHEN** the backend rejects supplier creation or editing
- **THEN** its message is shown inline and the entered values remain available for correction

## ADDED Requirements

### Requirement: Supplier detail is a route of its own
The frontend SHALL provide a supplier detail route at `/purchasing/suppliers/[id]`, restricted to Admin and Inventory, reachable by activating a supplier from the supplier list. It SHALL show the supplier name, its active state as text, its contact data, the products associated with that supplier and a teaser of its most recent purchase orders. It SHALL offer editing the supplier record and deactivating it, reusing the existing supplier mutations, and SHALL re-read the supplier after a successful mutation instead of assuming the result.

#### Scenario: Open a supplier detail
- **WHEN** an Admin or Inventory user activates a supplier row by pointer or by Enter
- **THEN** the frontend navigates to that supplier's detail and shows its contact data, associated products and recent orders

#### Scenario: Unauthorized role is kept out
- **WHEN** a user without Admin or Inventory navigates directly to a supplier detail
- **THEN** they are kept out of the route and no supplier request is made on their behalf

#### Scenario: Supplier does not exist
- **WHEN** the backend responds that the supplier does not exist
- **THEN** an explicit not-found state is shown with a way back to the supplier list, and no partial detail is rendered

#### Scenario: Deactivate from the detail
- **WHEN** the user confirms deactivation from the supplier detail
- **THEN** the frontend re-reads the supplier, shows it as inactive with a Spanish success confirmation, and keeps its history visible

#### Scenario: Detail is usable at mobile width
- **WHEN** the supplier detail is used at 320 px
- **THEN** the contact grid, the associated-product list and the recent-order teaser remain readable in a single column without page-level horizontal overflow

### Requirement: Supplier contact data distinguishes visit frequency from replenishment frequency
The supplier detail SHALL present the supplier's contact data — company name, phone, address, visit frequency and notes — labelling the supplier-level cadence as "Frecuencia de visita", meaning how often the supplier physically delivers. The associated-product list SHALL present the product–supplier association's own cadence in a column labelled "Reposición". The frontend SHALL NOT reuse one label for the other, SHALL NOT derive either value from the other, and SHALL show each missing value as undefined.

#### Scenario: Both cadences are visible and distinct
- **WHEN** a supplier has a visit frequency and one of its associated products has a replenishment frequency
- **THEN** the visit frequency appears in the contact data and the replenishment frequency appears in the product's row, under different labels

#### Scenario: Missing cadence is explicit
- **WHEN** the supplier has no visit frequency, or an association has no replenishment frequency
- **THEN** that value is shown as undefined and the other cadence is not used in its place

#### Scenario: Phone remains legible
- **WHEN** the supplier has a phone number
- **THEN** it is rendered as selectable text in a monospaced tone, not as an image

### Requirement: Associated products are read from the supplier side
The supplier detail SHALL list the products associated with that supplier, showing for each one its name, whether it is the preferred supplier for that product — communicated with text, not only with an icon or colour — and its replenishment cadence. Each row SHALL lead to the product, and the associate action SHALL lead to the existing product–supplier association flow. The supplier detail SHALL NOT write product–supplier associations directly.

#### Scenario: Supplier with associated products
- **WHEN** the supplier has associated products
- **THEN** each product is listed with its preferred mark as text and its replenishment cadence, and activating a row opens that product

#### Scenario: Supplier without associated products
- **WHEN** the supplier has no associated products
- **THEN** an empty state explains it and offers the action to associate a product

#### Scenario: Association list fails to load
- **WHEN** the associated-products request fails
- **THEN** that section shows the backend message with a retry action while the rest of the detail remains usable

### Requirement: Supplier detail teases the latest orders
The supplier detail SHALL show at most the three most recent purchase orders for that supplier with their date, total formatted through `formatMoney()` and status as text, plus a link to the complete history filtered by that supplier. It SHALL NOT duplicate the history filters.

#### Scenario: Supplier with previous orders
- **WHEN** the supplier has purchase orders
- **THEN** at most three are shown with date, total and status, and a link leads to the full history filtered by that supplier

#### Scenario: Supplier without previous orders
- **WHEN** the supplier has no purchase orders
- **THEN** an empty state explains that there are no orders yet for that supplier

### Requirement: Purchase orders declare a target delivery date
The manual purchase-order form SHALL offer an optional target delivery date next to the order date, with inline help explaining that it states when the order is expected to arrive, and SHALL send it with the creation request when entered. Order detail and history SHALL display the backend-provided target delivery date, and SHALL state its absence explicitly for any order that has none, since orders created before the field existed will never have one. The frontend SHALL NOT infer, default or backfill a target delivery date.

#### Scenario: Create an order with a target date
- **WHEN** an authorized user enters a target delivery date and confirms the order
- **THEN** the frontend sends that date with the creation request and the created order shows both its order date and its target delivery date

#### Scenario: Create an order without a target date
- **WHEN** the user leaves the target delivery date empty
- **THEN** the order is created without it and no request is blocked by its absence

#### Scenario: Order without a target date is displayed
- **WHEN** an order whose target delivery date is null is opened or listed
- **THEN** its absence is stated as text and no empty or invented date is rendered

#### Scenario: Target date earlier than the order date
- **WHEN** the user enters a target delivery date earlier than the order date
- **THEN** a non-blocking inline notice is shown, submission is still allowed, and any backend rejection is surfaced inline keeping the entered values

#### Scenario: Backend rejects the target date
- **WHEN** the backend rejects the order because of its target delivery date
- **THEN** its message is shown inline next to the field and the rest of the draft order keeps every item, quantity and cost as entered

### Requirement: Purchase quantities are decimal and carry the product unit
Every purchase quantity — the ordered quantity in the manual order form, the received quantity when resolving a line, and the quantity of an item added outside the order — SHALL be entered and transmitted as a decimal string, never as a floating-point number, using the scale the backend accepts. Each quantity field SHALL show the unit of its product inside the field, derived from the catalog's `unit_type`: kilograms for a weighable product and units for a unit-priced one. An item identified only by free-text description SHALL be treated as unit-priced. The unit SHALL also be part of the field's accessible name, and SHALL NOT be part of the submitted value. Any client-side subtotal preview SHALL be computed with scaled integers, and the authoritative order total SHALL always come from the backend.

#### Scenario: Order a weighable product in kilograms
- **WHEN** the user enters a fractional quantity for a product whose unit type is weighable
- **THEN** the field shows the kilogram unit, the value is sent as a decimal string, and the created order reflects that quantity

#### Scenario: Order a unit-priced product
- **WHEN** the user enters a quantity for a product whose unit type is unit-priced
- **THEN** the field shows the unit label and the value is still sent as a decimal string

#### Scenario: Receive a fraction of a weighable line
- **WHEN** the user declares a received quantity lower than the requested one for a weighable line
- **THEN** the received quantity is sent as a decimal string, the mandatory difference reason is still required, and the tab order from quantity to reason is unchanged

#### Scenario: Free-text item has no catalog unit
- **WHEN** the user adds an item identified only by a free-text description
- **THEN** its quantity field shows the unit label used for unit-priced products and no catalog unit is invented

#### Scenario: Quantity outside the accepted scale
- **WHEN** the user enters a quantity with more decimals than the backend accepts
- **THEN** the field is identified inline as invalid, no request is sent, and the entered values remain available for correction

#### Scenario: Unit is announced, not typed
- **WHEN** a screen-reader user focuses a quantity field
- **THEN** the expected unit is part of the field's accessible name, and the visible unit affix is neither focusable nor included in the submitted value
