## MODIFIED Requirements

### Requirement: Weighable products are checked against stock

The POS SHALL query and cap a `pesable` product's cart line against `GET /api/v1/inventory/stock/{product_id}`, using the same rule already applied to a `unitario` product: when the product has an initialized stock record, adding or increasing its weight beyond the available quantity SHALL be blocked with an inline message naming the product and the available quantity in kilograms; when the product has no stock record yet (unknown availability), adding or increasing its weight SHALL never be blocked by this client-side check, exactly as an unknown-stock `unitario` product is not blocked today.

#### Scenario: Weighable product with initialized stock is checked
- **WHEN** a `pesable` product with an initialized stock record is added to the cart, or its weight is increased
- **THEN** a request to `GET /api/v1/inventory/stock/{product_id}` is issued (once per product, cached for the rest of the session like it already is for `unitario`) and the requested weight is compared against the available quantity

#### Scenario: Weighable product exceeding available stock is blocked
- **WHEN** the weight entered or the resulting weight after an increase exceeds the available stock for that product
- **THEN** the cart line is not added or updated, and an inline message states the product name and the available quantity in kilograms (for example, `"Sólo hay 2.300 kg disponibles de "Jamón cocido"."`), following the same message pattern already used for a `unitario` product without enough stock

#### Scenario: Weighable product without a stock record is never blocked
- **WHEN** a `pesable` product has no stock record yet (the stock lookup resolves to "unknown", exactly as it does for a `unitario` product without one)
- **THEN** adding it to the cart or increasing its weight is never blocked by this client-side check, and the backend remains the authority that rejects an over-sell at confirmation time regardless

#### Scenario: Mixed cart checks stock for both line types
- **WHEN** a cart contains both `unitario` and `pesable` lines
- **THEN** stock is checked and enforced for both, using quantity for `unitario` lines and weight (kilograms) for `pesable` lines
