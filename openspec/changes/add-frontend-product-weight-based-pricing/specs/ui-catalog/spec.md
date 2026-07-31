## MODIFIED Requirements

### Requirement: Product list
The frontend SHALL show the product list from `GET /api/v1/products` with name, SKU, barcode, category, price, and active status, plus client-side search by name/SKU/barcode and filters by category and active state. For a product whose `unit_type` is `pesable`, the price column SHALL show `price_per_kg` formatted as money with a "/kg" suffix, instead of `price`. For a product whose `unit_type` is `unitario` (including a product where the backend omits `unit_type`, which SHALL be treated as `unitario`), the price column SHALL be unchanged from today.

#### Scenario: List renders products
- **WHEN** the product list loads
- **THEN** each product shows name, SKU, barcode (or a dash when null), category, price, and an active/inactive badge

#### Scenario: Filter by category
- **WHEN** a category filter is applied
- **THEN** only products of that category are listed

#### Scenario: Weighable product shows its per-kilogram price
- **WHEN** the product list includes a product with `unit_type` `pesable`
- **THEN** its price column shows `price_per_kg` as money with a "/kg" suffix, not `price`

#### Scenario: Unit-based product is unaffected
- **WHEN** the product list includes a product with `unit_type` `unitario`, or a product whose response omits `unit_type` entirely
- **THEN** its price column shows `price` exactly as it does today

### Requirement: Create product
The frontend SHALL provide a creation form with name, SKU, optional barcode, category (from `GET /api/v1/categories`), an explicit product type (`unitario` or `pesable`, with no blank or nullable default), cost, and — depending on the chosen type — either `price` (`unitario`) or `price_per_kg` (`pesable`), submitting to `POST /api/v1/products`. Money fields (`price`, `cost`, `price_per_kg`) SHALL be entered and sent as decimal strings. Choosing `unitario` SHALL leave the rest of the form (SKU, barcode, category, price, cost) behaving exactly as before this requirement changed. Choosing `pesable` SHALL replace the `price` field with `price_per_kg`; `cost` SHALL remain present for both types.

#### Scenario: Successful creation
- **WHEN** a valid product is submitted
- **THEN** the product is created, a success toast appears, and the list shows the new product as active

#### Scenario: Duplicate SKU or barcode
- **WHEN** the backend rejects the product for a uniqueness violation
- **THEN** the form shows the backend message and preserves the entered values

#### Scenario: Creating a unit-based product is unchanged
- **WHEN** `unitario` is chosen as the product type
- **THEN** the form behaves exactly as it did before this requirement changed: name, SKU, barcode, category, `price`, and `cost`, with no reference to weight or a per-kilogram price

#### Scenario: Creating a weighable product asks for a per-kilogram price
- **WHEN** `pesable` is chosen as the product type
- **THEN** the form shows `price_per_kg` instead of `price`, as a required decimal string, alongside the rest of the fields (name, SKU, barcode, category, cost)

#### Scenario: Product type has no default
- **WHEN** a new product's type has not been explicitly chosen
- **THEN** the form does not allow submission until either `unitario` or `pesable` is selected

#### Scenario: Missing per-kilogram price is a validation error
- **WHEN** the backend rejects a `pesable` product for a missing or invalid `price_per_kg`
- **THEN** the form shows the backend message beneath that field and preserves every other entered value, the same way it does for any other field-level validation error today

### Requirement: Edit product
The frontend SHALL allow editing an existing product via `PUT /api/v1/products/{id}` from a detail view at `/products/[id]`, including its product type and, when applicable, `price_per_kg` instead of `price`.

#### Scenario: Successful edit
- **WHEN** valid changes are saved
- **THEN** the product is updated and the user sees a success toast

#### Scenario: Existing product without a type defaults to unit-based
- **WHEN** an existing product's response omits `unit_type` (a backend not yet migrated)
- **THEN** the edit form treats it as `unitario`, not as an empty or error state
