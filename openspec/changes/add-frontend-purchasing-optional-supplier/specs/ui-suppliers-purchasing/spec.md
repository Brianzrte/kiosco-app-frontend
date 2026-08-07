## MODIFIED Requirements

### Requirement: Manual purchase-order creation
The frontend SHALL let Admin and Inventory create a pending purchase order using an order date and one or more catalogued products with quantities and unit costs. Selecting an active supplier SHALL be optional: WHEN the user leaves the supplier field unselected and completes the remaining required data, the frontend SHALL submit the order without a `supplier_id` and the backend-created pending order SHALL still be displayed with its returned total. The displayed order total SHALL come from the backend response and monetary values SHALL be decimal strings formatted with `formatMoney()`.

#### Scenario: Create pending order
- **WHEN** an authorized user submits a valid order with catalogued items
- **THEN** the backend-created pending order is displayed with its returned total

#### Scenario: Missing required order data
- **WHEN** the user attempts to submit without an item, quantity or unit cost
- **THEN** the invalid fields are identified inline and no request is sent

#### Scenario: Create a pending order without a supplier
- **WHEN** an authorized user leaves the supplier field unselected and submits an otherwise valid order with catalogued items
- **THEN** the order is created and displayed as pending without a supplier, using the "Sin proveedor" label instead of a blank or undefined value

### Requirement: Replenishment suggestions require review
The frontend SHALL display one backend-generated, reviewable purchase-priority list before creating a purchase order, and SHALL never calculate its priority, coverage or quantity in the browser. The backend list SHALL use confirmed sales from the previous 7 business days and current stock to return only products requiring replenishment, ordered from lowest stock coverage to highest. Every suggestion SHALL expose its product, sales in that window, current stock, estimated coverage, backend-provided rationale and suggested quantity. WHEN no supplier is selected, the frontend SHALL show the complete prioritized list. WHEN the user has selected an active supplier, the frontend SHALL scope the same list to products with any association — preferred or not — with that supplier, and SHALL show a supplier-specific empty state distinct from the general no-replenishment-needed empty state when no such product needs replenishment. The user SHALL be able to adjust a suggested quantity before adding the product to the draft.

#### Scenario: Review a suggestion
- **WHEN** the backend returns replenishment items
- **THEN** each item shows its seven-day sales, current stock, coverage, suggested quantity and backend-provided rationale before the user adds it to the order

#### Scenario: No replenishment required
- **WHEN** the backend returns no replenishment suggestion
- **THEN** the frontend shows an empty state explaining that no replenishment is currently required

#### Scenario: Supplier-free purchase priority
- **WHEN** an authorized user opens the new-order form without selecting a supplier
- **THEN** the form shows the complete backend-prioritized replenishment list ordered by lowest coverage, without requiring a preferred supplier or replenishment frequency to make a sold product eligible

#### Scenario: Seven-day coverage drives priority
- **WHEN** two products require replenishment and one has fewer estimated coverage days from its current stock and seven-day sales
- **THEN** the lower-coverage product appears first in the list

#### Scenario: Suggested quantity can be adjusted
- **WHEN** the user changes a suggestion's quantity before adding it to the draft
- **THEN** the adjusted quantity is used for that draft item and the frontend does not recalculate the backend recommendation

#### Scenario: Suggestions scoped to the selected supplier
- **WHEN** the user selects an active supplier for the draft order
- **THEN** the displayed suggestions are limited to products with any association, preferred or not, with that supplier

#### Scenario: No suggestions for the selected supplier
- **WHEN** a supplier is selected and no product associated with it, in any way, currently needs replenishment
- **THEN** the frontend shows an empty state stating there are no suggestions for that supplier, distinct from the general no-replenishment-needed empty state

### Requirement: Purchasing hub prioritizes pending orders
The frontend SHALL provide `/purchasing` as the shared operational hub for Admin, Inventory and Receiving. At desktop width it SHALL divide the main content vertically into a pending-order region occupying four fifths of the available width and an action panel occupying one fifth; below the desktop breakpoint it SHALL stack pending orders before actions. The pending region SHALL request only `PENDING` purchase orders, support backend filters by supplier and date range, and link each order to its detail. A pending order without a supplier SHALL be identified with the "Sin proveedor" label instead of a blank or undefined value.

#### Scenario: Pending orders dominate the hub
- **WHEN** an authorized user opens `/purchasing` at desktop width
- **THEN** pending orders occupy the dominant four-fifths region and the action panel occupies the remaining fifth

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** pending orders appear before the action panel and no page-level horizontal overflow is required

#### Scenario: Pending-order filters
- **WHEN** the user changes supplier or date filters in the pending-order region
- **THEN** the frontend sends the supported query values with `status=PENDING`, resets pagination to the first page, and distinguishes no filtered results from no pending orders

#### Scenario: Pending order without a supplier
- **WHEN** the pending-order region lists an order created without a supplier
- **THEN** the order row shows the "Sin proveedor" label instead of a blank or undefined value

### Requirement: Purchase-order history is filterable and inspectable
The frontend SHALL provide a paginated purchase-order history screen for users authorized to list orders. Its table SHALL show supplier, status, order date, receiving user and total, use `formatMoney()` for total, and let the user open an order detail. It SHALL support only the verified backend filters: supplier, date range and status values `PENDING` or `RECEIVED` (plus no status filter for all results); it SHALL not present an unsupported cancelled-status or global-text-search filter. A historical order without a supplier SHALL be identified with the "Sin proveedor" label instead of a blank or undefined value, and a supplier-specific filter naturally SHALL not return orders without a supplier.

#### Scenario: View filtered history
- **WHEN** an authorized user applies a supplier, date range or supported status filter
- **THEN** the frontend requests the server-paginated history with those filters and returns to page one

#### Scenario: Inspect a historical order
- **WHEN** the user activates a history row by pointer, Enter or Space
- **THEN** the order detail opens and preserves access to its backend-authorized actions

#### Scenario: Historical order without a supplier
- **WHEN** the history table lists an order created without a supplier
- **THEN** the row shows the "Sin proveedor" label instead of a blank or undefined value

### Requirement: Purchase-order detail exposes backend item audit fields
The frontend SHALL show purchase-order items using backend-provided requested and received quantities, non-delivery reason, free-text description and removal fields. It SHALL label an uncatalogued free-text item as pending catalog registration and a removed item as removed with its reason; it SHALL not manufacture a generic item-status field in the browser. The order detail header SHALL identify an order without a supplier with the "Sin proveedor" label instead of a blank or undefined value, and reception SHALL remain unaffected by the absence of a supplier.

#### Scenario: Added or rejected item is traceable
- **WHEN** an order detail contains a free-text item or an item removed with a reason
- **THEN** the item is visibly labelled pending catalog registration or removed, respectively, and the supplied reason remains visible

#### Scenario: Order detail without a supplier
- **WHEN** the user opens the detail of an order created without a supplier
- **THEN** the detail header shows the "Sin proveedor" label instead of a blank or undefined value

#### Scenario: Receiving an order without a supplier
- **WHEN** an authorized user receives a pending order that has no supplier
- **THEN** the reception flow behaves the same as for an order with a supplier, without requiring a supplier association
