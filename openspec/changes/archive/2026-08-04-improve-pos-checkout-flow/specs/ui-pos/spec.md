## MODIFIED Requirements

### Requirement: Barcode resolves to a product
Submitting a barcode SHALL call `GET /api/v1/products/barcode/{barcode}`. A found active product with `unit_type` `unitario` SHALL be added to the cart at its current price with quantity 1; scanning the same product again SHALL increment its quantity. A found active product with `unit_type` `pesable` SHALL always be represented as a single cart line with an editable weight field, whether it is being added for the first time or scanned again: if no line for it exists yet, a new line SHALL be added immediately with an empty weight and its weight input SHALL receive focus; if a line already exists, that same line's weight input SHALL receive focus. No separate panel outside the cart SHALL be shown for entering a weighable product's weight. A weighable line with no weight entered, or a weight of zero, SHALL contribute nothing to the running total and SHALL NOT be sent to the backend on confirmation.

#### Scenario: Known product scanned
- **WHEN** a barcode matching an active `unitario` product is submitted
- **THEN** the product appears in the cart with quantity 1 and its current unit price

#### Scenario: Repeated scan increments quantity
- **WHEN** a barcode already in the cart for a `unitario` product is scanned again
- **THEN** that line's quantity increments by 1

#### Scenario: Unknown barcode
- **WHEN** a barcode matches no product
- **THEN** an inline error is shown, nothing is added to the cart, and focus returns to the scan input

#### Scenario: Inactive product rejected
- **WHEN** a barcode resolves to an inactive product
- **THEN** the item is rejected with an inline error and never enters the cart

#### Scenario: Weighable product scanned
- **WHEN** a barcode resolves to an active product with `unit_type` `pesable` that has no line in the cart yet
- **THEN** a cart line for that product is added immediately with an empty weight, contributing nothing to the total, and its weight input receives focus

#### Scenario: Weighable product scanned again
- **WHEN** a `pesable` product already present in the cart is scanned again
- **THEN** its existing weight input receives focus for a new entry, rather than incrementing any value or adding a second line for the same product

#### Scenario: Weighable product without a per-kilogram price is rejected
- **WHEN** a barcode resolves to an active `pesable` product that has no valid `price_per_kg`
- **THEN** the item is rejected with an inline error, the same way an inactive product is rejected today, and never enters the cart, and no cart line is added for it

### Requirement: Cart editing
The cart SHALL allow changing a line's quantity (for `unitario` products) or weight (for `pesable` products, in kilograms with up to 3 decimals) and removing a line before confirmation. Each line's effective price SHALL be its edited real price when one was entered, or its calculated price otherwise (`unit_price × quantity` for `unitario`; `peso × price_per_kg` rounded to 2 decimals for `pesable`). The running total SHALL be the decimal-safe sum of every line's effective price (never floating point on price strings) and SHALL be displayed at all times. Each `pesable` line SHALL carry its own weight-validation error independently of every other line: an invalid weight in one line SHALL NOT be shown as an error on, or otherwise affect the displayed price of, any other line. A `pesable` line whose current weight input is invalid SHALL NOT show a calculated or effective price left over from a previously valid weight; it SHALL show that it currently has no valid subtotal until the weight becomes valid again, and SHALL be excluded from the running total while invalid. The control to enter a `pesable` line's real price SHALL be a visible field with its own label, not a control that requires activating a separate icon-only toggle to reveal, and its validation error SHALL be shown directly under that field rather than in the scan-error region.

#### Scenario: Remove a line
- **WHEN** the cashier removes a cart line
- **THEN** the line disappears and the total updates

#### Scenario: Decimal-safe total
- **WHEN** the cart contains items with prices like "12.50"
- **THEN** the displayed total is exact to two decimals with no floating-point drift

#### Scenario: Weighable line shows a calculated price and a way to correct it
- **WHEN** a `pesable` line has a weight greater than zero entered
- **THEN** the cart shows the calculated price (`peso × price_per_kg`, rounded to 2 decimals) next to a visible field to edit the real price charged

