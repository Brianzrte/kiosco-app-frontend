## MODIFIED Requirements

### Requirement: Create product

The frontend SHALL provide a creation form with name, SKU, optional barcode, category (from `GET /api/v1/categories`), an explicit product type (`unitario` or `pesable`, with no blank or nullable default), cost, and — depending on the chosen type — either `price` (`unitario`) or `price_per_kg` (`pesable`), submitting to `POST /api/v1/products`. Money fields (`price`, `cost`, `price_per_kg`) SHALL be entered and sent as decimal strings. Choosing `unitario` SHALL leave the rest of the form behaving exactly as before; choosing `pesable` SHALL replace `price` with `price_per_kg`. When a category is selected, the frontend SHALL request a SKU proposal from `GET /api/v1/products/sku-suggestion?category_id={id}` through the shared API client and SHALL display a returned value in the editable SKU field only when the user has not manually edited that field. Automatic SKUs SHALL use the backend-defined format and the frontend SHALL not generate or reserve SKUs.

The form SHALL also offer an editable "% de ganancia" (profit margin percentage) field, defaulting to a configurable value (35 unless overridden by an environment variable), that exists only in client-side form state and SHALL never be included in the `POST /api/v1/products` payload. While the entered cost is a positive number, editing the cost SHALL recompute the active sale price field (`price` for `unitario`, `price_per_kg` for `pesable`) as `cost × (1 + percent / 100)`, rounded to the nearest cent. Editing the percentage field SHALL recompute the sale price the same way, using the current cost. Whenever a calculation needs a percentage value and the percentage field is empty or not a valid number, the configured default SHALL be used as the effective percentage instead of skipping the calculation.

Editing the sale price field directly SHALL behave differently depending on whether cost already holds a positive value:
- **If cost is already a positive number**, editing the sale price SHALL recompute the displayed percentage as `((price − cost) / cost) × 100`, leaving cost untouched — cost is never overwritten from a manually edited sale price once it holds a real value.
- **If cost is empty or zero**, editing the sale price SHALL wait until the value contains at least three digits and the user has paused typing for 500 ms; it SHALL then compute cost backward as `cost = price / (1 + percent / 100)`, rounded to the nearest cent, using the effective percentage (the entered value, or the configured default when the percentage field is empty or invalid), and update the cost field with that value. Each new keystroke SHALL cancel the pending calculation. From that point on, cost holds a positive value and further sale price edits follow the first case (cost stays untouched, only the percentage recomputes).

A non-editable margin text near the price field SHALL show the resulting margin amount and percentage (for example, `Margen: $ 375,00 (35%)`) whenever cost and sale price are both valid numbers; while cost is empty, zero, or not a valid number, and the sale price has not yet been edited to derive one, no recompute of the sale price SHALL happen and the margin text SHALL be omitted rather than showing a misleading value.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted
- **THEN** the product is created, a success toast appears, the list shows the new product as active, and the SKU returned by the backend is shown as the effective SKU

#### Scenario: "Inicializar stock" opens the new product's stock dialog
- **WHEN** the user activates "Inicializar stock" on the success popup
- **THEN** the frontend navigates to the inventory screen with the created product preselected and its "Gestionar stock" dialog already open in initialization mode

#### Scenario: "Ahora no" returns to a blank creation form
- **WHEN** the user activates "Ahora no", presses `Escape`, or dismisses the popup by any other means
- **THEN** the popup closes and the user is on a blank product creation form, ready to enter another product

#### Scenario: Category selection requests a proposal
- **WHEN** the user selects a category
- **THEN** the frontend requests `GET /api/v1/products/sku-suggestion?category_id={id}` and displays a successful response such as `{ "sku": "SKU-123" }` in the editable SKU field

#### Scenario: Manual SKU remains authoritative in the form
- **WHEN** the user edits the SKU field manually and then selects another category or a delayed proposal response arrives
- **THEN** the manually entered SKU is preserved and is not overwritten

