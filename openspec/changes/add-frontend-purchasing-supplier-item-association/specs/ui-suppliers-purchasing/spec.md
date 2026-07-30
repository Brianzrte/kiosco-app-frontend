## MODIFIED Requirements

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
