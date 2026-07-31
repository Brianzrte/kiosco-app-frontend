## MODIFIED Requirements

### Requirement: Stock view per product
The frontend SHALL show current stock from the inventory endpoints, displaying quantity, minimum quantity, and last update. Low-stock status SHALL be taken from the backend and SHALL NOT be derived in the client. The list SHALL visually distinguish three states — not initialised, initialised at zero, and below minimum — using text, never colour alone. Pagination SHALL use the backend's `page` parameter.

Below the `md` breakpoint, the name/SKU/barcode search input and the "Stock bajo" toggle SHALL remain directly visible; the category filter SHALL collapse into the shared collapsible filter group. The search input and the category filter SHALL always stack vertically below `md`, regardless of the collapsed state, so neither control's placeholder or value is cut off by sharing a row with the other.

#### Scenario: Stock displayed
- **WHEN** the inventory screen loads a product's stock
- **THEN** quantity, minimum quantity, and updated-at are shown

#### Scenario: Low stock highlighted
- **WHEN** a product is reported low on stock by the backend
- **THEN** it is highlighted with the Warning color and an accompanying text label

#### Scenario: Uninitialised is distinct from zero
- **WHEN** a product has no stock record and another has quantity zero
- **THEN** the first reads as not initialised and offers initialisation, and the second reads as zero and offers adjustment

#### Scenario: Threshold rule is never reimplemented
- **WHEN** the stock list renders
- **THEN** no client-side comparison between quantity and minimum quantity determines what is shown as low stock

#### Scenario: Pagination advances
- **WHEN** the user moves to the next page of the stock list
- **THEN** the request sends the `page` parameter and different rows are returned

#### Scenario: High-frequency controls stay visible on mobile
- **WHEN** the inventory screen is viewed below the `md` breakpoint
- **THEN** the search input and the "Stock bajo" toggle remain visible without expanding any collapsed group, and the category filter is reachable inside the collapsible group

#### Scenario: Search and category filter never share a row on mobile
- **WHEN** the inventory screen is viewed below the `md` breakpoint
- **THEN** the search input and the category filter are stacked vertically, and neither control's placeholder text is cut off

### Requirement: Stock movement history
The frontend SHALL show stock movement history from `GET /api/v1/inventory/movements`, within the inventory section and reachable from a product's row with that product pre-filtered. Each movement SHALL display the quantity transition from previous to new value, the type, the reason, the acting user's name, and the timestamp. Filters for product, movement type, and date range SHALL be available, with type selectable only from the defined values. Results SHALL be paginated.

The movement history SHALL open inside the same managed dialog primitive used for stock adjustment ("Ajustar"/"Inicializar" on this same screen), not as content injected into the normal document flow. Opening it SHALL trap focus inside the dialog, move initial focus into it, and closing it (by its close control, `Escape`, or the backdrop) SHALL return focus to the control that opened it. Below the `md` breakpoint, each movement SHALL render as a card instead of a table row, showing at minimum the product, the quantity transition, the type, and the timestamp, without requiring horizontal scrolling.

#### Scenario: History from a product
- **WHEN** the user opens the history from a product's row
- **THEN** the history opens filtered to that product, newest first

#### Scenario: Quantity transition is legible
- **WHEN** a movement is listed
- **THEN** it shows the previous and resulting quantities as a transition, not only the delta

#### Scenario: Acting user is shown
- **WHEN** a movement is listed
- **THEN** the name of the user who performed it is displayed

#### Scenario: Type filter is a closed list
- **WHEN** the type filter is rendered
- **THEN** only the defined movement types are selectable and no free text is accepted

#### Scenario: Empty history
- **WHEN** no movements match the filters
- **THEN** an empty state explains that no movements match, without implying an error

#### Scenario: History opens as a managed dialog
- **WHEN** the user activates the history action from a product's row
- **THEN** the history opens inside a modal dialog with a visible overlay, not injected below the point of the click with no visual change

#### Scenario: Focus is trapped and returned
- **WHEN** the history dialog is open
- **THEN** keyboard focus stays within the dialog, and closing it by its close control, `Escape`, or the backdrop returns focus to the control that opened it

#### Scenario: Mobile history renders cards
- **WHEN** the history dialog is viewed below the `md` breakpoint
- **THEN** each movement renders as a card showing product, quantity transition, type, and timestamp, without a horizontally scrolling table