#### Scenario: Real price replaces the calculated price for the line
- **WHEN** the cashier enters a real price for a line, before the sale is confirmed
- **THEN** that amount becomes the line's effective price for the running total and the balance of payments, and the calculated price is no longer shown in the cart (it remains available afterwards in the sale's detail view)

#### Scenario: Real price validation shows next to its own field
- **WHEN** the cashier enters a real price that is not a valid decimal amount with up to two fraction digits
- **THEN** an inline error is shown directly under the real-price field for that line, and the scan-error region is not used for this validation

#### Scenario: Real price editing is unavailable after confirmation
- **WHEN** a sale has already been confirmed
- **THEN** no control on the POS or elsewhere allows editing any line's real or calculated price for that sale

#### Scenario: Weight validation happens before any request
- **WHEN** an entered weight is negative, non-numeric, or has more than 3 decimals
- **THEN** an inline error is shown in the weight control itself and no request is sent to the backend

#### Scenario: Zero or empty weight never creates a line
- **WHEN** a `pesable` product's weight field is empty or `0`
- **THEN** no effective line for that product is counted in the total or sent on confirmation

#### Scenario: An invalid weight in one line does not affect other lines
- **WHEN** the cart has two or more `pesable` lines and one of them has an invalid weight entered
- **THEN** only that line shows a weight error, and every other line's price and validation state remain unaffected

#### Scenario: Correcting an invalid weight never shows a stale subtotal
- **WHEN** a `pesable` line's weight is edited from a valid value to an invalid one and then to a new valid value
- **THEN** while the weight is invalid the line shows no calculated subtotal and is excluded from the total, and once corrected the line's subtotal reflects only the new valid weight, never the earlier valid one

## ADDED Requirements

### Requirement: Concurrent scan and search requests are serialized
While a barcode submission or a search-result selection has a request in flight (resolving the product, and any cart update that depends on it), the POS SHALL ignore a new Enter on the scan field or a new search-result selection until that request settles. A stock cap evaluated after such a request resolves SHALL be evaluated against the cart's state at the moment the stock data arrives, not against a cart snapshot captured before the request started.

#### Scenario: A second Enter during a scan in flight is ignored
- **WHEN** the cashier presses Enter on the scan field a second time while the first submission's product lookup has not yet resolved
- **THEN** no second request is sent, and only one line results from the two submissions

#### Scenario: A second search selection during a selection in flight is ignored
- **WHEN** the cashier activates a second search result while the first selection's product lookup has not yet resolved
- **THEN** no second request is sent, and only one line results from the two selections

#### Scenario: Stock cap reflects the cart at the time stock data arrives
- **WHEN** the cart changes between a stock request being sent and its response arriving
- **THEN** the stock cap is applied against the cart as it exists when the response arrives, not against an earlier snapshot

### Requirement: Stock cap is applied without delaying cart entry
Adding or incrementing a `unitario` line SHALL update the cart immediately upon resolving the product, without waiting for `GET /api/v1/inventory/stock/{product_id}` to resolve first. The stock check SHALL run in parallel; when it resolves, if the line's quantity exceeds the available stock, the quantity SHALL be capped to the available amount and a message naming the product and the available quantity SHALL be shown in the entry status region. A numeric stock result less than or equal to zero SHALL be treated as unavailable: the product SHALL not remain in the cart and the entry status region SHALL state that it has no stock available. A `404` stock result or any other stock-request failure SHALL leave availability unknown and SHALL NOT block or cap the line.

#### Scenario: Line appears before the stock check resolves
- **WHEN** a `unitario` product is scanned for the first time
- **THEN** the line appears in the cart immediately, and the stock check request is still in flight

#### Scenario: Stock cap arrives after the line is already visible
- **WHEN** the stock check for a line resolves and the line's quantity exceeds the available stock
- **THEN** the quantity is capped to the available amount and a message naming the product and the available quantity appears in the entry status region

#### Scenario: Initialized zero stock removes the optimistic line
- **WHEN** the stock check for an optimistically added product resolves with a quantity less than or equal to zero
- **THEN** its line is removed from the cart and the entry status region states that the named product has no stock available

