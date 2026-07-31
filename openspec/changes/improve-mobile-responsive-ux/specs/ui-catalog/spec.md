## MODIFIED Requirements

### Requirement: Product list
The frontend SHALL show the product list from `GET /api/v1/products` with name, SKU, barcode, category, price, and active status, plus client-side search by name/SKU/barcode and filters by category and active state.

Below the `md` breakpoint, the name/SKU/barcode search input SHALL remain directly visible; the category and active-state filters SHALL collapse into the shared collapsible filter group. This does not change the existing mobile card fallback already used by this list.

#### Scenario: List renders products
- **WHEN** the product list loads
- **THEN** each product shows name, SKU, barcode (or a dash when null), category, price, and an active/inactive badge

#### Scenario: Filter by category
- **WHEN** a category filter is applied
- **THEN** only products of that category are listed

#### Scenario: Search stays visible on mobile
- **WHEN** the product list is viewed below the `md` breakpoint
- **THEN** the search input remains visible without expanding any collapsed group

#### Scenario: Secondary filters are collapsed by default on mobile
- **WHEN** the product list is viewed below the `md` breakpoint
- **THEN** the category and active-state filters are reachable inside a collapsed group, not expanded by default
