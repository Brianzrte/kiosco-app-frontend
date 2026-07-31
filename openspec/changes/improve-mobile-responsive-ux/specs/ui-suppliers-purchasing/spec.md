## MODIFIED Requirements

### Requirement: Purchasing hub prioritizes pending orders
The frontend SHALL provide `/purchasing` as the shared operational hub for Admin, Inventory and Receiving. At desktop width it SHALL divide the main content vertically into a pending-order region occupying four fifths of the available width and an action panel occupying one fifth; below the desktop breakpoint it SHALL stack pending orders before actions. The pending region SHALL request only `PENDING` purchase orders, support backend filters by supplier and date range, and link each order to its detail.

Below the `md` breakpoint, the action panel (including "Crear pedido") SHALL appear before the pending-order list, so the primary action is reachable without scrolling past filters and up to a full page of pending-order cards. This does not change the four-fifths/one-fifth desktop layout, which is unaffected by this requirement below `md`.

#### Scenario: Pending orders dominate the hub
- **WHEN** an authorized user opens `/purchasing` at desktop width
- **THEN** pending orders occupy the dominant four-fifths region and the action panel occupies the remaining fifth

#### Scenario: Responsive hub
- **WHEN** the hub is used below the desktop breakpoint
- **THEN** pending orders appear before the action panel and no page-level horizontal overflow is required

#### Scenario: Pending-order filters
- **WHEN** the user changes supplier or date filters in the pending-order region
- **THEN** the frontend sends the supported query values with `status=PENDING`, resets pagination to the first page, and distinguishes no filtered results from no pending orders

#### Scenario: Primary action precedes the list on mobile
- **WHEN** an authorized user with access to "Crear pedido" opens `/purchasing` below the `md` breakpoint
- **THEN** the action panel appears before the pending-order list, not after it

### Requirement: Purchase-order history is filterable and inspectable
The frontend SHALL provide a paginated purchase-order history screen for users authorized to list orders. Its table SHALL show supplier, status, order date, receiving user and total, use `formatMoney()` for total, and let the user open an order detail. It SHALL support only the verified backend filters: supplier, date range and status values `PENDING` or `RECEIVED` (plus no status filter for all results); it SHALL not present an unsupported cancelled-status or global-text-search filter.

Below the `md` breakpoint, the table SHALL be replaced by one card per order, each showing at minimum the supplier, status, order date, and total, without requiring horizontal scrolling. The supplier, date-range and status filters SHALL collapse into the shared collapsible filter group.

#### Scenario: View filtered history
- **WHEN** an authorized user applies a supplier, date range or supported status filter
- **THEN** the frontend requests the server-paginated history with those filters and returns to page one

#### Scenario: Inspect a historical order
- **WHEN** the user activates a history row by pointer, Enter or Space
- **THEN** the order detail opens and preserves access to its backend-authorized actions

#### Scenario: Mobile history renders cards
- **WHEN** the history screen is viewed below the `md` breakpoint
- **THEN** each order renders as a card showing supplier, status, order date and total, without a horizontally scrolling table

#### Scenario: Filters are collapsed by default on mobile
- **WHEN** the history screen is viewed below the `md` breakpoint
- **THEN** the supplier, date-range and status filters are reachable inside a collapsed group, not expanded by default

### Requirement: Supplier management preserves history
The frontend SHALL let authorized users create, edit and deactivate suppliers, showing inactive suppliers in historical purchase data but excluding them from new-order choices. It SHALL not offer permanent deletion.

The supplier list SHALL paginate its render — a fixed number of suppliers per page with page navigation, matching the visual pattern already used by the purchasing history list — instead of rendering every supplier inside a single scrolling container. This applies to the render only: the frontend still requests the full supplier list in one response, because the backend endpoint accepts no pagination parameters; what changes is how many suppliers are mounted in the DOM and scrollable at once, removing the nested page-scroll-inside-container pattern this replaces.

#### Scenario: Create supplier
- **WHEN** an authorized user submits a valid new supplier
- **THEN** the supplier appears as active and can be selected for a new purchase order

#### Scenario: Deactivate supplier
- **WHEN** an authorized user confirms deactivation of a supplier
- **THEN** the supplier remains visible in historical orders and reports but is unavailable for new orders

#### Scenario: Duplicate or invalid supplier
- **WHEN** the backend rejects supplier creation or editing
- **THEN** its message is shown inline and the entered values remain available for correction

#### Scenario: Supplier list paginates its render
- **WHEN** the supplier list contains more suppliers than fit on one page
- **THEN** the list shows a bounded number of suppliers at a time with page navigation, instead of a single container scrolling internally over the full list

### Requirement: Replenishment suggestions require review
The frontend SHALL display backend-generated replenishment suggestions that account for current stock, sales volume, replenishment frequency and product–supplier relationships. It SHALL let an authorized user review and adjust a suggestion before creating a purchase order, and SHALL never calculate the suggestion or create an order automatically in the browser.

When the backend reports products with incomplete planning data, that list SHALL paginate or otherwise bound its render (for example, loading further items on demand) instead of mounting every interactive row — its checkbox and "Agregar al pedido" action — at once, so a large incomplete-data set does not mount thousands of interactive rows simultaneously.

#### Scenario: Review a suggestion
- **WHEN** the backend returns replenishment items
- **THEN** each item and its backend-provided rationale is visible before the user creates an order

#### Scenario: No replenishment required
- **WHEN** the backend returns no replenishment suggestion
- **THEN** the frontend shows an empty state explaining that no replenishment is currently required

#### Scenario: Planning data is incomplete
- **WHEN** the backend reports that a product lacks planning data
- **THEN** the frontend displays the backend-provided reason and does not guess a quantity or supplier

#### Scenario: Large incomplete-data list does not mount every row at once
- **WHEN** the backend reports incomplete planning data for a large number of products
- **THEN** the frontend bounds how many interactive rows are mounted at once, growing the rendered set through pagination or an explicit "load more" action rather than mounting every row simultaneously
