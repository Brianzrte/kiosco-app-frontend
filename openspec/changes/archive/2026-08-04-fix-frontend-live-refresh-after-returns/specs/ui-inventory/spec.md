## MODIFIED Requirements

### Requirement: Stock view per product

The frontend SHALL show current stock from the inventory endpoints, displaying quantity, minimum quantity, and last update. For a `unitario` product, quantity and minimum quantity SHALL be whole numbers, exactly as today. For a `pesable` product, quantity and minimum quantity SHALL be decimal numbers expressed in kilograms with up to 3 decimals, and SHALL be displayed with that precision rather than rounded or truncated to a whole number. Low-stock status SHALL be taken from the backend and SHALL NOT be derived in the client. The list SHALL visually distinguish three states — not initialised, initialised at zero, and below minimum — using text, never colour alone; for a `pesable` product, "initialised at zero" means a quantity of exactly `0.000`. Pagination SHALL use the backend's `page` parameter.

The screen SHALL support opening directly to a specific product's "Gestionar stock" dialog via a `product_id` query parameter in its URL, resolving that product with `GET /api/v1/products/{id}` independently of whichever page of the paginated, filtered list is currently loaded. When that product resolves, its "Gestionar stock" dialog SHALL open immediately — in initialization mode if it has no stock record, or in adjustment mode if it does — with the same content it would show if opened by clicking its row. When `product_id` is absent, the screen's behavior SHALL be unchanged from before this requirement was extended.

While the inventory screen stays mounted and visible, the stock list SHALL re-fetch its current query (same search term, category, low-stock filter, and page) on a fixed interval so a stock change registered elsewhere — including a return's automatic reintegration, or any other movement — becomes reflected without the user navigating away or reloading. A background refresh that fails SHALL be ignored, keeping the previously loaded rows on screen. If a "Gestionar stock" dialog for a product is open when a refresh tick occurs, the refresh SHALL update the underlying list without closing that dialog or altering its in-progress input.

#### Scenario: Stock displayed
- **WHEN** the inventory screen loads a product's stock
- **THEN** quantity, minimum quantity, and updated-at are shown

#### Scenario: Weighable product's stock is shown in kilograms with decimals
- **WHEN** the inventory screen loads a `pesable` product's stock
- **THEN** quantity and minimum quantity are shown as kilograms with up to 3 decimals, not rounded to a whole number

#### Scenario: Low stock highlighted
- **WHEN** a product is reported low on stock by the backend
- **THEN** it is highlighted with the Warning color and an accompanying text label

#### Scenario: Uninitialised is distinct from zero
- **WHEN** a product has no stock record and another has quantity zero
- **THEN** the first reads as not initialised and offers initialisation, and the second reads as zero and offers adjustment

#### Scenario: A weighable product at exactly zero kilograms reads as zero, not uninitialised
- **WHEN** a `pesable` product has an initialized stock record with quantity `0.000`
- **THEN** it reads as zero and offers adjustment, exactly like a `unitario` product with quantity `0`

#### Scenario: Threshold rule is never reimplemented
- **WHEN** the stock list renders
- **THEN** no client-side comparison between quantity and minimum quantity determines what is shown as low stock

#### Scenario: Pagination advances
- **WHEN** the user moves to the next page of the stock list
- **THEN** the request sends the `page` parameter and different rows are returned

#### Scenario: Opening directly to a product via URL
- **WHEN** the inventory screen loads with `?product_id={id}` for an existing
  product
- **THEN** that product's "Gestionar stock" dialog opens immediately, without
  requiring the product to appear on the currently loaded page of the list

#### Scenario: Deep-linked product not found
- **WHEN** `?product_id={id}` does not resolve to an existing product, or the
  lookup fails
- **THEN** no dialog opens, a short non-blocking message explains it, and the
  underlying list remains usable

#### Scenario: No query parameter behaves as before
- **WHEN** the inventory screen loads without a `product_id` parameter
- **THEN** its behavior is exactly as it was before this requirement was
  extended

#### Scenario: A return reflects in the stock list without navigating
- **WHEN** the inventory screen stays open and a return registered by someone else, from another device, reintegrates stock for a listed product
- **THEN** within one refresh interval the affected row's quantity updates to the backend's current value, without the user reloading or navigating away

#### Scenario: Background refresh does not close an open stock dialog
- **WHEN** a "Gestionar stock" dialog is open for a product and a periodic refresh tick of the underlying list occurs
- **THEN** the dialog stays open with its in-progress input untouched; only the background list data updates

#### Scenario: Background refresh failure keeps the last good rows
- **WHEN** a periodic refresh of the stock list fails while rows from a previous successful load are already shown
- **THEN** the previously loaded rows stay on screen, no error replaces them, and the next interval tick retries

### Requirement: Low-stock view

The frontend SHALL offer a low-stock filter on the stock list, driven by the backend's `low_stock_only` parameter. The frontend SHALL NOT compute low-stock status itself under any circumstance. Products without initialised stock SHALL never appear as low stock. When no thresholds are configured, the empty state SHALL explain that no thresholds exist and lead to configuring them, rather than reporting that no products are low. The set of product ids marked low stock SHALL be refreshed on the same fixed interval as the stock list itself while the screen stays mounted and visible, so a product crossing its threshold because of a change registered elsewhere is marked without navigating away.

#### Scenario: Filter delegates to the backend
- **WHEN** the low-stock filter is active
- **THEN** the list is filtered by the backend's `low_stock_only` parameter and no threshold comparison is evaluated in the client

#### Scenario: Uninitialised products never appear
- **WHEN** the low-stock filter is active and some products have no stock record
- **THEN** none of those products are listed

#### Scenario: Empty low-stock list when nothing is configured
- **WHEN** the low-stock filter returns nothing and no product has a threshold above zero
- **THEN** the empty state explains that no thresholds are configured and offers a path to configure them

#### Scenario: Low-stock marking updates without navigating
- **WHEN** the screen stays open and a product's stock crosses its minimum threshold because of a change registered elsewhere
- **THEN** within one refresh interval that product's low-stock marking in the list reflects the new state
