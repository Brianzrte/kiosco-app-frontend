## MODIFIED Requirements

### Requirement: Sale detail view
The frontend SHALL provide a dedicated detail view for a single sale, reached by activating its row in the operational list. The view SHALL show every item (product name, quantity or weight, unit price or calculated/real price, subtotal) and every payment (method and amount) from `GET /api/v1/sales/{id}`, plus its status, sale number (or dash), and the relevant date. Access is scoped exactly like the list: an Admin may open any sale; a cashier may open only their own. The detail view SHALL be read-only regarding the sale itself — no control on this screen edits items, quantities, weights, real prices, or payments of a confirmed sale. For an item whose real price differs from its calculated price, the view SHALL show the calculated price struck through in red using a semantic strike (e.g. `<s>`), accompanied by non-color-only confirmation (text or an accessible label) that it was replaced, next to the real price that is the one counted in the item's subtotal and in the sale's total. For an item with no real-price correction — a `unitario` item, or a `pesable` item whose real price was never edited — only the current price is shown, without any strikethrough, exactly as today.

#### Scenario: Admin opens a sale's detail
- **WHEN** an Admin activates a row in the sales list
- **THEN** the detail view shows that sale's items, payments, status, and number

#### Scenario: Cashier opens their own sale's detail
- **WHEN** a cashier activates a row in their own sales list
- **THEN** the detail view loads normally

#### Scenario: Direct navigation respects the same scope as the list
- **WHEN** a cashier navigates directly to the detail URL of a sale that is not theirs
- **THEN** the backend rejects the request and the frontend shows the resulting error, never a client-side ownership check that only hides the row

#### Scenario: Detail view never mutates the sale
- **WHEN** viewing a confirmed sale's detail
- **THEN** no control on the screen changes its items, quantities, weights, real prices, or payments

#### Scenario: Corrected weighable item shows both prices
- **WHEN** a sale item has a real price different from its calculated price
- **THEN** the calculated price is shown struck through in red with a non-color-only indication that it was replaced, and the real price is shown alongside it as the one reflected in the item's subtotal and the sale's total

#### Scenario: Uncorrected item shows only its price
- **WHEN** a sale item is `unitario`, or is `pesable` but its real price was never edited
- **THEN** only its current price is shown, with no strikethrough

#### Scenario: Weighable item shows weight instead of an integer quantity
- **WHEN** a sale item corresponds to a `pesable` product
- **THEN** its quantity column shows the weighed amount in kilograms instead of an integer unit count
