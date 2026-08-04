# ui-pos

## Purpose

Registro de venta: input de escaneo, carrito, método de pago, confirmación y manejo de fallos.

Fuente: `CLAUDE.md` (spec de frontend y design system) y los specs de backend en `../backend/docs/specs/`.
## Requirements
### Requirement: Scan-first sale screen
The POS screen SHALL keep keyboard focus on a scan input at all times: on page load and after every add, error, or dialog close, focus SHALL return to the scan input. Barcode readers are treated as keyboard input.

#### Scenario: Focus returns after adding an item
- **WHEN** a barcode is scanned and the item is added to the cart
- **THEN** the scan input is cleared and regains focus

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

### Requirement: Single payment method per sale
The cashier SHALL select exactly one payment method (cash or card) before confirming. Confirmation SHALL be blocked while the cart is empty or no method is selected.

#### Scenario: Confirmation blocked without payment method
- **WHEN** the cart has items but no payment method is selected
- **THEN** the confirm action is disabled

### Requirement: Atomic sale confirmation

Confirming SHALL create the sale via `POST /api/v1/sales` and confirm it via `POST /api/v1/sales/{id}/confirm`. On success the frontend SHALL show "Venta confirmada" together with the assigned `sale_number` where present, persisting until the next sale begins, without moving focus from the scan input. If the backend rejects confirmation because payments do not equal the total, the frontend SHALL show the backend message and return the cashier to the payment composition with the entered amounts preserved. On any failure the frontend SHALL NOT assume success: the cart is preserved and the backend sale status is treated as authoritative. Each cart line — whether `unitario` or `pesable` — SHALL be sent to `POST /api/v1/sales/{id}/items` with its weight or quantity and, when one was entered, its real price, exactly as composed in the cart.

The success confirmation SHALL offer "Nueva venta" alongside the existing "Ver detalle" link, and no other action. "Nueva venta" SHALL close the confirmation. Neither "Nueva venta" nor the confirmation's appearance itself SHALL move keyboard focus away from the scan input or otherwise block scanning the next barcode; auto-dismiss, dismissal by any other means, and starting the next scan SHALL all continue to close the confirmation.

#### Scenario: Successful confirmation
- **WHEN** the cashier confirms a valid sale
- **THEN** the confirmation shows "Venta confirmada" with the sale number, the cart resets, and the scan input regains focus

#### Scenario: Number survives long enough to be used
- **WHEN** the sale number is displayed after confirmation
- **THEN** the sale number remains visible until the next sale starts and can be selected with the pointer

#### Scenario: Next sale can start immediately
- **WHEN** the sale number is displayed after confirmation
- **THEN** the scan input already holds focus and the next barcode is accepted without any pointer or keyboard action

#### Scenario: Confirmation without a number
- **WHEN** the confirmed sale has no `sale_number`
- **THEN** the confirmation is shown without a number and without any placeholder or error

#### Scenario: Backend rejects unbalanced payments
- **WHEN** the backend rejects confirmation because payments do not sum to the total
- **THEN** the backend message is shown, the payment composition is reopened, and the entered amounts are preserved

#### Scenario: Confirmation rejected by backend
- **WHEN** the backend rejects confirmation (e.g. insufficient stock)
- **THEN** the backend error message is shown and the cart remains intact

#### Scenario: Network failure during confirmation
- **WHEN** the confirmation request fails with a network error
- **THEN** the frontend shows a warning that the sale state is unknown, keeps the cart, and instructs the cashier to verify before retrying

#### Scenario: Weighable line reaches the backend with its weight and real price
- **WHEN** a sale containing a `pesable` line with an edited real price is confirmed
- **THEN** the request for that line carries its weight and its real price, and the effective price used in the frontend total matches what was sent

#### Scenario: Confirmation offers a stock shortcut for the sold product
- **WHEN** a sale is confirmed successfully, regardless of the confirming session's access to the inventory screen
- **THEN** the confirmation shows only "Nueva venta" and "Ver detalle", without an action to initialize or navigate to stock

#### Scenario: "Inicializar stock" targets the last line added to the cart
- **WHEN** the confirmed sale had one or more product lines
- **THEN** the confirmation offers no action that targets a product for stock initialization or opens inventory

#### Scenario: Stock shortcut is absent without inventory access
- **WHEN** the confirming session has no access to the inventory screen
- **THEN** the confirmation still shows "Nueva venta" and "Ver detalle" only

#### Scenario: "Ahora no" behaves like the previous "Nueva venta"
- **WHEN** the cashier activates "Nueva venta"
- **THEN** the confirmation closes and the scan input is ready for the next sale

#### Scenario: The confirmation never blocks the next scan
- **WHEN** the confirmation is visible
- **THEN** keyboard focus remains available to the scan input and scanning the next barcode dismisses the confirmation the same way it always has

