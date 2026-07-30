## MODIFIED Requirements

### Requirement: Replenishment suggestions require review
The frontend SHALL display backend-generated replenishment suggestions that account for current stock, sales volume, replenishment frequency and product–supplier relationships. It SHALL let an authorized user review and adjust a suggestion before creating a purchase order, and SHALL never calculate the suggestion or create an order automatically in the browser. WHEN no supplier is selected for the draft order, the frontend SHALL split the suggestions into two distinct sections — products with a positive suggested quantity ("Bajos de stock") and products with incomplete planning data, identified by a null suggested quantity ("Datos de planificación incompletos") — instead of a single undifferentiated list, and SHALL show each section's own empty message when that section has no items.

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

### Requirement: Manual purchase-order creation
The frontend SHALL let Admin and Inventory create a pending purchase order using an active supplier, an order date and one or more catalogued products with quantities and unit costs. The displayed order total SHALL come from the backend response and monetary values SHALL be decimal strings formatted with `formatMoney()`. WHEN a supplier is selected for the draft order and the user chooses or changes the product of an item to a product with no active association (preferred or not) with that supplier, the frontend SHALL show an inline warning offering to associate the product with the supplier, without leaving the form or discarding items already entered.

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