#### Scenario: Proposal request fails
- **WHEN** the SKU proposal request fails
- **THEN** the existing form values are preserved, an explanatory error is shown, and the user can enter a SKU manually and continue

#### Scenario: Duplicate SKU or barcode
- **WHEN** the backend rejects the product for a uniqueness violation, including `409`
- **THEN** the backend message is shown, every entered form value is preserved, and the SKU remains editable for a retry

#### Scenario: Creating a unit-based product is unchanged
- **WHEN** `unitario` is chosen as the product type
- **THEN** the form behaves exactly as it did before this requirement changed: name, SKU, barcode, category, `price`, and `cost`, with no reference to weight or a per-kilogram price, except for the added profit percentage field and margin text described in this requirement

#### Scenario: Creating a weighable product asks for a per-kilogram price
- **WHEN** `pesable` is chosen as the product type
- **THEN** the form shows `price_per_kg` instead of `price`, as a required decimal string, alongside the rest of the fields, and the profit percentage field recomputes `price_per_kg` the same way it recomputes `price` for a unit-based product

#### Scenario: Product type has no default
- **WHEN** a new product's type has not been explicitly chosen
- **THEN** the form does not allow submission until either `unitario` or `pesable` is selected

#### Scenario: Missing per-kilogram price is a validation error
- **WHEN** the backend rejects a `pesable` product for a missing or invalid `price_per_kg`
- **THEN** the form shows the backend message beneath that field and preserves every other entered value

#### Scenario: Automatic SKU format
- **WHEN** the backend returns an automatic SKU proposal or the created product
- **THEN** the displayed automatic SKU matches `SKU-` plus a three-digit number from `001` through `999`, with no category text in the value

#### Scenario: Barcode field is first and initially focused
- **WHEN** the product creation form loads
- **THEN** the barcode field is the first field in the form and holds initial keyboard focus, ahead of name and every other field

#### Scenario: Scanning an unused barcode has no visible effect
- **WHEN** `Enter` is confirmed in the barcode field and `GET /api/v1/products/barcode/{barcode}` finds no match
- **THEN** no warning is shown, the form is not submitted, and the user can continue completing the rest of the fields normally

#### Scenario: Scanning a barcode already in use blocks submission
- **WHEN** `Enter` is confirmed in the barcode field and `GET /api/v1/products/barcode/{barcode}` finds an existing product, active or inactive
- **THEN** an inline warning names that product and its SKU, links to its detail view, and the form's submit action is disabled

#### Scenario: Editing the barcode clears a detected duplicate
- **WHEN** the barcode field's value changes after a duplicate was detected
- **THEN** the warning and the submission block are cleared immediately, with no new check run until the next `Enter`

#### Scenario: Duplicate check failure does not block creation
- **WHEN** the barcode duplicate check itself fails (network or server error, not a `404`)
- **THEN** no warning is shown, submission is not blocked by this check, and the backend's own uniqueness rejection at submit time remains the final safeguard

#### Scenario: Duplicate check does not run on edit
- **WHEN** an existing product is opened for editing
- **THEN** the barcode field keeps its current position and behavior, with no duplicate lookup triggered by `Enter` and no field reordering

#### Scenario: Cost drives an automatic sale price
- **WHEN** the user enters a positive numeric cost and the percentage field holds a valid number
- **THEN** the active sale price field (`price` or `price_per_kg`, depending on the chosen type) is set to `cost × (1 + percent / 100)`, rounded to the nearest cent, and the margin text shows the resulting amount and percentage

#### Scenario: Editing the percentage recalculates the sale price
- **WHEN** the user changes the "% de ganancia" field while cost is a positive number
- **THEN** the active sale price field is recomputed from the current cost and the new percentage, and the margin text updates to match

#### Scenario: Editing the sale price by hand recalculates the percentage when cost is already known
- **WHEN** the user edits the sale price field directly while cost already holds a positive number
- **THEN** the "% de ganancia" field and the margin text are recomputed from the current cost and the new sale price as `((price − cost) / cost) × 100`, cost is left unchanged, instead of keeping the previously entered percentage