### Requirement: Cart feedback on scan
When an item is added to the cart or an existing line's quantity is incremented, the affected line SHALL be highlighted in place for `--motion-base` and the running total SHALL be visually acknowledged. The line SHALL NOT slide, enter from offscreen, or otherwise displace surrounding rows, and the total SHALL NOT animate as a progressive numeric count. The feedback SHALL NOT alter scan focus behaviour or delay readiness for the next scan.

#### Scenario: Added line is acknowledged in place
- **WHEN** a scanned product is added to the cart
- **THEN** its row is briefly highlighted without moving, and no other row shifts position

#### Scenario: Rapid consecutive scans stay legible
- **WHEN** several barcodes are scanned in rapid succession
- **THEN** each addition is acknowledged without rows displacing each other, and the list remains readable throughout

#### Scenario: Feedback does not gate the next scan
- **WHEN** the highlight animation is still running
- **THEN** the scan input already holds focus and accepts the next barcode

#### Scenario: Colour is not the only confirmation
- **WHEN** a repeated scan increments an existing line
- **THEN** the displayed quantity changes value, independently of the highlight

#### Scenario: Reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the line still receives a brief colour acknowledgement and nothing translates or scales

### Requirement: Payment balance is resolved before confirming
The frontend SHALL continuously display the difference between the composed payments and the sale total, distinguishing short, over, and exact states, and SHALL disable confirmation until the payments equal the total exactly. When the cart changes after payments were composed, the difference SHALL be recomputed and surfaced at the moment of the change rather than at confirmation. A single-method payment SHALL be re-imputed to the new total automatically; a split payment SHALL require the cashier to resolve the difference.

#### Scenario: Short payment blocks confirmation
- **WHEN** the composed payments sum to less than the total
- **THEN** the shortfall is displayed and the confirm action is disabled

#### Scenario: Exact payment enables confirmation
- **WHEN** the composed payments equal the total exactly
- **THEN** the balance reads as settled and confirmation is enabled

#### Scenario: Adding an item after paying, single method
- **WHEN** an item is added after a single-method payment was composed
- **THEN** that payment is re-imputed to the new total without cashier intervention

#### Scenario: Adding an item after paying, split payment
- **WHEN** an item is added after a split payment was composed
- **THEN** the resulting difference is shown immediately and confirmation is disabled until the cashier resolves it

### Requirement: Change is displayed, never persisted
The frontend MAY accept a locally entered cash-tendered amount solely to display the change owed. That amount SHALL NOT be sent to the backend and SHALL NOT alter the amount imputed to any payment method.

#### Scenario: Change shown
- **WHEN** the cashier enters an amount tendered greater than the cash payment
- **THEN** the change owed is displayed

#### Scenario: Tendered amount never reaches the backend
- **WHEN** the sale is confirmed after entering a tendered amount
- **THEN** the payment sent for that method is the imputed amount, not the tendered amount

### Requirement: Payment-method selector has method-specific visual feedback
The POS payment-method selector SHALL preserve its existing radio-button selection behavior while showing Efectivo, Tarjeta, and Transferencia with the selector's original secondary text and border treatment in their unselected resting state. When an unselected option is hovered, its full surface SHALL use a low-opacity version of the method-specific light accent and its outer border SHALL use the full-strength accent while text and icon retain the secondary treatment. When selected, an option SHALL use that method's light accent for its background and border, with black icon and text. The keyboard focus indicator SHALL remain visually distinct from hover and selected states, and text and icon SHALL continue to identify the payment method without color alone.

#### Scenario: Resting payment options identify their method
- **WHEN** the POS shows the three payment options before one is selected
- **THEN** each option displays its original secondary text and border treatment alongside its visible label and icon

#### Scenario: Hover mirrors the summary-card accent format
- **WHEN** a pointer hovers an unselected payment option
- **THEN** its full surface uses a soft version of the corresponding accent and the option border uses the full-strength accent without changing the radio selection

#### Scenario: Keyboard focus remains distinct
- **WHEN** a payment option receives keyboard focus
- **THEN** its visible focus indicator remains present and distinguishable from both hover and selected states

#### Scenario: Selected option inverts to its pastel treatment
- **WHEN** the cashier selects a payment option
- **THEN** that option displays its method-specific light accent as background and border while its text and icon remain black

#### Scenario: Payment method is understandable without color
- **WHEN** payment-option colors are unavailable or viewed in grayscale
- **THEN** the visible text label and icon continue to identify Efectivo, Tarjeta, and Transferencia

### Requirement: Weighable products are checked against stock

