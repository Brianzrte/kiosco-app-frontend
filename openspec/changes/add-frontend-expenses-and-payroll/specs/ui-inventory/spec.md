## MODIFIED Requirements

### Requirement: Stock movement history
The frontend SHALL show stock movement history from `GET /api/v1/inventory/movements`, within the inventory section and reachable from a product's row with that product pre-filtered. Each movement SHALL display the quantity transition from previous to new value, the type, the reason, the acting user's name, and the timestamp. For a `pesable` product, the quantity transition SHALL be shown with up to 3 decimals rather than rounded to a whole number. Filters for product, movement type, and date range SHALL be available, with type selectable only from the defined values, which SHALL include self-consumption as a value distinct from a manual outward adjustment. Results SHALL be paginated.

#### Scenario: History from a product
- **WHEN** the user opens the history from a product's row
- **THEN** the history opens filtered to that product, newest first

#### Scenario: Quantity transition is legible
- **WHEN** a movement is listed
- **THEN** it shows the previous and resulting quantities as a transition, not only the delta

#### Scenario: Weighable movement shows decimal precision
- **WHEN** a movement for a `pesable` product is listed
- **THEN** the previous and resulting quantities are shown with up to 3 decimals, not rounded to a whole number

#### Scenario: Acting user is shown
- **WHEN** a movement is listed
- **THEN** the name of the user who performed it is displayed

#### Scenario: Type filter is a closed list
- **WHEN** the type filter is rendered
- **THEN** only the defined movement types are selectable and no free text is accepted

#### Scenario: Self-consumption is distinguishable
- **WHEN** a movement originated in a self-consumption expense
- **THEN** it is listed with its own movement type, distinct from a manual outward adjustment, and can be isolated with the type filter

#### Scenario: Empty history
- **WHEN** no movements match the filters
- **THEN** an empty state explains that no movements match, without implying an error
