## ADDED Requirements

### Requirement: A draft sale in progress can be discarded
Once a sale has been created on the backend (a `sale.id` exists for the current cart, from a prior `POST /api/v1/sales` in this or a resumed session) and the cashier no longer wants to complete it, the POS SHALL offer a visible action to discard it. Activating it SHALL open a confirmation dialog before discarding. Confirming SHALL request the backend to discard that sale, clear the local cart, selected payment method, and any split-payment or cash-tendered state, and return focus to the scan input. Canceling SHALL leave the cart and the sale on the backend unchanged and return focus to the action that opened the dialog. If the backend rejects the discard (for example, the sale was already confirmed by another session), the frontend SHALL show the backend message and SHALL NOT assume the local cart was cleared.

#### Scenario: Discarding a draft requires confirmation
- **WHEN** the cashier activates "Descartar venta" with a sale already created on the backend
- **THEN** a confirmation dialog opens before anything is discarded

#### Scenario: Confirming discards the backend sale and clears the cart
- **WHEN** the cashier confirms the discard dialog
- **THEN** the backend sale is discarded, the local cart and payment state are cleared, and focus returns to the scan input

#### Scenario: Canceling leaves everything untouched
- **WHEN** the cashier cancels the discard dialog by any dismissal method
- **THEN** the cart and the backend sale are both unchanged, and focus returns to the action that opened the dialog

#### Scenario: A rejected discard does not clear the local cart
- **WHEN** the backend rejects a discard request
- **THEN** the backend message is shown and the local cart, payment method, and sale reference are all preserved as they were before the attempt

### Requirement: Product stock is available without a separate request when provided
When a barcode or search result resolves to a product whose response already includes its available stock, the POS SHALL use that value directly for the stock cap on a `unitario` line and SHALL NOT issue a separate `GET /api/v1/inventory/stock/{product_id}` request for that product. When the resolved product's response does not include stock, the POS SHALL fall back to its existing behavior of requesting it separately. This SHALL NOT change the stock cap's behavior once a value is known (the same cap, the same message naming the product and the available quantity, applied the same way whether the value arrived embedded in the product response or from the separate endpoint), and SHALL NOT apply to `pesable` lines, which are never checked against stock.

#### Scenario: Stock embedded in the product response skips the separate request
- **WHEN** a barcode or search result resolves to a `unitario` product whose response includes a stock value
- **THEN** no request to `GET /api/v1/inventory/stock/{product_id}` is issued for that product, and the stock cap uses the embedded value

#### Scenario: Missing embedded stock falls back to the separate request
- **WHEN** a resolved product's response does not include a stock value
- **THEN** the POS requests it separately, exactly as it does today

#### Scenario: Weighable products remain unaffected
- **WHEN** a `pesable` product is resolved, regardless of whether its response includes a stock value
- **THEN** no stock check of any kind is applied to it, consistent with weighable products never being checked against stock