The POS SHALL query and cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`, using the same rule already applied to a `unitario` product: when the product has an initialized stock record, adding or increasing its weight beyond the available quantity SHALL be blocked with an inline message naming the product and the available quantity in kilograms; when the product has no stock record yet (unknown availability), adding or increasing its weight SHALL never be blocked by this client-side check, exactly as an unknown-stock `unitario` product is not blocked today.

#### Scenario: Weighable product with initialized stock is checked
- **WHEN** a `pesable` product with an initialized stock record is added to the cart, or its weight is increased
- **THEN** a request to `GET /api/v1/inventory/stock/{product_id}` is issued (once per product, cached for the rest of the session like it already is for `unitario`) and the requested weight is compared against the available quantity

#### Scenario: Weighable product is added without a stock check
- **WHEN** a `pesable` product has no stock record and is added to the cart or its weight is edited
- **THEN** the unknown availability does not block the line; it is handled by the same unknown-stock rule as a `unitario` product

#### Scenario: Weighable product exceeding available stock is blocked
- **WHEN** the weight entered or the resulting weight after an increase exceeds the available stock for that product
- **THEN** the cart line is not added or updated, and an inline message states the product name and the available quantity in kilograms (for example, `"Sólo hay 2.300 kg disponibles de "Jamón cocido"."`), following the same message pattern already used for a `unitario` product without enough stock

#### Scenario: Weighable product without a stock record is never blocked
- **WHEN** a `pesable` product has no stock record yet (the stock lookup resolves to "unknown", exactly as it does for a `unitario` product without one)
- **THEN** adding it to the cart or increasing its weight is never blocked by this client-side check, and the backend remains the authority that rejects an over-sell at confirmation time regardless

#### Scenario: Mixed cart checks stock for both line types
- **WHEN** a cart contains both `unitario` and `pesable` lines
- **THEN** stock is checked and enforced for both, using quantity for `unitario` lines and weight (kilograms) for `pesable` lines

#### Scenario: Mixed cart still checks stock for unit-based lines
- **WHEN** a cart contains both `unitario` and `pesable` products
- **THEN** stock is checked and enforced for both line types, without relaxing the existing check for `unitario` lines

### Requirement: Manual product search covers the full active catalog

The POS manual product search (by name or SKU, in the same search field used
today) SHALL query `GET /api/v1/products?q=<term>&active=true&limit=8` for
the cashier's current search term instead of filtering a locally cached,
size-limited catalog. Every active product matching the term SHALL be
findable through this search regardless of how many active products the
kiosk has, including products beyond the first 100 in alphabetical order.
The request SHALL be debounced so it fires only after the cashier pauses
typing, and SHALL NOT fire while the search term is empty. A response that
arrives for a term the cashier has since changed SHALL be discarded without
updating the displayed results or status message.

#### Scenario: Product beyond the first 100 is found

- **WHEN** the kiosk has more than 100 active products and the cashier types
  a term matching only a product alphabetically past the 100th
- **THEN** that product appears among the search results

#### Scenario: Search does not fire on every keystroke

- **WHEN** the cashier is actively typing in the search field
- **THEN** no request is sent until typing pauses

#### Scenario: Empty search term sends no request

- **WHEN** the search field is empty
- **THEN** no search request is sent and no results are shown

#### Scenario: A stale response is discarded

- **WHEN** the cashier changes the search term again before a request for
  the previous term has resolved, and that earlier request later resolves
- **THEN** its results are not applied and the results shown correspond
  only to the current search term

#### Scenario: Inactive products are excluded

- **WHEN** the search term matches both an active and an inactive product
- **THEN** only the active product appears in the results

#### Scenario: Results respect the existing eight-result cap

- **WHEN** more than eight active products match the current search term
- **THEN** at most eight results are shown, exactly as before this change

#### Scenario: Selecting a result behaves exactly as before

- **WHEN** the cashier selects a search result with the keyboard or the
  pointer
- **THEN** the product is added to the cart via the same path used today,
  the search term clears, and keyboard focus returns to the scan input for
  non-`pesable` products, unchanged from current behavior

#### Scenario: Loading covers the in-flight request for the current term

- **WHEN** a search request for the cashier's current term has not yet
  resolved
- **THEN** the "Buscando…" status message is shown in place of results

#### Scenario: No matches for the current term

- **WHEN** a search request for the current term resolves with zero results
- **THEN** the message `Ningún producto activo coincide con "<término>".` is
  shown, using the trimmed current search term

#### Scenario: Search request failure is shown like other entry errors

- **WHEN** a search request fails
- **THEN** the backend's error message is shown in the same entry-status
  region used for other entry errors today, at the same priority (below an
  unknown-barcode, inactive-product, or stock-limit message; above the
  search status message)

#### Scenario: Barcode scanning is unaffected

- **WHEN** a barcode is scanned, regardless of how many active products the
  kiosk has or where the resolved product would sort alphabetically
- **THEN** the scan resolves via `GET /api/v1/products/barcode/{barcode}` and
  behaves exactly as it did before this change, independent of the manual
  search's data source

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

