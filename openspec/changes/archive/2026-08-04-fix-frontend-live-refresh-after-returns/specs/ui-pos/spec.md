## MODIFIED Requirements

### Requirement: Weighable products are checked against stock

The POS SHALL query and cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`, using the same rule already applied to a `unitario` product: when the product has an initialized stock record, adding or increasing its weight beyond the available quantity SHALL be blocked with an inline message naming the product and the available quantity in kilograms; when the product has no stock record yet (unknown availability), adding or increasing its weight SHALL never be blocked by this client-side check, exactly as an unknown-stock `unitario` product is not blocked today. Once looked up, a product's available stock SHALL be kept in a per-product cache for the rest of the POS session, refreshed periodically as described in "Cached product stock refreshes periodically" rather than fixed at its first-looked-up value.

#### Scenario: Weighable product with initialized stock is checked
- **WHEN** a `pesable` product with an initialized stock record is added to the cart, or its weight is increased
- **THEN** a request to `GET /api/v1/inventory/stock/{product_id}` is issued (once per product on first lookup, cached and periodically refreshed for the rest of the session like it already is for `unitario`) and the requested weight is compared against the available quantity

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

## ADDED Requirements

### Requirement: Cached product stock refreshes periodically

While the POS screen is mounted and visible (`document.visibilityState === "visible"`), every product currently present in the per-product stock cache — whether `unitario` or `pesable`, and regardless of when it was first looked up in the current session — SHALL be re-requested from `GET /api/v1/inventory/stock/{product_id}` on a fixed interval and its cached value updated in place, so that stock reinstated by a return (or reduced by any other change) registered from another device becomes effective for this cache without the cashier navigating away or reloading. A product never looked up in the current session SHALL NOT be proactively fetched by this refresh; it continues to be looked up lazily on first scan/add, as today. The refresh SHALL NOT remove, reorder, or otherwise alter any line already present in the cart; it only updates the number used to validate a subsequent add or quantity/weight increase for that product. A failed periodic refresh request SHALL be ignored: it SHALL NOT show an error, SHALL NOT clear or replace the previously cached value, and the next interval tick SHALL retry.

#### Scenario: Already-cached product picks up a return from another device
- **WHEN** a product was already looked up earlier in the current POS session, its cached stock is exhausted or low, and a return registered from another device restores its stock in the backend
- **THEN** within one refresh interval the cached value updates, and the next attempt to add or increase that product's line in the cart is validated against the restored quantity, without the cashier reloading the page

#### Scenario: Cart is untouched by a background stock refresh
- **WHEN** a product already present as a cart line has its cached stock refreshed in the background
- **THEN** the existing cart line is not removed, reordered, or blocked by the refresh itself; the sale can still be confirmed and the backend remains the final authority at confirmation

#### Scenario: A product never looked up is not proactively polled
- **WHEN** the periodic refresh tick runs
- **THEN** only `productId`s already present in the stock cache are re-requested; a product not yet scanned or searched in this session is not fetched until it is looked up for the first time, exactly as today

#### Scenario: Background refresh failure is silent
- **WHEN** a periodic stock-refresh request fails (network error, backend error, timeout)
- **THEN** no error is shown, the previously cached value for that product is kept as-is, and the next interval tick retries

#### Scenario: Refresh pauses while the tab is hidden
- **WHEN** the POS tab is not the visible tab (`document.visibilityState !== "visible"`)
- **THEN** the periodic refresh does not fire a tick until the tab becomes visible again