#### Scenario: Editing the sale price by hand estimates cost backward when cost is unknown
- **WHEN** the user edits the sale price field directly while cost is empty or zero
- **THEN** after the value contains at least three digits and the user pauses typing for 500 ms, the cost field is set to `price / (1 + percent / 100)`, rounded to the nearest cent, using the effective percentage (the entered percentage, or the configured default if that field is empty or invalid), and the margin text shows the resulting amount and percentage

#### Scenario: An estimated cost becomes authoritative once set
- **WHEN** the sale price previously estimated a cost (as in the scenario above), and the user edits the sale price field again
- **THEN** the behavior follows "Editing the sale price by hand recalculates the percentage when cost is already known" — the estimated cost is treated exactly like a manually entered one and is not recalculated

#### Scenario: Empty or zero cost does not auto-calculate the sale price
- **WHEN** the cost field is empty, zero, or not a valid number
- **THEN** neither editing the cost nor the percentage triggers a recompute of the sale price, and the margin text is not shown, until either a positive cost is entered directly or a sale price edit derives one backward

#### Scenario: An empty or invalid percentage still has an effective value
- **WHEN** the "% de ganancia" field is empty or contains a non-numeric value, and a calculation depending on the percentage would otherwise run (cost driving sale price, or sale price driving cost)
- **THEN** the configured default percentage (35 unless overridden by an environment variable) is used as the effective percentage for that calculation, instead of skipping it

#### Scenario: Sale price below cost shows a negative margin
- **WHEN** the sale price is edited by hand to a value lower than the cost
- **THEN** the percentage field and the margin text show a negative value (for example, `Margen: -$ 50,00 (-5%)`) instead of being hidden or blocking submission

#### Scenario: Profit percentage is never sent to the backend
- **WHEN** the form is submitted, whether creating or editing a product
- **THEN** the request body sent to the backend contains only `sku`, `barcode`, `name`, `category_id`, `unit_type`, `price`, `price_per_kg`, and `cost`, with no profit percentage field

### Requirement: Edit product

The frontend SHALL allow editing an existing product via `PUT /api/v1/products/{id}` from a detail view at `/products/[id]`, including its product type and, when applicable, `price_per_kg` instead of `price`.

When opening the edit form for an existing product, the initial "% de ganancia" value SHALL be derived from that product's already-saved cost and sale price using `((price − cost) / cost) × 100`, rounded for display, instead of always resetting to the configured default. If the saved cost is zero or empty, the initial percentage SHALL default to the configured default, the same as in the creation form. From that point on, the same recompute behavior described in "Create product" (cost drives sale price, percentage drives sale price, sale price drives percentage when cost is already known, sale price drives cost backward when cost is empty or zero, and the non-editable margin text) SHALL apply while editing.

#### Scenario: Successful edit
- **WHEN** valid changes are saved
- **THEN** the product is updated and the user sees a success toast

#### Scenario: Existing product without a type defaults to unit-based
- **WHEN** an existing product's response omits `unit_type` (a backend not yet migrated)
- **THEN** the edit form treats it as `unitario`, not as an empty or error state

#### Scenario: Editing derives the initial percentage from saved cost and price
- **WHEN** the edit form opens for a product with a positive saved cost and a saved sale price
- **THEN** the "% de ganancia" field initially shows `((price − cost) / cost) × 100`, rounded for display, instead of the configured default

#### Scenario: Editing a product with zero or missing saved cost defaults the percentage
- **WHEN** the edit form opens for a product whose saved cost is zero or empty
- **THEN** the "% de ganancia" field initially shows the configured default, the same default used when creating a product

#### Scenario: Editing the sale price of an existing product with no saved cost estimates one
- **WHEN** the edit form opens for a product whose saved cost is zero or empty, and the user edits the sale price field
- **THEN** the cost field is set to `price / (1 + percent / 100)` using the effective percentage, exactly as in the creation form's "Editing the sale price by hand estimates cost backward when cost is unknown" scenario