#### Scenario: A missing stock record keeps availability unknown
- **WHEN** the stock check request for a product returns HTTP `404`, or fails with another status or transport error
- **THEN** the line is neither blocked nor capped by that failure, and no stock-limit message is shown for it

### Requirement: Manual product search marks unavailable products without allowing selection
The POS SHALL check the availability of each active manual-search result before offering it for selection. A product whose `GET /api/v1/inventory/stock/{product_id}` request resolves to a numeric quantity less than or equal to zero SHALL remain visible with a "Sin stock" badge, but SHALL NOT expose a selectable control or participate in arrow-key/Enter selection. A `404` without a stock record or another availability failure remains selectable.

#### Scenario: An exhausted product is visibly unavailable in search
- **WHEN** the manual search returns an active product and its stock lookup resolves to a quantity less than or equal to zero
- **THEN** that product remains visible with a "Sin stock" badge and cannot be selected by pointer, arrows, or Enter

#### Scenario: A missing or failed availability lookup does not hide a search result
- **WHEN** a manual-search result's stock lookup returns HTTP `404`, fails with another status, or has a transport error
- **THEN** the product remains visible and selectable, with availability treated as unknown

### MODIFIED Requirement: Weighable products are checked against stock
The POS SHALL query and cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`. When the product has an initialized stock record, adding or increasing its weight beyond the available quantity SHALL be blocked with an inline message naming the product and available quantity in kilograms. When the lookup resolves to a numeric quantity less than or equal to zero, the product SHALL not remain in the cart and the entry status region SHALL name the product and state that it has no stock available. A `404` without a stock record or any other lookup failure leaves availability unknown and SHALL NOT block the line client-side.

#### Scenario: A weighable product with zero stock is removed
- **WHEN** the stock lookup for a weighable product resolves to a quantity less than or equal to zero
- **THEN** the product's cart line is removed and the entry status region states that the named product has no stock available

### Requirement: Entry status region shows one prioritized message without reflow
The area beneath the scan and search inputs SHALL reserve the height of a one-line message even when it has no text, so showing or clearing a message does not change the layout position of the cart or other POS regions. It SHALL show at most one message at a time, chosen by this priority from highest to lowest: an unknown-barcode error, an inactive-product error, a stock-limit message, a search-catalog loading error, then a search-status message (searching, or no match). A lower-priority message SHALL NOT be shown while a higher-priority one is active.

#### Scenario: Unknown barcode outranks a stale search message
- **WHEN** an unknown-barcode error and a search-status message are both pending at once
- **THEN** only the unknown-barcode error is shown

#### Scenario: Stock-limit message outranks the search catalog error
- **WHEN** a stock-limit message and a search-catalog loading error are both pending at once
- **THEN** only the stock-limit message is shown

#### Scenario: Showing or clearing an entry message preserves the cart position
- **WHEN** the entry status region changes between empty and a one-line search or barcode message
- **THEN** the cart and other POS regions remain in the same layout position

### Requirement: Checkout status region shows one prioritized message
The area between the payment block and the confirm action SHALL show at most one message at a time, chosen by this priority from highest to lowest: an unknown-network-state warning, a confirmation error, a pending payment-balance message, a confirmation-blocked reason, then a settled "Pago cerrado" message. A confirmation-blocked reason caused by a specific cart line (an invalid weight or a stock limit) SHALL name that line's product. A lower-priority message SHALL NOT be shown while a higher-priority one is active.

#### Scenario: Unknown network state outranks a confirmation error
- **WHEN** an unknown-network-state warning and a leftover confirmation error are both pending at once
- **THEN** only the unknown-network-state warning is shown

#### Scenario: Confirmation error outranks a pending balance message
- **WHEN** a confirmation error and a pending payment-balance message are both applicable at once
- **THEN** only the confirmation error is shown

#### Scenario: Blocked reason names the affected line
- **WHEN** confirmation is blocked because a specific cart line has an invalid weight
- **THEN** the shown reason names that line's product, not a generic "hay un error" message

### Requirement: Confirmation error is announced and offers a matching recovery action
A confirmation error SHALL be rendered with `role="alert"`. When the error means the session lacks permission (HTTP 403), the checkout status region SHALL offer a "Volver" action that returns to the previous screen. Any other confirmation error SHALL offer a "Reintentar" action that re-attempts confirmation using the sale already created, per the duplicate-draft guard below.

#### Scenario: Confirmation error is announced
- **WHEN** confirming a sale fails and a confirmation error is shown
- **THEN** it is rendered with `role="alert"`

#### Scenario: Forbidden confirmation offers to go back
- **WHEN** confirmation fails with a 403 response
- **THEN** the checkout status region offers a "Volver" action instead of "Reintentar"

#### Scenario: Any other confirmation error offers to retry
- **WHEN** confirmation fails for any reason other than a 403 response
- **THEN** the checkout status region offers a "Reintentar" action

### Requirement: Retrying confirmation never duplicates the sale draft
Once `POST /api/v1/sales` has returned an `id` for the sale being confirmed, any later step of that same confirmation attempt or a subsequent retry (adding items, setting payment, or confirming) SHALL reuse that same `id` instead of creating a new sale. A new `POST /api/v1/sales` call SHALL only happen for a sale that has not yet been created.

#### Scenario: Retry after a failed payment step reuses the created sale
- **WHEN** confirmation fails after the sale and its items were created but before payment was set, and the cashier retries
- **THEN** the retry reuses the same sale `id` and does not call `POST /api/v1/sales` again

#### Scenario: A confirmation attempt that never created a sale starts one on retry
- **WHEN** confirmation fails before `POST /api/v1/sales` ever returned an `id`, and the cashier retries
- **THEN** the retry calls `POST /api/v1/sales` to create the sale, exactly as a first attempt would

### Requirement: Cash payment method is preselected once the cart holds items
The first time the cart goes from empty to holding at least one line during a sale, and no payment method has been chosen yet, "Efectivo" SHALL be selected automatically. The cashier MAY change it afterward; split-payment behavior is unaffected.

#### Scenario: Efectivo is preselected on the first item added
- **WHEN** the cart goes from empty to one line and no payment method was previously chosen
- **THEN** "Efectivo" becomes the selected payment method

#### Scenario: An explicit choice is not overridden
- **WHEN** the cashier has already chosen or changed the payment method for the current sale
- **THEN** adding or removing cart lines does not change the selected method back to "Efectivo"

### Requirement: Cash-tendered field is always visible and uses the total's visual weight
Whenever the payment includes a cash (Efectivo) component — the simple payment method or a cash tramo of a split payment — the cash-tendered field and its resulting change owed SHALL be shown directly, without requiring an action to reveal them first, and SHALL be displayed with a typographic hierarchy comparable to the sale total's, not a smaller secondary-text treatment. When the payment does not include a cash component, the cash-tendered field SHALL NOT be shown.

#### Scenario: Change is shown at a size comparable to the total
- **WHEN** the cashier enters a cash-tendered amount and a change owed is displayed
- **THEN** the tendered field and the change readout use a size and weight comparable to the total display, not a small secondary-text style

#### Scenario: Cash-tendered field is visible without a reveal action
- **WHEN** the selected payment includes a cash component
- **THEN** the cash-tendered field is shown immediately, with no button or other action required to reveal it

#### Scenario: Cash-tendered field is hidden when payment has no cash component
- **WHEN** the selected payment method is Tarjeta or Transferencia, or a split payment with no Efectivo tramo
- **THEN** the cash-tendered field and change readout are not shown

### Requirement: Cart summary shows lines and real quantity sold
The cart summary next to the total SHALL show the number of cart lines and, separately, the total number of units for `unitario` lines when at least one exists, and the total weight in kilograms for `pesable` lines when at least one exists. It SHALL NOT reduce this summary to only the number of lines when the cart mixes quantities greater than one line count, or contains any weighed product.

#### Scenario: Multiple units of one product show the real unit count
- **WHEN** the cart has a single `unitario` line with quantity 3
- **THEN** the summary shows 1 line and 3 units, not just "1 producto"

#### Scenario: A weighable line shows its weight in the summary
- **WHEN** the cart contains a `pesable` line with a weight entered
- **THEN** the summary includes the total weight in kilograms for weighed lines, shown separately from the unit count

### Requirement: Cart lines are keyboard-navigable as a group
Each cart line SHALL expose a group role with an accessible name identifying its product, without removing or renaming the accessible names of its individual controls (quantity increment/decrement, weight, real price, remove). This grouping SHALL NOT reduce the line to a single tab stop: every control that is currently interactive within the line SHALL remain individually reachable and operable by keyboard.

#### Scenario: A line is announced as a named group
- **WHEN** a screen reader reaches a cart line
- **THEN** it announces the line as a group named after its product

#### Scenario: Every control inside a line stays reachable
- **WHEN** a cashier tabs through a cart line
- **THEN** each of its interactive controls (quantity, weight, real price, remove) remains reachable and keeps its existing accessible name

### Requirement: Search results do not reflow the POS
The search-results dropdown SHALL be displayed as an overlay anchored to the search field and SHALL NOT change the layout position of the cart or other POS regions at any viewport width. Its existing keyboard behavior (ArrowUp/ArrowDown to move the active result, Enter to select, Escape to dismiss) and combobox semantics (`role="combobox"`, `role="option"`, `aria-expanded`, `aria-activedescendant`) SHALL be unchanged.

#### Scenario: Dropdown preserves the cart position on a narrow viewport
- **WHEN** the cashier opens the search dropdown on a narrow viewport
- **THEN** the cart and the rest of the POS remain in the same layout position they had before it opened

#### Scenario: Dropdown keyboard behavior is unchanged
- **WHEN** the cashier uses ArrowUp, ArrowDown, Enter, or Escape while the dropdown is open
- **THEN** it behaves exactly as it did before this requirement changed

### Requirement: Cart list scrolls within its own container
When the cart's line list grows taller than the space available to it, the list SHALL scroll within its own container instead of pushing the rest of the screen down. Adding or incrementing a line SHALL bring that line into view within the cart's own scroll container.

#### Scenario: A long cart scrolls internally
- **WHEN** the cart has more lines than fit in the available height
- **THEN** the line list scrolls within its own container and the rest of the screen layout does not shift

#### Scenario: Adding a line scrolls it into view
- **WHEN** a new line is added or an existing line is incremented while the cart list is scrolled away from it
- **THEN** the affected line is brought into view within the cart's own scroll container

### Requirement: Cart can be cleared entirely
A visible action SHALL let the cashier clear every line in the cart at once. Activating it SHALL open a confirmation dialog naming the number of products that will be removed and stating that any unconfirmed line edits (weight or real price) will also be discarded and that the action cannot be undone. Confirming SHALL empty the cart, reset the selected payment method and any split-payment or cash-tendered state, and return focus to the scan input. Canceling (by its own control, Escape, or the dialog's backdrop) SHALL leave the cart unchanged and return focus to the action that opened the dialog. Removing a single line SHALL continue to require no confirmation dialog.

#### Scenario: Clearing the cart requires confirmation
- **WHEN** the cashier activates "Vaciar carrito" with a non-empty cart
- **THEN** a confirmation dialog opens naming the number of products that will be removed

#### Scenario: Confirming clears everything and returns focus to scanning
- **WHEN** the cashier confirms the clear-cart dialog
- **THEN** the cart, selected payment method, and any split-payment or cash-tendered state are all reset, and focus returns to the scan input

#### Scenario: Canceling leaves the cart untouched
- **WHEN** the cashier cancels the clear-cart dialog by any dismissal method
- **THEN** the cart is unchanged and focus returns to the action that opened the dialog

#### Scenario: A single line removal still has no dialog
- **WHEN** the cashier removes only one cart line
- **THEN** no confirmation dialog is shown, unchanged from before this requirement

### Requirement: Keyboard shortcuts for checkout actions
The POS SHALL offer keyboard shortcuts, none of which is a single unmodified letter key, for: confirming the sale (`F9`), focusing the search-by-name field (`F3`), focusing "Efectivo entregado" (`F4`), opening "Vaciar carrito" (`F8`), and selecting each payment method — Efectivo (`Alt+1`), Tarjeta (`Alt+2`), Transferencia (`Alt+3`). Each shortcut SHALL be shown as visible text next to the control it activates, not only in a tooltip or `title` attribute. A shortcut SHALL NOT fire while focus is inside a text field that uses that same key combination for its own native purpose.

#### Scenario: Each shortcut is visibly labeled
- **WHEN** the cashier views the confirm button, the search field, the cash-tendered control, "Vaciar carrito", or a payment-method option
- **THEN** its shortcut is shown as visible text next to it

#### Scenario: F9 confirms the sale
- **WHEN** the cashier presses `F9` and confirmation is not disabled
- **THEN** the sale confirmation is triggered exactly as clicking "Confirmar venta" would

#### Scenario: Alt+1/2/3 select a payment method
- **WHEN** the cashier presses `Alt+1`, `Alt+2`, or `Alt+3`
- **THEN** Efectivo, Tarjeta, or Transferencia respectively becomes the selected payment method

### Requirement: Cart and payment method persist across a refresh
The current cart (including each line's weight and any edited real price) and the selected single payment method SHALL be saved to `sessionStorage` as they change, and restored when the POS screen is loaded again in the same browser tab. Split-payment composition and any entered cash-tendered amount SHALL NOT be persisted or restored. The saved cart and payment method SHALL be cleared when a sale is confirmed successfully and when the cart is cleared via "Vaciar carrito". A restored cart SHALL NOT be blocked from being added to or confirmed because a restored product may have since changed price or become inactive; the backend remains the authority at add and confirm time, the same as it already is for unknown stock.

#### Scenario: A refresh restores the cart and payment method
- **WHEN** the cashier reloads the POS tab with a non-empty cart and a selected payment method
- **THEN** the cart and the payment method are restored as they were before the reload

#### Scenario: Split payment and cash-tendered are not restored
- **WHEN** the cashier reloads the POS tab after starting a split payment or entering a cash-tendered amount
- **THEN** the cart and base payment method are restored, but the split composition and the cash-tendered amount are not

#### Scenario: A successful confirmation clears the saved cart
- **WHEN** a sale is confirmed successfully
- **THEN** the saved cart and payment method are cleared from `sessionStorage`

#### Scenario: Clearing the cart clears the saved state too
- **WHEN** the cashier confirms the clear-cart dialog
- **THEN** the saved cart and payment method are cleared from `sessionStorage`

#### Scenario: A restored line with a stale price is not blocked client-side
- **WHEN** a restored cart line's product has since changed price or become inactive
- **THEN** the POS does not preemptively block adding to or confirming that line on the client; the backend's response at add or confirm time remains authoritative

### Requirement: Last confirmed sale remains visible after the confirmation panel closes
Once a sale is confirmed successfully during the current POS session, the checkout column SHALL show a persistent reference to it — the sale number, its total, and a link to the sale's detail view — separate from the confirmation panel. This reference SHALL remain visible after the confirmation panel is dismissed, whether by the cashier or by its automatic timeout, and SHALL be replaced by the next confirmed sale's reference rather than accumulating a history.

#### Scenario: No reference is shown before any sale has been confirmed
- **WHEN** the cashier has not yet confirmed any sale in the current session
- **THEN** no "last confirmed sale" reference is shown in the checkout column

#### Scenario: The reference survives the confirmation panel's automatic dismissal
- **WHEN** a sale is confirmed and the confirmation panel later auto-dismisses
- **THEN** the checkout column still shows the reference to that confirmed sale

#### Scenario: A later confirmed sale replaces the earlier reference
- **WHEN** the cashier confirms a second sale after a first one already produced a reference
- **THEN** the checkout column shows the second sale's number, total, and link, not the first's
