## MODIFIED Requirements

### Requirement: Create product
The frontend SHALL provide a creation form with name, SKU, optional barcode, category (from `GET /api/v1/categories`), an explicit product type (`unitario` or `pesable`, with no blank or nullable default), cost, and — depending on the chosen type — either `price` (`unitario`) or `price_per_kg` (`pesable`), submitting to `POST /api/v1/products`. Money fields (`price`, `cost`, `price_per_kg`) SHALL be entered and sent as decimal strings. Choosing `unitario` SHALL leave the rest of the form behaving exactly as before; choosing `pesable` SHALL replace `price` with `price_per_kg`. When a category is selected, the frontend SHALL request a SKU proposal from `GET /api/v1/products/sku-suggestion?category_id={id}` through the shared API client and SHALL display a returned value in the editable SKU field only when the user has not manually edited that field. Automatic SKUs SHALL use the backend-defined format and the frontend SHALL not generate or reserve SKUs.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted
- **THEN** the product is created, a success toast appears, the list shows the new product as active, and the SKU returned by the backend is shown as the effective SKU

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
- **THEN** the form behaves exactly as it did before this requirement changed: name, SKU, barcode, category, `price`, and `cost`, with no reference to weight or a per-kilogram price

#### Scenario: Creating a weighable product asks for a per-kilogram price
- **WHEN** `pesable` is chosen as the product type
- **THEN** the form shows `price_per_kg` instead of `price`, as a required decimal string, alongside the rest of the fields

#### Scenario: Product type has no default
- **WHEN** a new product's type has not been explicitly chosen
- **THEN** the form does not allow submission until either `unitario` or `pesable` is selected

#### Scenario: Missing per-kilogram price is a validation error
- **WHEN** the backend rejects a `pesable` product for a missing or invalid `price_per_kg`
- **THEN** the form shows the backend message beneath that field and preserves every other entered value

#### Scenario: Automatic SKU format
- **WHEN** the backend returns an automatic SKU proposal or the created product
- **THEN** the displayed automatic SKU matches `SKU-` plus a three-digit number from `001` through `999`, with no category text in the value
